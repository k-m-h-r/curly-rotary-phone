// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAeNFQQHh42U7cRAs5wul7yGtu3Rw8DWW8",
  authDomain: "test-29072.firebaseapp.com",
  databaseURL: "https://test-29072-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-29072",
  storageBucket: "test-29072.firebasestorage.app",
  messagingSenderId: "862519320556",
  appId: "1:862519320556:web:8ff80b79b3a180f6486ac9",
  measurementId: "G-TKBZHBD84F"
};

// Firebase初期化
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

class NetworkManager {
  constructor() {
    this.db = firebase.database();
    this.myId = "p_" + Math.random().toString(36).substring(2, 10);
    this.myName = "";
    this.isHost = false;
    this.roomCode = "";
    this.roomRef = null;
    this.players = [];

    // リスナー・キュー管理用（メモリリーク＆重複防止）
    this.activeListeners = [];
    this.broadcastRefs = [];
    this.privateRefsMap = new Map(); // targetId -> [DatabaseReference]
    this.seenKeys = new Set();
    this.currentSessionId = 0;
    this.seqCounter = 0;

    // アプリ側で登録するコールバック
    this.onPlayersUpdated = () => {};
    this.onChatReceived = () => {};
    this.onGameStart = () => {};
    this.onGameData = () => {};
    this.onGameAction = () => {};
    this.onReturnToRoom = () => {};
  }

  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  nextSessionId() {
    this.seqCounter++;
    return Date.now() * 1000 + (this.seqCounter % 1000);
  }

  // Firebaseリスナーを安全に登録（あとで一括解除できるように記録）
  addListener(ref, eventType, callback) {
    ref.on(eventType, callback);
    this.activeListeners.push({ ref, eventType, callback });
  }

  // 登録済みリスナーとキャッシュをすべて解放
  cleanupListeners() {
    this.activeListeners.forEach(({ ref, eventType, callback }) => {
      ref.off(eventType, callback);
    });
    this.activeListeners = [];
    this.broadcastRefs = [];
    this.privateRefsMap.clear();
    this.seenKeys.clear();
  }

  // 重複受信チェック（メモリ肥大化防止のため上限200件でローテーション）
  isDuplicateKey(prefix, key) {
    if (!key) return false;
    const fullKey = `${prefix}:${key}`;
    if (this.seenKeys.has(fullKey)) return true;
    this.seenKeys.add(fullKey);
    if (this.seenKeys.size > 200) {
      const oldest = this.seenKeys.values().next().value;
      this.seenKeys.delete(oldest);
    }
    return false;
  }

