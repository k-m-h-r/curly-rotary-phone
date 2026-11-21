(() => {
  // 人狼ゲーム専用スタイルを自動注入（style.cssの編集不要）
  const injectWerewolfStyles = () => {
    if (document.getElementById("werewolf-custom-style")) return;
    const style = document.createElement("style");
    style.id = "werewolf-custom-style";
    style.textContent = `
      .ww-wrapper { display: flex; flex-direction: column; gap: 16px; }
      .ww-header-bar {
        display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
        background: #1e293b; padding: 12px 16px; border-radius: 10px; gap: 8px;
      }
      .ww-phase-badge {
        padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 0.95rem;
      }
      .ww-phase-setup { background: #4f46e5; color: #fff; }
      .ww-phase-day { background: #0284c7; color: #fff; }
      .ww-phase-vote { background: #d97706; color: #fff; }
      .ww-phase-night { background: #312e81; color: #e0e7ff; border: 1px solid #6366f1; }
      .ww-phase-over { background: #059669; color: #fff; }
      .ww-phase-teru { background: #eab308; color: #0f172a; }

      .ww-timer { font-size: 1.2rem; font-weight: bold; color: #38bdf8; }

      .ww-role-card {
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border: 2px solid #475569; border-radius: 12px; padding: 16px;
      }
      .ww-role-card.wolf { border-color: #ef4444; background: linear-gradient(135deg, #450a0a, #0f172a); }
      .ww-role-card.seer { border-color: #a855f7; background: linear-gradient(135deg, #3b0764, #0f172a); }
      .ww-role-card.medium { border-color: #06b6d4; background: linear-gradient(135deg, #083344, #0f172a); }
      .ww-role-card.guard { border-color: #3b82f6; background: linear-gradient(135deg, #172554, #0f172a); }
      .ww-role-card.madman { border-color: #f97316; background: linear-gradient(135deg, #431407, #0f172a); }
      .ww-role-card.teruteru { border-color: #eab308; background: linear-gradient(135deg, #422006, #0f172a); }

      .ww-role-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 6px; }
      .ww-role-desc { font-size: 0.9rem; color: #cbd5e1; }
      .ww-secret-box {
        margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.35);
        border-radius: 8px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 6px;
      }

      .ww-announce {
        background: #1e293b; border-left: 4px solid #38bdf8;
        padding: 12px 16px; border-radius: 8px; font-size: 0.95rem;
      }

      .ww-panel { background: #1e293b; padding: 16px; border-radius: 12px; }
      .ww-player-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 10px; margin-top: 10px;
      }
      .ww-player-card {
        background: #0f172a; border: 2px solid #334155; border-radius: 10px;
        padding: 12px; display: flex; flex-direction: column; gap: 6px;
        transition: 0.15s;
      }
      .ww-player-card.dead { opacity: 0.5; background: #090d16; border-style: dashed; }
      .ww-player-card.selected { border-color: #38bdf8; background: #172554; }
      .ww-player-name { font-weight: bold; font-size: 1rem; display: flex; justify-content: space-between; }
      .ww-status-tag { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #334155; }
      .ww-status-tag.dead { background: #7f1d1d; color: #fecaca; }
      .ww-status-tag.ready { background: #065f46; color: #a7f3d0; }

      /* セットアップ画面用 */
      .ww-setup-list { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
      .ww-setup-row {
        display: flex; justify-content: space-between; align-items: center;
        background: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;
      }
      .ww-setup-info { display: flex; flex-direction: column; }
      .ww-setup-team { font-size: 0.75rem; color: #94a3b8; }
      .ww-setup-ctrl { display: flex; align-items: center; gap: 10px; }
      .ww-count-btn {
        width: 32px; height: 32px; border-radius: 6px; border: none;
        background: #334155; color: #fff; font-size: 1.1rem; font-weight: bold; cursor: pointer;
      }
      .ww-count-btn:hover { background: #475569; }
      .ww-count-val { font-size: 1.15rem; font-weight: bold; min-width: 24px; text-align: center; }
      .ww-setup-summary {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px; border-radius: 8px; background: #0f172a; margin-bottom: 12px; font-weight: bold;
      }

      .ww-log-list {
        list-style: none; max-height: 160px; overflow-y: auto;
        background: #0f172a; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem;
      }
      .ww-log-list li { padding: 4px 0; border-bottom: 1px solid #1e293b; }
      .ww-log-list li:last-child { border-bottom: none; }

      .ww-host-bar {
        display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end;
        padding-top: 10px; margin-top: 10px; border-top: 1px solid #334155;
      }
    `;
    document.head.appendChild(style);
  };

  // 表示順序と役職マスターデータ
  const ROLE_ORDER = ["werewolf", "seer", "medium", "guard", "madman", "teruteru", "villager"];

  const ROLES = {
    werewolf: {
      id: "werewolf",
      name: "🐺 人狼",
      teamLabel: "人狼陣営",
      css: "wolf",
      desc: "正体を隠して市民を欺き、夜の襲撃で人間を減らしましょう。人狼の数が人間（狂人・てるてる含む）以上になると勝利です。"
    },
    seer: {
      id: "seer",
      name: "🔮 占い師",
      teamLabel: "市民陣営",
      css: "seer",
      desc: "毎晩1人を占い、その人が「人狼」か「人間（人狼ではない）」かを見抜くことができます。"
    },
    medium: {
      id: "medium",
      name: "🕯️ 霊媒師",
      teamLabel: "市民陣営",
      css: "medium",
      desc: "昼の投票で追放された人が「人狼」だったか「人間（人狼ではない）」だったかを夜に知ることができます。"
    },
    guard: {
      id: "guard",
      name: "🛡️ 狩人",
      teamLabel: "市民陣営",
      css: "guard",
      desc: "2日目以降の夜に自分以外の1人を護衛し、人狼の襲撃から守ることができます。"
    },
    madman: {
      id: "madman",
      name: "🃏 狂人",
      teamLabel: "人狼陣営",
      css: "madman",
      desc: "人狼陣営の人間です。特殊能力はありませんが、議論をかき乱して人狼を勝利に導けばあなたの勝ちです（占い・霊媒結果は人間）。"
    },
    teruteru: {
      id: "teruteru",
      name: "☀️ てるてる",
      teamLabel: "第三陣営（単独）",
      css: "teruteru",
      desc: "市民でも人狼でもない第三陣営です。昼の投票で「自分が追放される」と即座に単独勝利となります！（襲撃死や生存決着は敗北）"
    },
    villager: {
      id: "villager",
      name: "🧑‍🌾 市民",
      teamLabel: "市民陣営",
      css: "villager",
      desc: "特殊能力はありませんが、議論と推理で人狼を見つけ出し、昼の投票で追放しましょう。"
    }
  };

  // クライアント・ホスト共通状態
  let ctx = null;
  let initialized = false;
  let earlyPackets = [];

  let myPrivate = null;
  let publicState = null;

  // ホスト専用状態
  let hostTimer = null;
  let hostPhase = "SETUP"; // SETUP | FIRST_NIGHT | DAY_DISCUSS | DAY_VOTE | NIGHT | GAME_OVER
  let hostRoleCounts = {
    werewolf: 1,
    seer: 1,
    medium: 0,
    guard: 0,
    madman: 0,
    teruteru: 0,
    villager: 2
  };
  let hostDay = 1;
  let hostTimeLeft = 0;
  let hostRoles = {};         // playerId -> roleId
  let hostAlive = {};         // playerId -> boolean
  let hostReadyMap = {};      // 1日目夜：確認済みマップ
  let hostVotes = {};         // 昼投票：voterId -> targetId
  let hostNightActions = {};  // 夜行動
  let hostFortuneLogs = {};   // playerId -> [{ day, targetName, isWolf }]
  let hostMediumLogs = {};    // playerId -> [{ day, targetName, isWolf }]
  let hostHeadline = "";
  let hostLogs = [];
  let hostWinnerTeam = null;  // "village" | "wolf" | "teruteru"
  let hostWinnerName = "";    // てるてる勝者名

  const esc = (str) => String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const getPlayerName = (id) => {
    const p = ctx.players.find(pl => pl.id === id);
    return p ? p.name : "不明";
  };

  const clearHostTimer = () => {
    if (hostTimer) {
      clearInterval(hostTimer);
      hostTimer = null;
    }
  };

  // 参加人数に応じたおすすめ役職配分を生成
  const buildRecommendedCounts = (count) => {
    const c = { werewolf: 1, seer: 1, medium: 0, guard: 0, madman: 0, teruteru: 0, villager: 0 };
    if (count === 4) {
      c.werewolf = 1; c.seer = 1; c.villager = 2;
    } else if (count === 5) {
      c.werewolf = 1; c.seer = 1; c.guard = 1; c.teruteru = 1; c.villager = 1;
    } else if (count === 6) {
      c.werewolf = 1; c.seer = 1; c.medium = 1; c.guard = 1; c.madman = 1; c.villager = 1;
    } else if (count === 7) {
      c.werewolf = 2; c.seer = 1; c.medium = 1; c.guard = 1; c.teruteru = 1; c.villager = 1;
    } else if (count === 8) {
      c.werewolf = 2; c.seer = 1; c.medium = 1; c.guard = 1; c.madman = 1; c.teruteru = 1; c.villager = 1;
    } else {
      c.werewolf = count >= 10 ? 3 : 2;
      c.seer = 1;
      c.medium = 1;
      c.guard = 1;
      c.madman = 1;
      c.teruteru = 1;
      const used = c.werewolf + c.seer + c.medium + c.guard + c.madman + c.teruteru;
      c.villager = Math.max(0, count - used);
    }
    return c;
  };

  const getTotalConfiguredRoles = () => {
    return ROLE_ORDER.reduce((sum, key) => sum + (hostRoleCounts[key] || 0), 0);
  };

  // 勝利判定（市民陣営 vs 人狼陣営）
  const checkWinner = () => {
    let aliveWolves = 0;
    let aliveHumans = 0;
    ctx.players.forEach(p => {
      if (!hostAlive[p.id]) return;
      if (hostRoles[p.id] === "werewolf") aliveWolves++;
      else aliveHumans++; // 狂人・てるてるもカウント上は人間側
    });

    if (aliveWolves === 0) return "village";
    if (aliveWolves >= aliveHumans) return "wolf";
    return null;
  };

  // 全員へ状態配信
  const syncAll = () => {
    if (!ctx || !ctx.isHost) return;

    const wolves = ctx.players.filter(p => hostRoles[p.id] === "werewolf");

    // 各プレイヤーへ秘密データを個別送信
    ctx.players.forEach(p => {
      const role = hostRoles[p.id] || null;
      let myNightTarget = null;
      if (role === "werewolf") myNightTarget = hostNightActions.attackTarget || null;
      if (role === "seer") myNightTarget = hostNightActions.seerTarget || null;
      if (role === "guard") myNightTarget = hostNightActions.guardTarget || null;

      ctx.sendToPlayer(p.id, {
        type: "WW_PRIVATE",
        role,
        fellowWolves: role === "werewolf" ? wolves.map(w => ({ id: w.id, name: w.name })) : [],
        wolfPlannedTarget: role === "werewolf" && hostNightActions.attackTarget
          ? { targetName: getPlayerName(hostNightActions.attackTarget), by: hostNightActions.wolfVoterName }
          : null,
        fortuneResults: hostFortuneLogs[p.id] || [],
        mediumResults: hostMediumLogs[p.id] || [],
        myVote: hostVotes[p.id] || null,
        myNightTarget,
        readyConfirmed: !!hostReadyMap[p.id]
      });
    });

    // 全員へ公開状態を送信
    const alivePlayers = ctx.players.filter(p => hostAlive[p.id]);
    ctx.broadcast({
      type: "WW_STATE",
      phase: hostPhase,
      roleCounts: { ...hostRoleCounts },
      day: hostDay,
      timeLeft: hostTimeLeft,
      alive: { ...hostAlive },
      readyCount: Object.keys(hostReadyMap).length,
      readyMap: { ...hostReadyMap },
      votedCount: Object.keys(hostVotes).length,
      totalAliveCount: alivePlayers.length,
      headline: hostHeadline,
      logs: hostLogs.slice(-15),
      winnerTeam: hostWinnerTeam,
      winnerName: hostWinnerName,
      revealedRoles: hostPhase === "GAME_OVER" ? { ...hostRoles } : null
    });
  };

  // セットアップ画面を開く
  const openSetupScreen = (keepCurrentCounts = false) => {
    clearHostTimer();
    hostPhase = "SETUP";
    hostRoles = {};
    hostAlive = {};
    hostWinnerTeam = null;
    hostWinnerName = "";
    hostLogs = [];
    if (!keepCurrentCounts) {
      hostRoleCounts = buildRecommendedCounts(ctx.players.length);
    }
    hostHeadline = "ホストが役職の人数配分を設定しています。";
    syncAll();
  };

  // 昼の議論タイマー開始
  const startDayDiscussion = (headlineMsg) => {
    clearHostTimer();
    hostPhase = "DAY_DISCUSS";
    hostTimeLeft = 180;
    hostVotes = {};
    hostHeadline = headlineMsg;
    hostLogs.push(`☀️ 【${hostDay}日目・昼】${headlineMsg}`);
    syncAll();

    hostTimer = setInterval(() => {
      if (!document.getElementById("ww-root") || hostPhase !== "DAY_DISCUSS") {
        clearHostTimer();
        return;
      }
      hostTimeLeft--;
      if (hostTimeLeft <= 0) {
        clearHostTimer();
        startDayVote();
      } else {
        ctx.broadcast({ type: "WW_TICK", timeLeft: hostTimeLeft });
      }
    }, 1000);
  };

  // 昼の投票フェーズ開始
  const startDayVote = () => {
    clearHostTimer();
    hostPhase = "DAY_VOTE";
    hostTimeLeft = 0;
    hostVotes = {};
    hostHeadline = "議論終了！追放したいプレイヤーに1票を投じてください。";
    hostLogs.push(`🗳️ 【${hostDay}日目・投票】追放投票が始まりました。`);
    syncAll();
  };

  // 昼の投票集計
  const resolveDayVote = () => {
    const counts = {};
    Object.values(hostVotes).forEach(targetId => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let topCandidates = [];
    Object.entries(counts).forEach(([id, c]) => {
      if (c > maxVotes) {
        maxVotes = c;
        topCandidates = [id];
      } else if (c === maxVotes) {
        topCandidates.push(id);
      }
    });

    const executedId = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    const executedName = getPlayerName(executedId);
    const executedRole = hostRoles[executedId];
    hostAlive[executedId] = false;

    const tieNote = topCandidates.length > 1 ? "（同票のためランダム決定）" : "";
    const msg = `投票の結果、${executedName} が追放されました${tieNote}。`;
    hostLogs.push(`⚖️ ${msg}`);

    // ★ 最優先：追放されたのが「てるてる」なら単独勝利！
    if (executedRole === "teruteru") {
      hostWinnerName = executedName;
      finishGame("teruteru", `追放された ${executedName} の正体は「☀️ てるてる」でした！`);
      return;
    }

    // 霊媒師に追放者の正体を記録
    const isWolf = executedRole === "werewolf";
    ctx.players.forEach(p => {
      if (hostRoles[p.id] === "medium") {
        hostMediumLogs[p.id].push({
          day: hostDay,
          targetName: executedName,
          isWolf
        });
      }
    });

    const winner = checkWinner();
    if (winner) {
      finishGame(winner, msg);
    } else {
      startNightPhase(msg);
    }
  };

  // 2日目以降の夜フェーズ開始
  const startNightPhase = (prevMsg) => {
    clearHostTimer();
    hostPhase = "NIGHT";
    hostNightActions = {
      attackTarget: null,
      wolfVoterName: "",
      seerTarget: null,
      seerDone: false,
      guardTarget: null
    };
    hostHeadline = `${prevMsg} 恐ろしい夜がやってきました（霊媒師は追放者の霊媒結果を確認できます）...`;
    hostLogs.push(`🌙 【${hostDay}日目・夜】それぞれの夜の行動を行っています...`);
    syncAll();

    checkNightCompletion(true);
  };

  // 夜アクションの完了判定
  const checkNightCompletion = (allowAutoDelay = false) => {
    const alivePlayers = ctx.players.filter(p => hostAlive[p.id]);
    const hasAliveWolf = alivePlayers.some(p => hostRoles[p.id] === "werewolf");
    const hasAliveSeer = alivePlayers.some(p => hostRoles[p.id] === "seer");
    const hasAliveGuard = alivePlayers.some(p => hostRoles[p.id] === "guard");

    const wolfDone = !hasAliveWolf || !!hostNightActions.attackTarget;
    const seerDone = !hasAliveSeer || hostNightActions.seerDone;
    const guardDone = !hasAliveGuard || !!hostNightActions.guardTarget;

    if (wolfDone && seerDone && guardDone) {
      if (allowAutoDelay) {
        setTimeout(() => {
          if (hostPhase === "NIGHT") resolveNight();
        }, 2500);
      } else {
        resolveNight();
      }
    }
  };

  // 夜明け・襲撃結果の処理
  const resolveNight = () => {
    const attackId = hostNightActions.attackTarget;
    const guardId = hostNightActions.guardTarget;
    let morningMsg = "昨晩は犠牲者がいませんでした（平和な朝です）。";

    if (attackId && hostAlive[attackId]) {
      if (attackId === guardId) {
        morningMsg = "昨晩は犠牲者がいませんでした（狩人の護衛が成功したかもしれません！）。";
      } else {
        hostAlive[attackId] = false;
        morningMsg = `朝になると、${getPlayerName(attackId)} が無残な姿で発見されました...`;
      }
    }

    const winner = checkWinner();
    if (winner) {
      hostLogs.push(`🌅 ${morningMsg}`);
      finishGame(winner, morningMsg);
    } else {
      hostDay++;
      startDayDiscussion(morningMsg);
    }
  };

  // ゲーム決着
  const finishGame = (winnerTeam, reasonMsg) => {
    clearHostTimer();
    hostPhase = "GAME_OVER";
    hostWinnerTeam = winnerTeam;

    let winTitle = "🎉 市民陣営の勝利！";
    if (winnerTeam === "wolf") winTitle = "🐺 人狼陣営の勝利！";
    if (winnerTeam === "teruteru") winTitle = `☀️ てるてる（${hostWinnerName}）の単独勝利！`;

    hostHeadline = `${reasonMsg} → ${winTitle}`;
    hostLogs.push(`🏆 【決着】${winTitle}`);
    syncAll();
  };

  // 設定された役職配分でマッチ開始
  const startMatchWithConfiguredRoles = () => {
    if (getTotalConfiguredRoles() !== ctx.players.length) return;
    if ((hostRoleCounts.werewolf || 0) < 1) return;

    clearHostTimer();
    const rawDeck = [];
    ROLE_ORDER.forEach(roleKey => {
      const n = hostRoleCounts[roleKey] || 0;
      for (let i = 0; i < n; i++) rawDeck.push(roleKey);
    });

    const deck = shuffle(rawDeck);
    hostRoles = {};
    hostAlive = {};
    hostReadyMap = {};
    hostVotes = {};
    hostFortuneLogs = {};
    hostMediumLogs = {};
    hostNightActions = { seerDone: false, seerTarget: null };
    hostDay = 1;
    hostWinnerTeam = null;
    hostWinnerName = "";
    hostLogs = [];

    ctx.players.forEach((p, idx) => {
      hostRoles[p.id] = deck[idx];
      hostAlive[p.id] = true;
      hostFortuneLogs[p.id] = [];
      hostMediumLogs[p.id] = [];
    });

    hostPhase = "FIRST_NIGHT";
    hostHeadline = "1日目の夜です。自分の役職を確認して「準備完了」を押してください（占い師は初日占いができます）。";
    hostLogs.push("🌙 【1日目・夜】役職が配布されました。初日の襲撃はありません。");
    syncAll();
  };

  // 1日目夜の完了チェック
  const checkFirstNightReady = () => {
    const allReady = ctx.players.every(p => hostReadyMap[p.id]);
    const hasSeer = ctx.players.some(p => hostRoles[p.id] === "seer");
    const seerDone = !hasSeer || hostNightActions.seerDone;

    if (allReady && seerDone) {
      startDayDiscussion("全員の準備が完了しました！議論を始めてください。");
    }
  };

  // --- ゲームプラグイン登録 ---
  registerGame({
    id: "werewolf",
    name: "🐺 人狼ゲーム",
    description: "霊媒師・てるてる・役職人数カスタム対応！市民・人狼・第三陣営が入り乱れる正体隠匿心理戦。",
    minPlayers: 4,
    maxPlayers: 12,

    init(container, context) {
      injectWerewolfStyles();
      ctx = context;
      myPrivate = null;
      publicState = null;
      initialized = true;

      container.innerHTML = `<div id="ww-root" class="ww-wrapper"><p style="text-align:center;">読み込み中...</p></div>`;

      while (earlyPackets.length > 0) {
        this.onReceiveData(earlyPackets.shift());
      }

      if (ctx.isHost) {
        openSetupScreen(false);
      }
    },

    onPlayerAction(playerId, action) {
      if (!ctx.isHost) return;

      // ホスト専用：セットアップ操作
      if (playerId === ctx.myId && hostPhase === "SETUP") {
        if (action.type === "ADJUST_ROLE_COUNT") {
          const { roleKey, delta } = action;
          if (!ROLES[roleKey]) return;
          const current = hostRoleCounts[roleKey] || 0;
          const minVal = roleKey === "werewolf" ? 1 : 0; // 人狼は最低1人
          const next = Math.max(minVal, Math.min(ctx.players.length, current + delta));
          hostRoleCounts[roleKey] = next;
          syncAll();
          return;
        }
        if (action.type === "AUTO_BALANCE_ROLES") {
          hostRoleCounts = buildRecommendedCounts(ctx.players.length);
          syncAll();
          return;
        }
        if (action.type === "START_CONFIGURED_MATCH") {
          startMatchWithConfiguredRoles();
          return;
        }
      }

      // ホスト専用：ゲーム中・終了後の進行コントロール
      if (playerId === ctx.myId) {
        if (action.type === "RESTART_SAME") {
          startMatchWithConfiguredRoles();
          return;
        }
        if (action.type === "BACK_TO_SETUP") {
          openSetupScreen(true);
          return;
        }
        if (action.type === "HOST_EXTEND_TIME" && hostPhase === "DAY_DISCUSS") {
          hostTimeLeft += 60;
          ctx.broadcast({ type: "WW_TICK", timeLeft: hostTimeLeft });
          return;
        }
        if (action.type === "HOST_FORCE_NEXT") {
          if (hostPhase === "FIRST_NIGHT") {
            startDayDiscussion("ホストの進行により1日目の昼が始まりました！");
          } else if (hostPhase === "DAY_DISCUSS") {
            startDayVote();
          } else if (hostPhase === "NIGHT") {
            resolveNight();
          }
          return;
        }
      }

      // 1. 1日目夜：役職確認完了
      if (action.type === "CONFIRM_READY" && hostPhase === "FIRST_NIGHT") {
        hostReadyMap[playerId] = true;
        syncAll();
        checkFirstNightReady();
        return;
      }

      // 生存者以外は以降のゲーム行動不可
      if (!hostAlive[playerId]) return;

      // 2. 占い師の占い（1日目夜 または 2日目以降の夜）
      if (
        action.type === "NIGHT_SEER" &&
        (hostPhase === "FIRST_NIGHT" || hostPhase === "NIGHT") &&
        hostRoles[playerId] === "seer" &&
        !hostNightActions.seerDone
      ) {
        const targetId = action.targetId;
        if (!hostAlive[targetId] || targetId === playerId) return;

        const isWolf = hostRoles[targetId] === "werewolf";
        hostNightActions.seerTarget = targetId;
        hostNightActions.seerDone = true;
        hostFortuneLogs[playerId].push({
          day: hostDay,
          targetName: getPlayerName(targetId),
          isWolf
        });
        syncAll();

        if (hostPhase === "FIRST_NIGHT") checkFirstNightReady();
        else checkNightCompletion();
        return;
      }

      // 3. 2日目以降の夜：人狼の襲撃 / 狩人の護衛
      if (hostPhase === "NIGHT") {
        const targetId = action.targetId;
        if (!hostAlive[targetId] || targetId === playerId) return;

        if (action.type === "NIGHT_WOLF" && hostRoles[playerId] === "werewolf") {
          if (hostRoles[targetId] === "werewolf") return;
          hostNightActions.attackTarget = targetId;
          hostNightActions.wolfVoterName = getPlayerName(playerId);
          syncAll();
          checkNightCompletion();
          return;
        }

        if (action.type === "NIGHT_GUARD" && hostRoles[playerId] === "guard") {
          hostNightActions.guardTarget = targetId;
          syncAll();
          checkNightCompletion();
          return;
        }
      }

      // 4. 昼の投票
      if (action.type === "DAY_VOTE" && hostPhase === "DAY_VOTE") {
        const targetId = action.targetId;
        if (!hostAlive[targetId] || targetId === playerId) return;

        hostVotes[playerId] = targetId;
        syncAll();

        const aliveCount = ctx.players.filter(p => hostAlive[p.id]).length;
        if (Object.keys(hostVotes).length >= aliveCount) {
          resolveDayVote();
        }
      }
    },

    onReceiveData(data) {
      if (!initialized) {
        earlyPackets.push(data);
        return;
      }
      if (data.type === "WW_PRIVATE") {
        myPrivate = data;
        this.render();
      } else if (data.type === "WW_STATE") {
        publicState = data;
        this.render();
      } else if (data.type === "WW_TICK") {
        if (publicState) publicState.timeLeft = data.timeLeft;
        const timerEl = document.getElementById("ww-timer-display");
        if (timerEl) {
          timerEl.textContent = `残り ${data.timeLeft}秒`;
        }
      }
    },

    render() {
      const root = document.getElementById("ww-root");
      if (!root || !publicState) return;

      const phase = publicState.phase;
      // Firebaseで空オブジェクト/空配列が省略された場合に備えた安全なフォールバック
      const aliveMap = publicState.alive || {};
      const readyMap = publicState.readyMap || {};
      const logsList = publicState.logs || [];

      // ==========================================
      // 画面A：役職配分カスタム設定画面（SETUP）
      // ==========================================
      if (phase === "SETUP") {
        const counts = publicState.roleCounts || {};
        const totalConfigured = ROLE_ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
        const playerTotal = ctx.players.length;
        const diff = playerTotal - totalConfigured;
        const isValid = diff === 0 && (counts.werewolf || 0) >= 1;

        const rowsHtml = ROLE_ORDER.map(key => {
          const r = ROLES[key];
          const val = counts[key] || 0;
          return `
            <div class="ww-setup-row">
              <div class="ww-setup-info">
                <strong>${r.name}</strong>
                <span class="ww-setup-team">${r.teamLabel}</span>
              </div>
              <div class="ww-setup-ctrl">
                ${ctx.isHost ? `
                  <button class="ww-count-btn" data-role="${key}" data-delta="-1">－</button>
                  <span class="ww-count-val">${val}</span>
                  <button class="ww-count-btn" data-role="${key}" data-delta="1">＋</button>
                ` : `
                  <span class="ww-count-val">${val} 人</span>
                `}
              </div>
            </div>
          `;
        }).join("");

        root.innerHTML = `
          <div class="ww-header-bar">
            <span class="ww-phase-badge ww-phase-setup">⚙️ 役職配分のカスタム設定</span>
            <span style="font-size:0.9rem; color:#94a3b8;">参加プレイヤー: ${playerTotal}人</span>
          </div>

          <div class="ww-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <h3>各役職の人数</h3>
              ${ctx.isHost ? `<button id="ww-auto-balance-btn" class="btn small secondary">参加人数に合わせて自動調整</button>` : ""}
            </div>

            <div class="ww-setup-list">${rowsHtml}</div>

            <div class="ww-setup-summary" style="border: 1px solid ${isValid ? "#10b981" : "#ef4444"};">
              <span>設定合計: ${totalConfigured} / ${playerTotal} 人</span>
              <span style="color:${isValid ? "#34d399" : "#f87171"};">
                ${isValid
                  ? "✅ 開始できます！"
                  : diff > 0
                    ? `あと ${diff} 人増やしてください`
                    : `${Math.abs(diff)} 人オーバーしています`}
              </span>
            </div>

            ${ctx.isHost ? `
              <button id="ww-start-match-btn" class="btn primary" ${isValid ? "" : "disabled"} style="${isValid ? "" : "opacity:0.5; cursor:not-allowed;"}">
                この配分でゲーム開始！
              </button>
            ` : `
              <p class="waiting-msg">ホストが役職配分を決定してゲームを開始するのを待っています...</p>
            `}
          </div>
        `;

        if (ctx.isHost) {
          root.querySelectorAll(".ww-count-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              ctx.sendAction({
                type: "ADJUST_ROLE_COUNT",
                roleKey: btn.dataset.role,
                delta: Number(btn.dataset.delta)
              });
            });
          });

          const autoBtn = document.getElementById("ww-auto-balance-btn");
          if (autoBtn) {
            autoBtn.addEventListener("click", () => {
              ctx.sendAction({ type: "AUTO_BALANCE_ROLES" });
            });
          }

          const startBtn = document.getElementById("ww-start-match-btn");
          if (startBtn && isValid) {
            startBtn.addEventListener("click", () => {
              ctx.sendAction({ type: "START_CONFIGURED_MATCH" });
            });
          }
        }
        return;
      }

      // ==========================================
      // 画面B：ゲーム進行画面（夜・昼・投票・決着）
      // ==========================================
      if (!myPrivate) return;

      const roleInfo = ROLES[myPrivate.role] || ROLES.villager;
      const amIAlive = !!aliveMap[ctx.myId];
      const fellowWolves = myPrivate.fellowWolves || [];
      const fortuneResults = myPrivate.fortuneResults || [];
      const mediumResults = myPrivate.mediumResults || [];

      // フェーズバッジ表示
      let phaseText = "";
      let phaseClass = "ww-phase-night";
      if (phase === "FIRST_NIGHT") {
        phaseText = "🌙 1日目・夜（役職確認）";
      } else if (phase === "DAY_DISCUSS") {
        phaseText = `☀️ ${publicState.day}日目・昼（議論中）`;
        phaseClass = "ww-phase-day";
      } else if (phase === "DAY_VOTE") {
        phaseText = `🗳️ ${publicState.day}日目・昼（追放投票）`;
        phaseClass = "ww-phase-vote";
      } else if (phase === "NIGHT") {
        phaseText = `🌙 ${publicState.day}日目・夜（夜の行動）`;
      } else if (phase === "GAME_OVER") {
        if (publicState.winnerTeam === "village") {
          phaseText = "🎉 市民陣営の勝利！";
          phaseClass = "ww-phase-over";
        } else if (publicState.winnerTeam === "wolf") {
          phaseText = "🐺 人狼陣営の勝利！";
          phaseClass = "ww-phase-over";
        } else {
          phaseText = `☀️ てるてる（${esc(publicState.winnerName)}）の単独勝利！`;
          phaseClass = "ww-phase-teru";
        }
      }

      // 自分の役職カード内の秘密情報（仲間・占い結果・霊媒結果）
      let secretHtml = "";
      if (myPrivate.role === "werewolf" && fellowWolves.length > 1) {
        const names = fellowWolves.map(w => esc(w.name)).join("、");
        secretHtml += `<div>🤝 人狼の仲間: <strong>${names}</strong></div>`;
      }
      if (myPrivate.role === "werewolf" && phase === "NIGHT" && myPrivate.wolfPlannedTarget) {
        secretHtml += `<div style="color:#fca5a5;">🎯 現在の襲撃予定: <strong>${esc(myPrivate.wolfPlannedTarget.targetName)}</strong>（選択: ${esc(myPrivate.wolfPlannedTarget.by)}）</div>`;
      }
      if (myPrivate.role === "seer" && fortuneResults.length > 0) {
        const items = fortuneResults.map(r =>
          `<li>${r.day}日目夜: <strong>${esc(r.targetName)}</strong> → <span style="color:${r.isWolf ? "#f87171" : "#38bdf8"}; font-weight:bold;">${r.isWolf ? "🐺 人狼！" : "🧑 人間（人狼ではない）"}</span></li>`
        ).join("");
        secretHtml += `<div>🔮 占い結果履歴:<ul style="margin-left:18px; margin-top:4px;">${items}</ul></div>`;
      }
      if (myPrivate.role === "medium") {
        if (mediumResults.length > 0) {
          const items = mediumResults.map(r =>
            `<li>${r.day}日目追放: <strong>${esc(r.targetName)}</strong> → <span style="color:${r.isWolf ? "#f87171" : "#38bdf8"}; font-weight:bold;">${r.isWolf ? "🐺 人狼だった！" : "🧑 人間だった（人狼ではない）"}</span></li>`
          ).join("");
          secretHtml += `<div>🕯️ 霊媒結果履歴:<ul style="margin-left:18px; margin-top:4px;">${items}</ul></div>`;
        } else {
          secretHtml += `<div style="color:#94a3b8;">🕯️ 霊媒結果: まだ追放されたプレイヤーがいません。</div>`;
        }
      }

      // アクションパネル
      let actionPanelHtml = "";

      if (phase === "FIRST_NIGHT") {
        const needSeer = myPrivate.role === "seer" && !myPrivate.myNightTarget;
        actionPanelHtml = `
          <div class="ww-panel">
            <h3>1日目・夜の準備</h3>
            ${needSeer ? `<p style="color:#d8b4fe; margin-bottom:8px;">🔮 占い師は下のプレイヤー一覧から初日に占う相手を1人選んでください。</p>` : ""}
            ${!myPrivate.readyConfirmed ? `
              <button id="ww-ready-btn" class="btn primary">役職を確認した（準備完了）</button>
            ` : `
              <p style="color:#34d399; font-weight:bold;">✅ 準備完了！他のプレイヤーの確認を待っています（${publicState.readyCount || 0}/${ctx.players.length}人）</p>
            `}
          </div>
        `;
      } else if (phase === "DAY_DISCUSS") {
        actionPanelHtml = `
          <div class="ww-panel">
            <h3>☀️ 昼の議論タイム</h3>
            <p style="font-size:0.9rem; color:#cbd5e1;">
              下のチャット欄や通話で話し合い、人狼を見つけ出しましょう。時間切れまたはホストの操作で投票へ進みます。
            </p>
            ${!amIAlive ? `<p style="color:#f87171; font-size:0.85rem; margin-top:6px;">※あなたはすでに追放・襲撃されています。決着がつくまで発言やヒント出しは控えてください。</p>` : ""}
          </div>
        `;
      } else if (phase === "DAY_VOTE") {
        actionPanelHtml = `
          <div class="ww-panel">
            <h3>🗳️ 追放投票（投票済み: ${publicState.votedCount || 0}/${publicState.totalAliveCount || 0}人）</h3>
            <p style="font-size:0.9rem; color:#cbd5e1;">
              ${!amIAlive
                ? "追放・襲撃されたプレイヤーは投票できません。"
                : myPrivate.myVote
                  ? `✅ <strong>${esc(getPlayerName(myPrivate.myVote))}</strong> に投票しました。全員の投票完了を待っています...`
                  : "下のプレイヤー一覧から、追放したい人を1人選んで投票してください。"}
            </p>
          </div>
        `;
      } else if (phase === "NIGHT") {
        let nightGuide = "朝が来るのを静かに待っています...";
        if (!amIAlive) {
          nightGuide = "あなたはすでにゲームから脱落しています。決着までお待ちください。";
        } else if (myPrivate.role === "werewolf") {
          nightGuide = myPrivate.myNightTarget
            ? `✅ 今晩は <strong>${esc(getPlayerName(myPrivate.myNightTarget))}</strong> を襲撃します（他役職の完了待ち...）`
            : "🐺 下の一覧から、今晩襲撃する人間を1人選んでください。";
        } else if (myPrivate.role === "seer") {
          nightGuide = myPrivate.myNightTarget
            ? `✅ 今晩の占いは完了しました（他役職の完了待ち...）`
            : "🔮 下の一覧から、今晩占う相手を1人選んでください。";
        } else if (myPrivate.role === "guard") {
          nightGuide = myPrivate.myNightTarget
            ? `✅ 今晩は <strong>${esc(getPlayerName(myPrivate.myNightTarget))}</strong> を護衛します（他役職の完了待ち...）`
            : "🛡️ 下の一覧から、今晩人狼の襲撃から守る相手を1人選んでください。";
        } else if (myPrivate.role === "medium") {
          nightGuide = "🕯️ 上の役職カードで追放者の霊媒結果を確認しつつ、朝が来るのをお待ちください。";
        }
        actionPanelHtml = `
          <div class="ww-panel">
            <h3>🌙 夜の時間</h3>
            <p style="font-size:0.95rem; color:#e0e7ff;">${nightGuide}</p>
          </div>
        `;
      } else if (phase === "GAME_OVER") {
        let winHeadline = "🎉 市民陣営の勝利です！";
        let winColor = "#34d399";
        if (publicState.winnerTeam === "wolf") {
          winHeadline = "🐺 人狼陣営の勝利です！";
          winColor = "#f87171";
        } else if (publicState.winnerTeam === "teruteru") {
          winHeadline = `☀️ てるてる（${esc(publicState.winnerName)}）の単独勝利です！`;
          winColor = "#facc15";
        }

        actionPanelHtml = `
          <div class="ww-panel" style="text-align:center;">
            <h3 style="font-size:1.3rem; color:${winColor}; margin-bottom:12px;">${winHeadline}</h3>
            ${ctx.isHost ? `
              <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button id="ww-restart-same-btn" class="btn primary" style="width:auto; padding:10px 20px;">同じ配分で再戦する</button>
                <button id="ww-back-setup-btn" class="btn secondary" style="width:auto; padding:10px 20px;">役職配分を変更する</button>
              </div>
            ` : `
              <p style="color:#94a3b8;">ホストが次のゲームを準備するのを待っています...</p>
            `}
          </div>
        `;
      }

      // プレイヤーカード一覧
      const playerCardsHtml = ctx.players.map(p => {
        const isAlive = !!aliveMap[p.id];
        const isMe = p.id === ctx.myId;
        const isWolfMate = myPrivate.role === "werewolf" && fellowWolves.some(w => w.id === p.id);

        let actionBtnHtml = "";
        if (amIAlive && isAlive && !isMe) {
          if (phase === "DAY_VOTE" && !myPrivate.myVote) {
            actionBtnHtml = `<button class="btn danger small ww-target-btn" data-action="DAY_VOTE" data-target="${p.id}">追放投票</button>`;
          } else if ((phase === "FIRST_NIGHT" || phase === "NIGHT") && myPrivate.role === "seer" && !myPrivate.myNightTarget) {
            actionBtnHtml = `<button class="btn primary small ww-target-btn" data-action="NIGHT_SEER" data-target="${p.id}">🔮 占う</button>`;
          } else if (phase === "NIGHT" && myPrivate.role === "werewolf" && !isWolfMate) {
            const isSelected = myPrivate.myNightTarget === p.id;
            actionBtnHtml = `<button class="btn danger small ww-target-btn" data-action="NIGHT_WOLF" data-target="${p.id}">${isSelected ? "襲撃選択中" : "🐺 襲撃する"}</button>`;
          } else if (phase === "NIGHT" && myPrivate.role === "guard" && !myPrivate.myNightTarget) {
            actionBtnHtml = `<button class="btn secondary small ww-target-btn" data-action="NIGHT_GUARD" data-target="${p.id}">🛡️ 護衛する</button>`;
          }
        }

        let revealedTag = "";
        if (phase === "GAME_OVER" && publicState.revealedRoles) {
          const rObj = ROLES[publicState.revealedRoles[p.id]];
          if (rObj) {
            revealedTag = `<div style="font-size:0.85rem; color:#38bdf8; font-weight:bold;">正体: ${rObj.name}</div>`;
          }
        }

        const readyTag = (phase === "FIRST_NIGHT" && readyMap[p.id])
          ? `<span class="ww-status-tag ready">準備OK</span>`
          : "";

        return `
          <div class="ww-player-card ${isAlive ? "" : "dead"} ${(myPrivate.myVote === p.id || myPrivate.myNightTarget === p.id) ? "selected" : ""}">
            <div class="ww-player-name">
              <span>${esc(p.name)} ${isMe ? "(自分)" : ""}</span>
              ${isAlive
                ? (readyTag || `<span class="ww-status-tag">生存</span>`)
                : `<span class="ww-status-tag dead">追放/脱落</span>`}
            </div>
            ${revealedTag}
            ${actionBtnHtml}
          </div>
        `;
      }).join("");

      // ホスト専用進行補助バー
      const hostControlsHtml = (ctx.isHost && phase !== "GAME_OVER") ? `
        <div class="ww-host-bar">
          ${phase === "DAY_DISCUSS" ? `<button id="ww-extend-btn" class="btn small secondary">議論時間を +60秒 延長</button>` : ""}
          <button id="ww-force-next-btn" class="btn small">
            ${phase === "DAY_DISCUSS" ? "議論を打ち切って投票へ進む" : "次のフェーズへ強制進行"}
          </button>
          <button id="ww-abort-setup-btn" class="btn small danger">配分設定へ戻る</button>
        </div>
      ` : "";

      root.innerHTML = `
        <!-- 上部フェーズ＆タイマー -->
        <div class="ww-header-bar">
          <span class="ww-phase-badge ${phaseClass}">${phaseText}</span>
          ${phase === "DAY_DISCUSS"
            ? `<span id="ww-timer-display" class="ww-timer">残り ${publicState.timeLeft}秒</span>`
            : `<span style="font-size:0.9rem; color:#94a3b8;">生存者: ${publicState.totalAliveCount || 0} / ${ctx.players.length}人</span>`}
        </div>

        <!-- 自分の役職カード -->
        <div class="ww-role-card ${roleInfo.css}">
          <div class="ww-role-title">あなたの役職: ${roleInfo.name}（${roleInfo.teamLabel}） ${amIAlive ? "" : "※脱落中"}</div>
          <div class="ww-role-desc">${roleInfo.desc}</div>
          ${secretHtml ? `<div class="ww-secret-box">${secretHtml}</div>` : ""}
        </div>

        <!-- 現在の状況アナウンス -->
        <div class="ww-announce">${esc(publicState.headline || "")}</div>

        <!-- フェーズごとのアクションパネル -->
        ${actionPanelHtml}

        <!-- プレイヤー一覧 -->
        <div class="ww-panel">
          <h3>プレイヤー一覧</h3>
          <div class="ww-player-grid">${playerCardsHtml}</div>
          ${hostControlsHtml}
        </div>

        <!-- 進行ログ -->
        <div class="ww-panel">
          <h3>📜 進行ログ</h3>
          <ul class="ww-log-list">
            ${logsList.map(l => `<li>${esc(l)}</li>`).join("")}
          </ul>
        </div>
      `;

      // --- イベントリスナー登録 ---
      const readyBtn = document.getElementById("ww-ready-btn");
      if (readyBtn) {
        readyBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "CONFIRM_READY" });
        });
      }

      root.querySelectorAll(".ww-target-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          ctx.sendAction({ type: btn.dataset.action, targetId: btn.dataset.target });
        });
      });

      const extendBtn = document.getElementById("ww-extend-btn");
      if (extendBtn) {
        extendBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "HOST_EXTEND_TIME" });
        });
      }

      const forceNextBtn = document.getElementById("ww-force-next-btn");
      if (forceNextBtn) {
        forceNextBtn.addEventListener("click", () => {
          if (confirm("現在のフェーズを終了して次へ進めますか？")) {
            ctx.sendAction({ type: "HOST_FORCE_NEXT" });
          }
        });
      }

      const abortSetupBtn = document.getElementById("ww-abort-setup-btn");
      if (abortSetupBtn) {
        abortSetupBtn.addEventListener("click", () => {
          if (confirm("現在のゲームを中断して役職配分画面へ戻りますか？")) {
            ctx.sendAction({ type: "BACK_TO_SETUP" });
          }
        });
      }

      const restartSameBtn = document.getElementById("ww-restart-same-btn");
      if (restartSameBtn) {
        restartSameBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "RESTART_SAME" });
        });
      }

      const backSetupBtn = document.getElementById("ww-back-setup-btn");
      if (backSetupBtn) {
        backSetupBtn.addEventListener("click", () => {
          ctx.sendAction({ type: "BACK_TO_SETUP" });
        });
      }
    }
  });
})();
