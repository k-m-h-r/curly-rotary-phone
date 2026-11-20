const net = new NetworkManager();
const GameRegistry = {}; // 追加されたゲームを格納するオブジェクト
let currentGame = null;

// ゲームプラグインを登録する関数（各ゲームファイルから呼ぶ）
function registerGame(gameDef) {
  GameRegistry[gameDef.id] = gameDef;
  updateGameSelectMenu();
}

function updateGameSelectMenu() {
  const select = document.getElementById("game-select");
  if (!select) return;
  select.innerHTML = "";
  Object.values(GameRegistry).forEach((game) => {
    const opt = document.createElement("option");
    opt.value = game.id;
    opt.textContent = `${game.name} (${game.minPlayers}〜${game.maxPlayers}人)`;
    select.appendChild(opt);
  });
  updateGameDescription();
}

function updateGameDescription() {
  const select = document.getElementById("game-select");
  const desc = document.getElementById("game-description");
  const game = GameRegistry[select.value];
  if (game && desc) {
    desc.textContent = game.description;
  }
}

// 画面切り替えヘルパー
function showScreen(screenId) {
  ["screen-lobby", "screen-room", "screen-game"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(screenId).classList.remove("hidden");
}

// 初期化イベント
document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("player-name");
  const codeInput = document.getElementById("room-code-input");
  const statusBadge = document.getElementById("connection-status");

  // 部屋作成
  document.getElementById("btn-create-room").addEventListener("click", async () => {
    const name = nameInput.value.trim() || "ホスト";
    try {
      const code = await net.createRoom(name);
      document.getElementById("display-room-code").textContent = code;
      document.getElementById("host-controls").classList.remove("hidden");
      document.getElementById("guest-waiting").classList.add("hidden");
      document.getElementById("btn-back-to-room").classList.remove("hidden");
      document.getElementById("chat-panel").classList.remove("hidden");
      statusBadge.textContent = "オンライン (ホスト)";
      statusBadge.classList.add("online");
      showScreen("screen-room");
    } catch (e) {
      alert("部屋の作成に失敗しました: " + e.message);
    }
  });

  // 部屋参加
  document.getElementById("btn-join-room").addEventListener("click", async () => {
    const name = nameInput.value.trim() || "ゲスト";
    const code = codeInput.value.trim();
    if (code.length !== 4) return alert("4桁の部屋コードを入力してください");

    try {
      await net.joinRoom(name, code);
      document.getElementById("display-room-code").textContent = code;
      document.getElementById("chat-panel").classList.remove("hidden");
      statusBadge.textContent = "オンライン (参加中)";
      statusBadge.classList.add("online");
      showScreen("screen-room");
    } catch (e) {
      alert("部屋が見つかりませんでした。コードを確認してください。");
    }
  });

  // コードコピー
  document.getElementById("btn-copy-code").addEventListener("click", () => {
    navigator.clipboard.writeText(net.roomCode);
    alert(`部屋コード「${net.roomCode}」をコピーしました`);
  });

  // ゲーム選択変更
  document.getElementById("game-select").addEventListener("change", updateGameDescription);

  // ゲーム開始（ホスト）
  document.getElementById("btn-start-game").addEventListener("click", () => {
    const gameId = document.getElementById("game-select").value;
    const game = GameRegistry[gameId];
    if (!game) return;
    if (net.players.length < game.minPlayers) {
      return alert(`このゲームは最低 ${game.minPlayers} 人必要です`);
    }
    net.broadcast({ type: "GAME_START", gameId });
  });

  // 待機室へ戻る（ホスト）
  document.getElementById("btn-back-to-room").addEventListener("click", () => {
    net.broadcast({ type: "RETURN_ROOM" });
  });

  // チャット送信
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (text) {
      net.sendChat(text);
      input.value = "";
    }
  });

  // ネットワークイベントの紐付け
  net.onPlayersUpdated = (players) => {
    document.getElementById("player-count").textContent = players.length;
    const list = document.getElementById("player-list");
    list.innerHTML = players.map(p =>
      `<li><span>${p.name}</span><span>${p.isHost ? "👑 ホスト" : ""}</span></li>`
    ).join("");
  };

  net.onChatReceived = (sender, text, isSystem) => {
    const box = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "chat-msg" + (isSystem ? " system" : "");
    div.textContent = isSystem ? `※ ${text}` : `${sender}: ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  };

  net.onGameStart = (gameId) => {
    currentGame = GameRegistry[gameId];
    if (!currentGame) return;
    document.getElementById("active-game-title").textContent = currentGame.name;
    const board = document.getElementById("game-board");
    board.innerHTML = "";
    showScreen("screen-game");

    // ゲームに渡す操作用コンテキスト
    const context = {
      myId: net.myId,
      isHost: net.isHost,
      players: net.players,
      broadcast: (data) => net.broadcast({ type: "GAME_DATA", data }),
      sendToPlayer: (id, data) => net.sendToPlayer(id, data),
      sendAction: (action) => net.sendAction(action)
    };
    currentGame.init(board, context);
  };

  net.onGameData = (data) => {
    if (currentGame && currentGame.onReceiveData) {
      currentGame.onReceiveData(data);
    }
  };

  net.onGameAction = (playerId, action) => {
    if (currentGame && currentGame.onPlayerAction) {
      currentGame.onPlayerAction(playerId, action);
    }
  };

  net.onReturnToRoom = () => {
    currentGame = null;
    showScreen("screen-room");
  };
});
