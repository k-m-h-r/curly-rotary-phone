(() => {
  // カードデザイン用のCSSを自動注入（style.cssの編集不要）
  const injectUnoStyles = () => {
    if (document.getElementById("uno-custom-style")) return;
    const style = document.createElement("style");
    style.id = "uno-custom-style";
    style.textContent = `
      .uno-wrapper { display: flex; flex-direction: column; gap: 16px; }
      .uno-status-bar {
        display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
        background: #1e293b; padding: 12px; border-radius: 8px; gap: 8px;
      }
      .uno-players { display: flex; flex-wrap: wrap; gap: 8px; }
      .uno-player-chip {
        background: #0f172a; border: 2px solid #334155; padding: 6px 12px;
        border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;
      }
      .uno-player-chip.active {
        border-color: #38bdf8; background: #172554; box-shadow: 0 0 8px rgba(56,189,248,0.4);
      }
      .uno-uno-badge {
        background: #ef4444; color: #fff; font-weight: bold; font-size: 0.75rem;
        padding: 2px 6px; border-radius: 4px; animation: unoPulse 1s infinite;
      }
      .uno-stack-alert {
        background: #7f1d1d; border: 2px solid #ef4444; color: #fecaca;
        padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 0.95rem;
        text-align: center; animation: unoPulse 1.2s infinite;
      }
      @keyframes unoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }

      .uno-table {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: #1e293b; padding: 20px; border-radius: 12px; gap: 12px;
      }
      .uno-piles { display: flex; align-items: center; gap: 24px; }
      .uno-card {
        width: 68px; height: 98px; border-radius: 10px; border: 3px solid #fff;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-weight: bold; color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        user-select: none; box-shadow: 0 4px 6px rgba(0,0,0,0.4); transition: transform 0.15s, opacity 0.15s;
        position: relative; text-align: center; padding: 2px;
      }
      .uno-card.playable { cursor: pointer; }
      .uno-card.playable:hover { transform: translateY(-10px); }
      .uno-card.disabled { opacity: 0.4; cursor: not-allowed; }
      .uno-card-val { font-size: 1.4rem; }
      .uno-card-sub { font-size: 0.65rem; margin-top: 2px; }

      .uno-red { background: linear-gradient(135deg, #ef4444, #b91c1c); }
      .uno-blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      .uno-green { background: linear-gradient(135deg, #22c55e, #15803d); }
      .uno-yellow { background: linear-gradient(135deg, #eab308, #a16207); }
      .uno-wild { background: linear-gradient(135deg, #334155, #090d16); }
      .uno-deck-back {
        background: repeating-linear-gradient(45deg, #1e293b, #1e293b 8px, #0f172a 8px, #0f172a 16px);
        cursor: pointer;
      }
      .uno-deck-back.penalty {
        border-color: #ef4444;
        background: repeating-linear-gradient(45deg, #7f1d1d, #7f1d1d 8px, #450a0a 8px, #450a0a 16px);
      }
      .uno-deck-back:hover { transform: scale(1.05); }

      .uno-color-indicator {
        padding: 4px 14px; border-radius: 999px; font-weight: bold; font-size: 0.9rem; color: #fff;
      }
      .uno-log {
        background: #0f172a; padding: 8px 14px; border-radius: 6px;
        color: #cbd5e1; font-size: 0.9rem; text-align: center; width: 100%;
      }
      .uno-hand-area { background: #1e293b; padding: 16px; border-radius: 12px; }
      .uno-hand-cards {
        display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 10px;
      }
      .uno-controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
      .uno-color-picker {
        display: flex; gap: 8px; justify-content: center; margin-top: 10px;
        background: #0f172a; padding: 12px; border-radius: 8px;
      }
      .uno-color-btn {
        width: 56px; height: 40px; border: 2px solid #fff; border-radius: 8px;
        color: #fff; font-weight: bold; cursor: pointer;
      }
      .uno-rule-badge {
        background: #0f172a; border: 1px solid #475569; padding: 4px 10px;
        border-radius: 6px; font-size: 0.8rem; color: #cbd5e1;
      }
    `;
    document.head.appendChild(style);
  };

  const COLORS = ["red", "blue", "green", "yellow"];
  const COLOR_NAMES = { red: "赤", blue: "青", green: "緑", yellow: "黄", wild: "黒" };

  // クライアント・ホスト共通状態
  let ctx = null;
  let initialized = false;
  let earlyPackets = [];

  let myHand = [];
  let publicState = null;
  let pendingWildCardIndex = null;
  let drawnCardCanPlay = false;

  // ホスト専用ゲーム状態
  let hostStackRuleEnabled = true; // ローカルルール：ドロー重ね出し（デフォルトON）
  let hostDeck = [];
  let hostDiscard = [];
  let hostHands = {};
  let hostTurnIndex = 0;
  let hostDirection = 1;
  let hostCurrentColor = "red";
  let hostUnoDeclared = {};
  let hostDrawnPlayerId = null;
  let hostPendingDrawCount = 0; // 累積ドロー枚数
  let hostPendingDrawType = null; // "draw2" または "wild4"
  let hostWinnerId = null;
  let hostLastLog = "";

  // HTMLエスケープ
  const esc = (str) => String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));

  // カード表示用ラベル
  const formatCardLabel = (card) => {
    const map = {
      skip: { main: "⊘", sub: "スキップ" },
      reverse: { main: "⇄", sub: "リバース" },
      draw2: { main: "+2", sub: "ドロー2" },
      wild: { main: "🌈", sub: "ワイルド" },
      wild4: { main: "+4", sub: "ドロー4" }
    };
    if (map[card.value]) return map[card.value];
    return { main: card.value, sub: COLOR_NAMES[card.color] };
  };

  // --- ホスト用ロジック ---
  const createDeck = () => {
    const deck = [];
    COLORS.forEach(color => {
      deck.push({ color, value: "0" });
      for (let n = 1; n <= 9; n++) {
        deck.push({ color, value: String(n) });
        deck.push({ color, value: String(n) });
      }
      ["skip", "reverse", "draw2"].forEach(sym => {
        deck.push({ color, value: sym });
        deck.push({ color, value: sym });
      });
    });
    for (let i = 0; i < 4; i++) {
      deck.push({ color: "wild", value: "wild" });
      deck.push({ color: "wild", value: "wild4" });
    }
    return shuffle(deck);
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const drawFromDeck = (count) => {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (hostDeck.length === 0) {
        if (hostDiscard.length <= 1) break;
        const top = hostDiscard.pop();
        hostDeck = shuffle(hostDiscard);
        hostDiscard = [top];
      }
      if (hostDeck.length > 0) {
        drawn.push(hostDeck.pop());
      }
    }
    return drawn;
  };

  // カードが出せるかどうかの判定（累積ダメージ中も考慮）
  const canPlayCard = (card, topCard, currentColor, pendingDrawCount = 0, pendingDrawType = null) => {
    if (pendingDrawCount > 0) {
      // 累積ドロー中は「同じ種類のドローカード」だけ重ねられる
      return card.value === pendingDrawType;
    }
    if (card.color === "wild") return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const getNextIndex = (step = 1) => {
    const n = ctx.players.length;
    return ((hostTurnIndex + hostDirection * step) % n + n) % n;
  };

  const syncAllPlayers = () => {
    const handCounts = {};
    ctx.players.forEach(p => {
      handCounts[p.id] = (hostHands[p.id] || []).length;
      ctx.sendToPlayer(p.id, {
        type: "UNO_HAND",
        hand: hostHands[p.id] || []
      });
    });

    const topCard = hostDiscard[hostDiscard.length - 1];
    ctx.broadcast({
      type: "UNO_STATE",
      topCard,
      currentColor: hostCurrentColor,
      currentPlayerId: ctx.players[hostTurnIndex].id,
      direction: hostDirection,
      deckCount: hostDeck.length,
      handCounts,
      unoDeclared: { ...hostUnoDeclared },
      drawnPlayerId: hostDrawnPlayerId,
      pendingDrawCount: hostPendingDrawCount,
      pendingDrawType: hostPendingDrawType,
      stackRuleEnabled: hostStackRuleEnabled,
      winnerId: hostWinnerId,
      lastLog: hostLastLog
    });
  };

  const startNewMatch = () => {
    hostDeck = createDeck();
    hostDiscard = [];
    hostHands = {};
    hostUnoDeclared = {};
    hostTurnIndex = 0;
    hostDirection = 1;
    hostDrawnPlayerId = null;
    hostPendingDrawCount = 0;
    hostPendingDrawType = null;
    hostWinnerId = null;

    ctx.players.forEach(p => {
      hostHands[p.id] = drawFromDeck(7);
      hostUnoDeclared[p.id] = false;
    });

    // 最初の場札（ワイルドドロー4・ドロー2は避けて開始をスムーズにする）
    let firstCard = drawFromDeck(1)[0];
    while (firstCard.value === "wild4" || firstCard.value === "draw2") {
      hostDeck.unshift(firstCard);
      firstCard = drawFromDeck(1)[0];
    }
    hostDiscard.push(firstCard);
    hostCurrentColor = firstCard.color === "wild"
      ? COLORS[Math.floor(Math.random() * COLORS.length)]
      : firstCard.color;

    const ruleText = hostStackRuleEnabled ? "【重ね出し累積ルール: ON】" : "【重ね出し累積ルール: OFF】";
    hostLastLog = `ゲーム開始！${ruleText} 最初の場札は「${COLOR_NAMES[hostCurrentColor]}」です。`;
    syncAllPlayers();
  };

  // --- ゲームプラグイン定義 ---
  registerGame({
    id: "uno",
    name: "🃏 UNO（ウノ）",
    description: "手札を一番早く0枚にした人の勝ち！ドロー2・+4の重ね出し累積ルールにも対応。",
    minPlayers: 2,
    maxPlayers: 8,

    init(container, context) {
      injectUnoStyles();
      ctx = context;
      myHand = [];
      publicState = null;
      pendingWildCardIndex = null;
      drawnCardCanPlay = false;
      initialized = true;

      container.innerHTML = `<div id="uno-root" class="uno-wrapper"><p style="text-align:center;">カードを配布中...</p></div>`;

      while (earlyPackets.length > 0) {
        this.onReceiveData(earlyPackets.shift());
      }

      if (ctx.isHost) {
        startNewMatch();
      }
    },

    onPlayerAction(playerId, action) {
      if (!ctx.isHost) return;

      // リスタート・ルール切替はいつでもホストから実行可能
      if (action.type === "RESTART") {
        startNewMatch();
        return;
      }
      if (action.type === "TOGGLE_STACK_RULE") {
        hostStackRuleEnabled = !hostStackRuleEnabled;
        startNewMatch();
        return;
      }

      if (hostWinnerId) return;

      const player = ctx.players.find(p => p.id === playerId);
      const playerName = player ? player.name : "プレイヤー";
      const currentPlayer = ctx.players[hostTurnIndex];

      // 1. UNO宣言（手札2枚以下ならいつでも宣言可）
      if (action.type === "DECLARE_UNO") {
        if ((hostHands[playerId] || []).length <= 2 && !hostUnoDeclared[playerId]) {
          hostUnoDeclared[playerId] = true;
          hostLastLog = `🔥 ${playerName} が「UNO!!」を宣言しました！`;
          syncAllPlayers();
        }
        return;
      }

      // 2. UNO忘れ指摘
      if (action.type === "CALL_OUT_UNO") {
        const targetId = action.targetId;
        const targetPlayer = ctx.players.find(p => p.id === targetId);
        if (
          targetPlayer &&
          (hostHands[targetId] || []).length === 1 &&
          !hostUnoDeclared[targetId]
        ) {
          const penalty = drawFromDeck(2);
          hostHands[targetId].push(...penalty);
          hostUnoDeclared[targetId] = false;
          hostLastLog = `🚨 ${playerName} が ${targetPlayer.name} のUNO忘れを指摘！ペナルティで2枚ドロー！`;
          syncAllPlayers();
        }
        return;
      }

      // 以降は自分のターンのみ有効
      if (currentPlayer.id !== playerId) return;

      // 3. 山札から引く（通常1枚ドロー、または累積ペナルティ全受け）
      if (action.type === "DRAW_CARD") {
        // ★ 累積ドロー中の場合：溜まっている枚数をすべて引いてターン終了
        if (hostPendingDrawCount > 0) {
          const drawn = drawFromDeck(hostPendingDrawCount);
          hostHands[playerId].push(...drawn);
          if (hostHands[playerId].length > 1) {
            hostUnoDeclared[playerId] = false;
          }
          const received = drawn.length;
          hostPendingDrawCount = 0;
          hostPendingDrawType = null;
          hostDrawnPlayerId = null;
          hostTurnIndex = getNextIndex(1);
          hostLastLog = `💥 ${playerName} が累積ダメージを受け止め、山札から ${received}枚 引きました！`;
          syncAllPlayers();
          return;
        }

        // 通常の1枚ドロー
        if (hostDrawnPlayerId === playerId) return;
        const drawn = drawFromDeck(1);
        if (drawn.length === 0) {
          hostTurnIndex = getNextIndex(1);
          hostLastLog = `${playerName} は山札がないためパスしました。`;
          syncAllPlayers();
          return;
        }

        const card = drawn[0];
        hostHands[playerId].push(card);
        if (hostHands[playerId].length > 1) {
          hostUnoDeclared[playerId] = false;
        }

        const topCard = hostDiscard[hostDiscard.length - 1];
        if (canPlayCard(card, topCard, hostCurrentColor, 0, null)) {
          hostDrawnPlayerId = playerId;
          hostLastLog = `${playerName} が山札から1枚引きました（出すかパスか選択中...）`;
        } else {
          hostDrawnPlayerId = null;
          hostTurnIndex = getNextIndex(1);
          hostLastLog = `${playerName} が山札から1枚引いてターン終了しました。`;
        }
        syncAllPlayers();
        return;
      }

      // 4. 引いた後に出さずにパスする
      if (action.type === "PASS_AFTER_DRAW") {
        if (hostDrawnPlayerId !== playerId) return;
        hostDrawnPlayerId = null;
        hostTurnIndex = getNextIndex(1);
        hostLastLog = `${playerName} は引いたカードを出さずにパスしました。`;
        syncAllPlayers();
        return;
      }

      // 5. 手札からカードを出す
      if (action.type === "PLAY_CARD") {
        const hand = hostHands[playerId];
        const card = hand[action.cardIndex];
        const topCard = hostDiscard[hostDiscard.length - 1];
        if (!card || !canPlayCard(card, topCard, hostCurrentColor, hostPendingDrawCount, hostPendingDrawType)) {
          return;
        }

        if (hostDrawnPlayerId === playerId && action.cardIndex !== hand.length - 1) return;

        // カードを場に出す
        hand.splice(action.cardIndex, 1);
        hostDiscard.push(card);
        hostDrawnPlayerId = null;

        // 色の確定
        if (card.color === "wild") {
          hostCurrentColor = COLORS.includes(action.chosenColor) ? action.chosenColor : "red";
        } else {
          hostCurrentColor = card.color;
        }

        // 勝利判定
        if (hand.length === 0) {
          hostPendingDrawCount = 0;
          hostPendingDrawType = null;
          hostWinnerId = playerId;
          hostLastLog = `🎉 ${playerName} が上がりました！勝者: ${playerName}！`;
          syncAllPlayers();
          return;
        }

        // 記号カードの効果処理
        let step = 1;
        let effectMsg = "";
        const label = formatCardLabel(card);

        if (card.value === "reverse") {
          if (ctx.players.length === 2) {
            step = 2;
            effectMsg = "（2人対戦のため連続ターン！）";
          } else {
            hostDirection *= -1;
            step = 1;
            effectMsg = "（順番が逆回りになりました！）";
          }
        } else if (card.value === "skip") {
          const skippedPlayer = ctx.players[getNextIndex(1)];
          step = 2;
          effectMsg = `（${skippedPlayer.name} をスキップ！）`;
        } else if (card.value === "draw2") {
          if (hostStackRuleEnabled) {
            // ★ 重ね出しルールON：累積して次の人へ回す
            hostPendingDrawCount += 2;
            hostPendingDrawType = "draw2";
            step = 1;
            effectMsg = `（🔥 累積ドロー: 合計 +${hostPendingDrawCount}枚！次の人はドロー2で回避可能！）`;
          } else {
            // 重ね出しルールOFF：即座に引かせてスキップ
            const victimIndex = getNextIndex(1);
            const victim = ctx.players[victimIndex];
            const drawn = drawFromDeck(2);
            hostHands[victim.id].push(...drawn);
            if (hostHands[victim.id].length > 1) hostUnoDeclared[victim.id] = false;
            step = 2;
            effectMsg = `（${victim.name} に2枚引かせてスキップ！）`;
          }
        } else if (card.value === "wild4") {
          if (hostStackRuleEnabled) {
            // ★ 重ね出しルールON：累積して次の人へ回す
            hostPendingDrawCount += 4;
            hostPendingDrawType = "wild4";
            step = 1;
            effectMsg = `（色: ${COLOR_NAMES[hostCurrentColor]} / 🔥 累積ドロー: 合計 +${hostPendingDrawCount}枚！次の人は+4で回避可能！）`;
          } else {
            // 重ね出しルールOFF：即座に引かせてスキップ
            const victimIndex = getNextIndex(1);
            const victim = ctx.players[victimIndex];
            const drawn = drawFromDeck(4);
            hostHands[victim.id].push(...drawn);
            if (hostHands[victim.id].length > 1) hostUnoDeclared[victim.id] = false;
            step = 2;
            effectMsg = `（色: ${COLOR_NAMES[hostCurrentColor]} / ${victim.name} に4枚引かせてスキップ！）`;
          }
        } else if (card.value === "wild") {
          effectMsg = `（色を「${COLOR_NAMES[hostCurrentColor]}」に変更！）`;
        }

        hostTurnIndex = getNextIndex(step);
        hostLastLog = `${playerName} が [${COLOR_NAMES[card.color]} ${label.sub}] を出しました${effectMsg}`;
        syncAllPlayers();
      }
    },

    onReceiveData(data) {
      if (!initialized) {
        earlyPackets.push(data);
        return;
      }
      if (data.type === "UNO_HAND") {
        myHand = data.hand || [];
        pendingWildCardIndex = null;
        this.render();
      } else if (data.type === "UNO_STATE") {
        publicState = data;
        drawnCardCanPlay = (data.drawnPlayerId === ctx.myId);
        this.render();
      }
    },

    render() {
      const root = document.getElementById("uno-root");
      if (!root || !publicState) return;

      const isMyTurn = (publicState.currentPlayerId === ctx.myId) && !publicState.winnerId;
      const top = publicState.topCard;
      const topLabel = formatCardLabel(top);
      const pendingCount = publicState.pendingDrawCount || 0;
      const pendingType = publicState.pendingDrawType || null;
      const pendingCardName = pendingType === "wild4" ? "ワイルドドロー4 (+4)" : "ドロー2 (+2)";

      // プレイヤー一覧チップ
      const playersHtml = ctx.players.map(p => {
        const count = publicState.handCounts[p.id] ?? 0;
        const isTurn = (p.id === publicState.currentPlayerId) && !publicState.winnerId;
        const isUno = publicState.unoDeclared[p.id] && count === 1;
        return `
          <div class="uno-player-chip ${isTurn ? "active" : ""}">
            <span>${esc(p.name)}</span>
            <strong>${count}枚</strong>
            ${isUno ? `<span class="uno-uno-badge">UNO!</span>` : ""}
          </div>
        `;
      }).join("");

      // UNO忘れ指摘対象
      const uncalledPlayers = ctx.players.filter(p =>
        p.id !== ctx.myId &&
        (publicState.handCounts[p.id] === 1) &&
        !publicState.unoDeclared[p.id]
      );

      // 自分の手札HTML
      const handHtml = myHand.map((card, idx) => {
        const label = formatCardLabel(card);
        let playable = isMyTurn && canPlayCard(card, top, publicState.currentColor, pendingCount, pendingType);
        if (drawnCardCanPlay && idx !== myHand.length - 1) {
          playable = false;
        }
        return `
          <div class="uno-card uno-${card.color} ${playable ? "playable" : "disabled"}" data-idx="${idx}">
            <div class="uno-card-val">${label.main}</div>
            <div class="uno-card-sub">${label.sub}</div>
          </div>
        `;
      }).join("");

      // ワイルド色選択パネル
      const colorPickerHtml = pendingWildCardIndex !== null ? `
        <div class="uno-color-picker">
          <span style="align-self:center; font-size:0.9rem;">変更する色を選択:</span>
          ${COLORS.map(c => `<button class="uno-color-btn uno-${c}" data-pick-color="${c}">${COLOR_NAMES[c]}</button>`).join("")}
          <button id="uno-cancel-wild" class="btn small">戻る</button>
        </div>
      ` : "";

      // アクションボタン群
      const canDeclareUno = myHand.length <= 2 && myHand.length > 0 && !publicState.unoDeclared[ctx.myId];

      // 山札ボタンの表示テキスト
      let deckSubText = "山札";
      if (isMyTurn && !drawnCardCanPlay) {
        deckSubText = pendingCount > 0 ? `💥 ${pendingCount}枚引く` : "1枚引く";
      }

      // ターン案内メッセージ
      let turnGuideText = "他のプレイヤーのターンです...";
      if (isMyTurn) {
        if (pendingCount > 0) {
          turnGuideText = `⚠️ 累積ドロー中！手札の「${pendingCardName}」を重ねるか、山札を押して ${pendingCount}枚 引いてください`;
        } else {
          turnGuideText = "★ あなたのターンです！カードを出すか山札から引いてください";
        }
      }

      root.innerHTML = `
        <!-- 上部ステータス＆プレイヤー一覧 -->
        <div class="uno-status-bar">
          <div class="uno-players">${playersHtml}</div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
            <span style="font-size:0.85rem; color:#94a3b8;">
              進行: ${publicState.direction === 1 ? "順回り ➡" : "逆回り ⬅"} / 山札: ${publicState.deckCount}枚
            </span>
            ${ctx.isHost ? `
              <button id="uno-toggle-stack-btn" class="btn small ${publicState.stackRuleEnabled ? "secondary" : ""}" title="クリックでルール切替＆再配布">
                重ね出し: ${publicState.stackRuleEnabled ? "ON" : "OFF"}
              </button>
            ` : `
              <span class="uno-rule-badge">重ね出し: ${publicState.stackRuleEnabled ? "ON" : "OFF"}</span>
            `}
          </div>
        </div>

        <!-- 中央の場（山札・場札・現在の有効色） -->
        <div class="uno-table">
          ${pendingCount > 0 ? `
            <div class="uno-stack-alert">
              🔥 累積ダメージ発生中：現在 +${pendingCount}枚（${pendingCardName} で次の人へ回せます！）
            </div>
          ` : ""}

          <div class="uno-color-indicator uno-${publicState.currentColor}">
            現在の色: ${COLOR_NAMES[publicState.currentColor]}
          </div>

          <div class="uno-piles">
            <div id="uno-deck-btn" class="uno-card uno-deck-back ${isMyTurn && pendingCount > 0 ? "penalty" : ""}" title="山札から引く">
              <div class="uno-card-val">${isMyTurn && pendingCount > 0 ? `+${pendingCount}` : "UNO"}</div>
              <div class="uno-card-sub">${deckSubText}</div>
            </div>

            <div class="uno-card uno-${top.color}">
              <div class="uno-card-val">${topLabel.main}</div>
              <div class="uno-card-sub">${topLabel.sub}</div>
            </div>
          </div>

          <div class="uno-log">${esc(publicState.lastLog)}</div>

          ${publicState.winnerId ? `
            <div style="text-align:center; margin-top:8px;">
              ${ctx.isHost ? `<button id="uno-restart-btn" class="btn primary">もう一度遊ぶ</button>` : `<p>ホストの次の操作を待っています...</p>`}
            </div>
          ` : `
            <div style="font-weight:bold; text-align:center; color:${isMyTurn ? (pendingCount > 0 ? "#f87171" : "#38bdf8") : "#94a3b8"};">
              ${turnGuideText}
            </div>
          `}
        </div>

        <!-- 操作ボタン（累積受け入れ・UNO宣言・指摘・パス） -->
        <div class="uno-controls">
          ${isMyTurn && pendingCount > 0 ? `
            <button id="uno-accept-draw-btn" class="btn danger small">💥 諦めて累積 ${pendingCount}枚 を引く</button>
          ` : ""}
          ${canDeclareUno ? `<button id="uno-declare-btn" class="btn danger small">🔥 UNO宣言！</button>` : ""}
          ${drawnCardCanPlay ? `<button id="uno-pass-btn" class="btn secondary small">引いたカードを出さずにパス</button>` : ""}
          ${uncalledPlayers.map(p => `
            <button class="btn danger small uno-callout-btn" data-target="${p.id}">
              🚨 ${esc(p.name)} のUNO忘れを指摘！(+2枚)
            </button>
          `).join("")}
        </div>

        ${colorPickerHtml}

        <!-- 自分の手札 -->
        <div class="uno-hand-area">
          <h3>あなたの手札 (${myHand.length}枚)</h3>
          <div class="uno-hand-cards">${handHtml}</div>
        </div>
      `;

      // --- イベントリスナーの登録 ---
      root.querySelectorAll(".uno-hand-cards .uno-card.playable").forEach(el => {
        el.addEventListener("click", () => {
          const idx = Number(el.dataset.idx);
          const card = myHand[idx];
          if (!card) return;
          if (card.color === "wild") {
            pendingWildCardIndex = idx;
            this.render();
          } else {
            ctx.sendAction({ type: "PLAY_CARD", cardIndex: idx });
          }
        });
      });

      root.querySelectorAll("[data-pick-color]").forEach(btn => {
        btn.addEventListener("click", () => {
          const chosenColor = btn.dataset.pickColor;
          const idx = pendingWildCardIndex;
          pendingWildCardIndex = null;
          ctx.sendAction({ type: "PLAY_CARD", cardIndex: idx, chosenColor });
        });
      });

      const cancelWild = document.getElementById("uno-cancel-wild");
      if (cancelWild) {
        cancelWild.addEventListener("click", () => {
          pendingWildCardIndex = null;
          this.render();
        });
      }

      const deckBtn = document.getElementById("uno-deck-btn");
      if (deckBtn && isMyTurn && !drawnCardCanPlay) {
        deckBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "DRAW_CARD" });
        });
      }

      const acceptDrawBtn = document.getElementById("uno-accept-draw-btn");
      if (acceptDrawBtn) {
        acceptDrawBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "DRAW_CARD" });
        });
      }

      const passBtn = document.getElementById("uno-pass-btn");
      if (passBtn) {
        passBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "PASS_AFTER_DRAW" });
        });
      }

      const declareBtn = document.getElementById("uno-declare-btn");
      if (declareBtn) {
        declareBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "DECLARE_UNO" });
        });
      }

      root.querySelectorAll(".uno-callout-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          ctx.sendAction({ type: "CALL_OUT_UNO", targetId: btn.dataset.target });
        });
      });

      const restartBtn = document.getElementById("uno-restart-btn");
      if (restartBtn) {
        restartBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "RESTART" });
        });
      }

      const toggleStackBtn = document.getElementById("uno-toggle-stack-btn");
      if (toggleStackBtn) {
        toggleStackBtn.addEventListener("click", () => {
          if (confirm("重ね出しルールを切り替えて、新しいゲームを再配布しますか？")) {
            ctx.sendAction({ type: "TOGGLE_STACK_RULE" });
          }
        });
      }
    }
  });
})();