  // ホストとして部屋を作成
  async createRoom(playerName) {
    this.cleanupListeners();
    this.myName = playerName;
    this.isHost = true;
    this.currentSessionId = this.nextSessionId();

    let code = this.generateCode();
    for (let i = 0; i < 10; i++) {
      const snap = await this.db.ref(`rooms/${code}`).once("value");
      if (!snap.exists()) break;
      code = this.generateCode();
    }

    this.roomCode = code;
    this.roomRef = this.db.ref(`rooms/${code}`);

    await this.roomRef.set({
      hostId: this.myId,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      state: { screen: "room", gameId: null, sessionId: this.currentSessionId }
    });

    await this.roomRef.child(`players/${this.myId}`).set({
      id: this.myId,
      name: this.myName,
      isHost: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    this.roomRef.onDisconnect().remove();

    this.attachRoomListeners();
    this.broadcastChat("システム", `${this.myName} が部屋を作成しました`, true);
    return this.roomCode;
  }

  // ゲストとして部屋に参加
  async joinRoom(playerName, code) {
    this.cleanupListeners();
    this.myName = playerName;
    this.isHost = false;
    this.roomCode = code;
    this.roomRef = this.db.ref(`rooms/${code}`);

    const snap = await this.roomRef.once("value");
    if (!snap.exists()) {
      throw new Error("部屋が見つかりません");
    }

    const stateVal = snap.child("state").val();
    this.currentSessionId = (stateVal && stateVal.sessionId) ? stateVal.sessionId : 0;

    const myPlayerRef = this.roomRef.child(`players/${this.myId}`);
    await myPlayerRef.set({
      id: this.myId,
      name: this.myName,
      isHost: false,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    // 切断時に自分のプレイヤー情報と自分宛てキューを自動削除
    myPlayerRef.onDisconnect().remove();
    this.roomRef.child(`private/${this.myId}`).onDisconnect().remove();

    this.attachRoomListeners();
    this.broadcastChat("システム", `${this.myName} が入室しました`, true);
  }

  // 部屋の各種リアルタイム監視をセット
  attachRoomListeners() {
    // 1. プレイヤー一覧の同期
    this.addListener(this.roomRef.child("players"), "value", (snap) => {
      const val = snap.val();
      if (!val) {
        if (!this.isHost) {
          alert("ホストが部屋を解散しました");
          location.reload();
        }
        return;
      }
      this.players = Object.values(val).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      this.onPlayersUpdated(this.players);
    });

    // 2. ゲスト退出の検知（ホスト専用）
    if (this.isHost) {
      this.addListener(this.roomRef.child("players"), "child_removed", (snap) => {
        const left = snap.val();
        if (left && left.id !== this.myId) {
          // 退出したプレイヤーの残留キューも掃除
          this.roomRef.child(`private/${left.id}`).remove();
          this.privateRefsMap.delete(left.id);
          this.broadcastChat("システム", `${left.name} が退出しました`, true);
        }
      });
    }

    // 3. チャット受信（直近50件のみ監視してメモリ節約）
    this.addListener(this.roomRef.child("chat").limitToLast(50), "child_added", (snap) => {
      if (this.isDuplicateKey("chat", snap.key)) return;
      const msg = snap.val();
      if (msg) {
        this.onChatReceived(msg.sender, msg.text, msg.isSystem);
      }
    });

    // 4. 画面遷移の同期（ゲスト専用）
    if (!this.isHost) {
      this.addListener(this.roomRef.child("state"), "value", (snap) => {
        const state = snap.val();
        if (!state) return;

        // セッションが変わったら古いキー履歴をクリア
        if (state.sessionId && state.sessionId !== this.currentSessionId) {
          this.currentSessionId = state.sessionId;
          this.seenKeys.clear();
        }

        if (state.screen === "game" && state.gameId) {
          this.onGameStart(state.gameId);
        } else if (state.screen === "room") {
          this.onReturnToRoom();
        }
      });
    }

    // 5. 全員向けゲームデータの受信（ゲスト側のみFirebaseから受信、ホストはローカル即時処理済み）
    if (!this.isHost) {
      this.addListener(this.roomRef.child("broadcast").limitToLast(10), "child_added", (snap) => {
        if (this.isDuplicateKey("bc", snap.key)) return;
        const item = snap.val();
        if (!item || !item.data) return;

        // 前のゲームの遅延パケットを破棄
        if (item.sessionId && this.currentSessionId && item.sessionId < this.currentSessionId) {
          return;
        }
        this.onGameData(item.data);
      });
    }

    // 6. 自分宛ての秘密データ受信（ゲスト側のみFirebaseから受信）
    if (!this.isHost) {
      this.addListener(this.roomRef.child(`private/${this.myId}`), "child_added", (snap) => {
        if (this.isDuplicateKey("priv", snap.key)) {
          snap.ref.remove();
          return;
        }
        const item = snap.val();
        snap.ref.remove(); // 受け取ったら即削除

        if (!item || !item.data) return;
        if (item.sessionId && this.currentSessionId && item.sessionId < this.currentSessionId) {
          return;
        }
        this.onGameData(item.data);
      });
    }

    // 7. ホスト専用：プレイヤーからの操作（GAME_ACTION）受信
    if (this.isHost) {
      this.addListener(this.roomRef.child("actions"), "child_added", (snap) => {
        if (this.isDuplicateKey("act", snap.key)) {
          snap.ref.remove();
          return;
        }
        const item = snap.val();
        snap.ref.remove(); // 受け取ったら即削除

        if (!item || !item.action) return;
        if (item.sessionId && item.sessionId !== this.currentSessionId) {
          return; // 前のゲームでの操作ボタン連打を無視
        }
        this.onGameAction(item.playerId, item.action);
      });
    }
  }

  // 全員にパケット送信（ホスト専用）
  broadcast(packet) {
    if (!this.isHost || !this.roomRef) return;

    if (packet.type === "GAME_START") {
      this.currentSessionId = this.nextSessionId();
      this.seenKeys.clear();
      this.roomRef.child("state").set({
        screen: "game",
        gameId: packet.gameId,
        sessionId: this.currentSessionId
      });
      this.onGameStart(packet.gameId);
    } else if (packet.type === "GAME_DATA") {
      // ★ ホスト自身はネットワークを経由せず即時反映（ラグゼロ）
      this.onGameData(packet.data);

      // ゲストが1人以上いる場合のみFirebaseへ送信
      if (this.players.length > 1) {
        const ref = this.roomRef.child("broadcast").push({
          sessionId: this.currentSessionId,
          data: packet.data
        });
        // リングバッファ管理：最新10件を超えた古いノードを即削除
        this.broadcastRefs.push(ref);
        if (this.broadcastRefs.length > 10) {
          const oldRef = this.broadcastRefs.shift();
          oldRef.remove();
        }
      }
    } else if (packet.type === "RETURN_ROOM") {
      this.currentSessionId = this.nextSessionId();
      this.seenKeys.clear();
      this.roomRef.child("state").set({
        screen: "room",
        gameId: null,
        sessionId: this.currentSessionId
      });
      this.onReturnToRoom();
    }
  }

  // 特定の1人だけに秘密データを送信（ホスト専用）
  sendToPlayer(targetId, data) {
    if (!this.isHost || !this.roomRef) return;

    if (targetId === this.myId) {
      // ホスト自身へはローカルメモリで即時渡し
      this.onGameData(data);
      return;
    }

    const ref = this.roomRef.child(`private/${targetId}`).push({
      sessionId: this.currentSessionId,
      data
    });

    // ゲストが通信切断中でも未読キューが溜まらないよう上限10件で自動掃除
    if (!this.privateRefsMap.has(targetId)) {
      this.privateRefsMap.set(targetId, []);
    }
    const list = this.privateRefsMap.get(targetId);
    list.push(ref);
    if (list.length > 10) {
      const oldRef = list.shift();
      oldRef.remove();
    }
  }

  // プレイヤーの操作をホストへ送信（ホスト・ゲスト共通）
  sendAction(action) {
    if (!this.roomRef) return;
    if (this.isHost) {
      this.onGameAction(this.myId, action);
    } else {
      this.roomRef.child("actions").push({
        sessionId: this.currentSessionId,
        playerId: this.myId,
        action
      });
    }
  }

  // チャット送信
  sendChat(text) {
    this.broadcastChat(this.myName, text, false);
  }

  broadcastChat(sender, text, isSystem) {
    if (!this.roomRef) return;
    this.roomRef.child("chat").push({
      sender,
      text,
      isSystem,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
}
