(() => {
  let ctx = null;
  let scores = {};
  let timeLeft = 10;
  let timer = null;

  registerGame({
    id: "click_battle",
    name: "⚡ 10秒連打バトル（通信テスト）",
    description: "10秒間にボタンを一番多く押した人の勝ち！1人でも動作確認できます。",
    minPlayers: 1,
    maxPlayers: 10,

    // ゲーム開始時に呼ばれる
    init(container, context) {
      ctx = context;
      scores = {};
      timeLeft = 10;
      ctx.players.forEach(p => scores[p.id] = 0);

      container.innerHTML = `
        <div style="text-align:center;">
          <h3 id="cb-timer" style="font-size:1.5rem; color:#38bdf8;">残り時間: 10秒</h3>
          <button id="cb-btn" class="btn primary" style="height:100px; font-size:1.5rem; margin:16px 0;">
            連打しろ！！
          </button>
          <div id="cb-scoreboard"></div>
        </div>
      `;

      document.getElementById("cb-btn").addEventListener("click", () => {
        if (timeLeft > 0) {
          ctx.sendAction({ type: "CLICK" });
        }
      });

      this.renderScores();

      // ホストだけがタイマーを進行して全員に同期する
      if (ctx.isHost) {
        timer = setInterval(() => {
          timeLeft--;
          ctx.broadcast({ type: "SYNC", scores, timeLeft });
          if (timeLeft <= 0) clearInterval(timer);
        }, 1000);
      }
    },

    // ホスト専用：誰かの操作を受け取ったときの処理
    onPlayerAction(playerId, action) {
      if (action.type === "CLICK" && timeLeft > 0) {
        scores[playerId] = (scores[playerId] || 0) + 1;
        ctx.broadcast({ type: "SYNC", scores, timeLeft });
      }
    },

    // 全員共通：ホストから最新状態を受け取ったときの描画更新
    onReceiveData(data) {
      if (data.type === "SYNC") {
        scores = data.scores;
        timeLeft = data.timeLeft;
        const timerEl = document.getElementById("cb-timer");
        if (timerEl) {
          timerEl.textContent = timeLeft > 0 ? `残り時間: ${timeLeft}秒` : "終了！！";
        }
        if (timeLeft <= 0) {
          const btn = document.getElementById("cb-btn");
          if (btn) btn.disabled = true;
        }
        this.renderScores();
      }
    },

    renderScores() {
      const board = document.getElementById("cb-scoreboard");
      if (!board) return;
      board.innerHTML = ctx.players.map(p =>
        `<p style="font-size:1.1rem; margin:4px 0;">${p.name}: <strong>${scores[p.id] || 0}</strong> 回</p>`
      ).join("");
    }
  });
})();
