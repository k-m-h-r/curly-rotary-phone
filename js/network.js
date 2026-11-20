// ★ここに自分のFirebaseプロジェクトの設定を貼り付ける
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

    // アプリ側で登録するコールバック（PeerJS版と完全互換）
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

  // ホストとして部屋を作成
  async createRoom(playerName) {
    this.myName = playerName;
    this.isHost = true;

    // 空いている4桁コードを探す
    let code = this.generateCode();
    for (let i = 0; i < 10; i++) {
      const snap = await this.db.ref(`rooms/${code}`).once("value");
      if (!snap.exists()) break;
      code = this.generateCode();
    }

    this.roomCode = code;
    this.roomRef = this.db.ref(`rooms/${code}`);

    // 部屋データを初期化
    await this.roomRef.set({
      hostId: this.myId,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      state: { screen: "room", gameId: null }
    });

    // 自分をプレイヤーリストに登録
    await this.roomRef.child(`players/${this.myId}`).set({
      id: this.myId,
      name: this.myName,
      isHost: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    // ホストがブラウザを閉じたら部屋ごと自動削除（ゴミデータ防止）
    this.roomRef.onDisconnect().remove();

    this.attachRoomListeners();
    this.broadcastChat("システム", `${this.myName} が部屋を作成しました`, true);
    return this.roomCode;
  }

  // ゲストとして部屋に参加
  async joinRoom(playerName, code) {
    this.myName = playerName;
    this.isHost = false;
    this.roomCode = code;
    this.roomRef = this.db.ref(`rooms/${code}`);

    // 部屋が存在するか確認
    const snap = await this.roomRef.once("value");
    if (!snap.exists()) {
      throw new Error("部屋が見つかりません");
    }

    const myPlayerRef = this.roomRef.child(`players/${this.myId}`);
    await myPlayerRef.set({
      id: this.myId,
      name: this.myName,
      isHost: false,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    // ゲストがブラウザを閉じたら自分のデータだけ自動削除
    myPlayerRef.onDisconnect().remove();

    this.attachRoomListeners();
    this.broadcastChat("システム", `${this.myName} が入室しました`, true);
  }

  // 部屋の各種リアルタイム監視をセット
  attachRoomListeners() {
    // 1. プレイヤー一覧の同期
    this.roomRef.child("players").on("value", (snap) => {
      const val = snap.val();
      if (!val) {
        // ホストが部屋を閉じた場合
        if (!this.isHost) {
          alert("ホストが部屋を解散しました");
          location.reload();
        }
        return;
      }
      // 参加順にソート
      this.players = Object.values(val).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      this.onPlayersUpdated(this.players);
    });

    // 2. ゲスト退出の検知（ホスト側でシステム通知）
    if (this.isHost) {
      this.roomRef.child("players").on("child_removed", (snap) => {
        const left = snap.val();
        if (left && left.id !== this.myId) {
          this.broadcastChat("システム", `${left.name} が退出しました`, true);
        }
      });
    }

    // 3. チャット受信
    this.roomRef.child("chat").on("child_added", (snap) => {
      const msg = snap.val();
      if (msg) {
        this.onChatReceived(msg.sender, msg.text, msg.isSystem);
      }
    });

    // 4. 画面遷移（ゲーム開始・待機室へ戻る）の同期（ゲスト側）
    if (!this.isHost) {
      this.roomRef.child("state").on("value", (snap) => {
        const state = snap.val();
        if (!state) return;
        if (state.screen === "game" && state.gameId) {
          this.onGameStart(state.gameId);
        } else if (state.screen === "room") {
          this.onReturnToRoom();
        }
      });
    }

    // 5. 全員向けゲームデータの受信（キュー方式で連打も取りこぼさない）
    this.roomRef.child("broadcast").on("child_added", (snap) => {
      const item = snap.val();
      if (item && item.data) {
        this.onGameData(item.data);
      }
      // ホストは配信済みキューを少し遅らせて掃除（容量節約）
      if (this.isHost) {
        setTimeout(() => snap.ref.remove(), 2000);
      }
    });

    // 6. 自分宛ての秘密データ受信（UNOの手札・人狼の役職など）
    this.roomRef.child(`private/${this.myId}`).on("child_added", (snap) => {
      const item = snap.val();
      if (item && item.data) {
        this.onGameData(item.data);
      }
      // 受け取ったら削除
      snap.ref.remove();
    });

    // 7. ホスト専用：プレイヤーからの操作（GAME_ACTION）受信
    if (this.isHost) {
      this.roomRef.child("actions").on("child_added", (snap) => {
        const item = snap.val();
        if (item) {
          this.onGameAction(item.playerId, item.action);
          // 処理し終わったら即削除
          snap.ref.remove();
        }
      });
    }
  }

  // 全員にパケット送信（ホスト専用）
  broadcast(packet) {
    if (!this.isHost || !this.roomRef) return;

    if (packet.type === "GAME_START") {
      // 古いゲームデータを掃除してから開始
      this.roomRef.child("broadcast").remove();
      this.roomRef.child("actions").remove();
      this.roomRef.child("state").set({ screen: "game", gameId: packet.gameId });
      this.onGameStart(packet.gameId);
    } else if (packet.type === "GAME_DATA") {
      this.roomRef.child("broadcast").push({ data: packet.data });
    } else if (packet.type === "RETURN_ROOM") {
      this.roomRef.child("state").set({ screen: "room", gameId: null });
      this.onReturnToRoom();
    }
  }

  // 特定の1人だけに秘密データを送信（ホスト専用）
  sendToPlayer(targetId, data) {
    if (!this.isHost || !this.roomRef) return;
    if (targetId === this.myId) {
      this.onGameData(data);
    } else {
      this.roomRef.child(`private/${targetId}`).push({ data });
    }
  }

  // プレイヤーの操作をホストへ送信（ホスト・ゲスト共通）
  sendAction(action) {
    if (!this.roomRef) return;
    if (this.isHost) {
      this.onGameAction(this.myId, action);
    } else {
      this.roomRef.child("actions").push({
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
