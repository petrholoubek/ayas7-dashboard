// assets/chip-core.js
// AYAS-7 CHIP CORE · plná simulace velínu (AI, Manual, Pool, DB, Multi-Sig, Chain, Engine, Throughput, Log)

(function () {
  'use strict';

  // --- Helpery --------------------------------------------------------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => n.toLocaleString('cs-CZ');

  function setFill(el, pct) {
    if (!el) return;
    pct = Math.max(0, Math.min(100, pct));
    el.style.width = pct + '%';

    if (pct >= 90) {
      el.style.background = 'linear-gradient(90deg,#ff6b6b,#ff8a65)';
    } else if (pct >= 75) {
      el.style.background = 'linear-gradient(90deg,#f6d365,#ff8a65)';
    } else {
      el.style.background = 'linear-gradient(90deg,var(--accent-blue),var(--accent-green-soft))';
    }

    const glow = Math.min(1.0, pct / 100);
    el.style.boxShadow = `0 6px ${18 * glow}px rgba(79,163,255,${0.06 + glow * 0.12})`;
  }

  function setMsLight(el, pct) {
    if (!el) return;
    el.classList.remove('ms-green', 'ms-yellow', 'ms-red');
    if (pct >= 0.75) el.classList.add('ms-green');
    else if (pct >= 0.4) el.classList.add('ms-yellow');
    else el.classList.add('ms-red');
  }

  // --- Počáteční stav „čipu“ -----------------------------------------
  const state = {
    aiOn: true,
    aiRuntime: 0.74, // 74 %
    aiInterventions: 12,
    manual: false,
    brake: false,
    pool: { tvl: 1248332, change: 0.015, yield: 4.8 },
    db: { latency: 14, writes: 120, integrity: 100, last: '2025-11-27' },
    ms: { required: 5, submitted: 3, timelock: '2h' },
    chain: { block: 23231241, rpc: 3.12, sync: 0.98 },
    layers: [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82],
    throughput: { ops: 1232, queue: 24, through: '320 MB/s' },
    logs: []
  };

  // --- Mapování na DOM prvky -----------------------------------------
  const elements = {
    aiFill: $('#aiFill'),
    aiPercent: $('#aiPercent'),
    aiInterventions: $('#aiInterventions'),
    aiLast: $('#aiLast'),
    ledAi: $('#ledAi'),
    toggleAiLabel: $('#toggleAiLabel'),
    aiMode: $('#aiMode'),
    aiMs: $('#aiMs'),

    manualFill: $('#manualFill'),
    manualActive: $('#manualActive'),
    brakeState: $('#brakeState'),
    safeMode: $('#safeMode'),
    manualMs: $('#manualMs'),

    poolFill: $('#poolFill'),
    tvl: $('#tvl'),
    tvlChange: $('#tvlChange'),
    simYield: $('#simYield'),
    poolMs: $('#poolMs'),
    poolLast: $('#poolLast'),

    dbFill: $('#dbFill'),
    dbLatency: $('#dbLatency'),
    dbWrites: $('#dbWrites'),
    dbIntegrity: $('#dbIntegrity'),
    dbLast: $('#dbLast'),
    dbMs: $('#dbMs'),

    msFill: $('#msFill'),
    msRequired: $('#msRequired'),
    msSubmitted: $('#msSubmitted'),
    msTimelock: $('#msTimelock'),
    msLast: $('#msLast'),
    msLight: $('#msLight'),

    chainFill: $('#chainFill'),
    blockHeight: $('#blockHeight'),
    rpcLatency: $('#rpcLatency'),
    syncPerc: $('#syncPerc'),
    chainMs: $('#chainMs'),

    L: [$('#L1'), $('#L2'), $('#L3'), $('#L4'), $('#L5'), $('#L6'), $('#L7')],
    Lpct: [$('#L1pct'), $('#L2pct'), $('#L3pct'), $('#L4pct'), $('#L5pct'), $('#L6pct'), $('#L7pct')],
    engineMode: $('#engineMode'),
    engineMs: $('#engineMs'),

    tpFill: $('#tpFill'),
    ops: $('#ops'),
    queue: $('#queue'),
    through: $('#through'),
    tpMs: $('#tpMs'),

    logBox: $('#logBox'),
    logStatus: $('#logStatus'),
    cardsGrid: $('#cardsGrid')
  };

  // --- Logování -------------------------------------------------------
  function pushLog(msg) {
    const ts = new Date().toLocaleTimeString();
    state.logs.push({ ts, msg });
    if (state.logs.length > 300) state.logs.shift();
    renderLogs();
  }

  function renderLogs() {
    if (!elements.logBox) return;
    elements.logBox.innerHTML = '';
    state.logs
      .slice()
      .reverse()
      .forEach((l) => {
        const d = document.createElement('div');
        d.className = 'log-item';
        d.textContent = `${l.ts} · ${l.msg}`;
        elements.logBox.appendChild(d);
      });
    if (elements.logStatus) elements.logStatus.textContent = 'connected';
  }

  // --- Hlavní render podle stavu čipu --------------------------------
  function render() {
    // AI
    if (elements.aiFill) {
      const targetAiPct = Math.round(state.aiRuntime * 100);
      elements.aiFill.dataset.target = targetAiPct;
      setFill(elements.aiFill, targetAiPct);
      if (elements.aiPercent) elements.aiPercent.textContent = targetAiPct + ' %';
      if (elements.aiInterventions) elements.aiInterventions.textContent = state.aiInterventions;
      if (elements.aiLast) elements.aiLast.textContent = 'a few sec';
      if (elements.ledAi) elements.ledAi.style.background = state.aiOn ? 'var(--accent-green)' : '#ff6b6b';
      if (elements.toggleAiLabel) elements.toggleAiLabel.textContent = state.aiOn ? 'AI ON' : 'AI OFF';
      if (elements.aiMode)
        elements.aiMode.textContent = state.aiOn ? 'AUTO' : state.manual ? 'MANUAL' : 'OFF';
      setMsLight(elements.aiMs, state.aiRuntime);
    }

    // Manual / Brake
    if (elements.manualFill) {
      setFill(elements.manualFill, state.manual ? 80 : 30);
      if (elements.manualActive) elements.manualActive.textContent = state.manual ? 'ON' : 'OFF';
      if (elements.brakeState) elements.brakeState.textContent = state.brake ? 'ARMED' : 'DISARMED';
      if (elements.safeMode) elements.safeMode.textContent = state.brake ? 'SAFE' : 'OK';
      setMsLight(elements.manualMs, state.manual ? 0.8 : 0.4);
    }

    // Pool
    if (elements.poolFill) {
      const poolPct = Math.min(100, Math.max(0, (state.pool.change + 0.05) * 100));
      setFill(elements.poolFill, poolPct);
      if (elements.tvl) elements.tvl.textContent = fmt(state.pool.tvl);
      if (elements.tvlChange)
        elements.tvlChange.textContent =
          (state.pool.change >= 0 ? '+' : '') + (state.pool.change * 100).toFixed(2) + '%';
      if (elements.simYield) elements.simYield.textContent = state.pool.yield.toFixed(1) + '%';
      setMsLight(elements.poolMs, 0.8);
    }

    // DB
    if (elements.dbFill) {
      const dbPct = Math.max(0, Math.min(100, 100 - state.db.latency));
      setFill(elements.dbFill, dbPct);
      if (elements.dbLatency) elements.dbLatency.textContent = state.db.latency + ' ms';
      if (elements.dbWrites) elements.dbWrites.textContent = state.db.writes;
      if (elements.dbIntegrity) elements.dbIntegrity.textContent = state.db.integrity + '%';
      if (elements.dbLast) elements.dbLast.textContent = state.db.last;
      setMsLight(elements.dbMs, state.db.integrity / 100);
    }

    // Multi-Sig
    if (elements.msFill) {
      const msPct = state.ms.submitted / Math.max(1, state.ms.required);
      setFill(elements.msFill, Math.round(msPct * 100));
      if (elements.msRequired) elements.msRequired.textContent = state.ms.required;
      if (elements.msSubmitted) elements.msSubmitted.textContent = state.ms.submitted;
      if (elements.msTimelock) elements.msTimelock.textContent = state.ms.timelock;
      if (elements.msLast) elements.msLast.textContent = '2h ago';
      setMsLight(elements.msLight, msPct);
    }

    // Chain
    if (elements.chainFill) {
      setFill(elements.chainFill, Math.round(state.chain.sync * 100));
      if (elements.blockHeight) elements.blockHeight.textContent = '#' + fmt(state.chain.block);
      if (elements.rpcLatency) elements.rpcLatency.textContent = state.chain.rpc.toFixed(2) + ' s';
      if (elements.syncPerc)
        elements.syncPerc.textContent = Math.round(state.chain.sync * 100) + '%';
      setMsLight(elements.chainMs, state.chain.sync);
    }

    // Engine layers
    if (elements.L) {
      state.layers.forEach((val, i) => {
        const bar = elements.L[i];
        const label = elements.Lpct[i];
        if (!bar || !label) return;
        const pct = Math.round(val * 100);
        setFill(bar, pct);
        label.textContent = pct + '%';
        const pulse = 1 + (Math.sin(Date.now() / 300 + i) * 0.002 * (pct / 20));
        bar.style.transform = `scaleY(${pulse})`;
      });
    }

    // Throughput
    if (elements.tpFill) {
      setFill(elements.tpFill, Math.min(100, (state.throughput.ops / 2000) * 100));
      if (elements.ops) elements.ops.textContent = fmt(state.throughput.ops);
      if (elements.queue) elements.queue.textContent = state.throughput.queue;
      if (elements.through) elements.through.textContent = state.throughput.through;
      setMsLight(elements.tpMs, 0.85);
    }
  }

  // --- Simulační tick -------------------------------------------------
  function tick() {
    // AI random walk
    state.aiRuntime = Math.max(
      0.25,
      Math.min(0.99, state.aiRuntime + (Math.random() - 0.5) * 0.02)
    );
    if (Math.random() > 0.88) state.aiInterventions += 1;

    // Pool
    state.pool.tvl = Math.max(
      300000,
      state.pool.tvl + Math.round((Math.random() - 0.45) * 12000)
    );
    state.pool.change = Math.max(
      -0.05,
      Math.min(0.1, state.pool.change + (Math.random() - 0.5) * 0.0025)
    );

    // Chain
    state.chain.block += Math.round(Math.random() * 4);
    state.chain.sync = Math.max(
      0.7,
      Math.min(1, state.chain.sync + (Math.random() - 0.5) * 0.012)
    );
    state.chain.rpc = Math.max(
      0.8,
      Math.min(8, state.chain.rpc + (Math.random() - 0.5) * 0.12)
    );

    // DB
    state.db.latency = Math.max(
      5,
      Math.min(300, Math.round(state.db.latency + (Math.random() - 0.5) * 6))
    );
    state.db.writes = Math.max(
      10,
      state.db.writes + Math.round((Math.random() - 0.5) * 8)
    );

    // Multi-Sig
    if (Math.random() > 0.86) {
      state.ms.submitted = Math.max(
        0,
        Math.min(state.ms.required, state.ms.submitted + 1)
      );
    }

    // Layers
    state.layers = state.layers.map((l) =>
      Math.max(0.02, Math.min(1, l + (Math.random() - 0.5) * 0.045))
    );

    // Throughput
    state.throughput.ops = Math.max(
      120,
      Math.min(5000, state.throughput.ops + Math.round((Math.random() - 0.5) * 140))
    );
    state.throughput.queue = Math.max(
      1,
      state.throughput.queue + Math.round((Math.random() - 0.3) * 6)
    );

    // Občasné logy
    if (Math.random() < 0.2) {
      const ev = [
        'AI decision made (sim)',
        'Pool rebalanced (sim)',
        'Multisig signature received',
        'DB checkpoint created',
        'RPC latency spike detected',
        'Telemetry snapshot saved',
        'Manual override performed',
        'Emergency brake checked (sim)'
      ];
      pushLog(ev[Math.floor(Math.random() * ev.length)]);
    }

    render();
  }

  // --- Interakce (tlačítka) ------------------------------------------
  function bindInteractions() {
    const toggleAI = $('#toggleAI');
    const btnManual = $('#btnManual');
    const btnBrake = $('#btnBrake');
    const btnSafe = $('#btnSafe');
    const runRebalance = $('#runRebalance');
    const viewPools = $('#viewPools');
    const dbReindex = $('#dbReindex');
    const exportAudit = $('#exportAudit');
    const openMs = $('#openMs');
    const downloadAudit = $('#downloadAudit');
    const refreshChain = $('#refreshChain');
    const openExplorer = $('#openExplorer');
    const engineSim = $('#engineSim');
    const engineReset = $('#engineReset');
    const scaleUp = $('#scaleUp');
    const scaleDown = $('#scaleDown');
    const clearLogs = $('#clearLogs');
    const exportLogs = $('#exportLogs');

    if (toggleAI) {
      toggleAI.addEventListener('click', (e) => {
        e.preventDefault();
        state.aiOn = !state.aiOn;
        if (!state.aiOn) state.manual = true;
        pushLog(state.aiOn ? 'AI enabled by admin' : 'AI disabled - manual mode');
        render();
      });
    }

    if (btnManual) {
      btnManual.addEventListener('click', (e) => {
        e.preventDefault();
        state.manual = !state.manual;
        pushLog(state.manual ? 'Manual mode activated' : 'Manual mode deactivated');
        render();
      });
    }

    if (btnBrake) {
      btnBrake.addEventListener('click', (e) => {
        e.preventDefault();
        const ok = prompt('Emergency Brake — napište EMERGENCY pro potvrzení:');
        if (ok !== 'EMERGENCY') {
          alert('Zrušeno');
          pushLog('Brake cancelled');
          return;
        }
        state.brake = true;
        state.manual = true;
        state.layers = state.layers.map(() => 0.02);
        state.aiRuntime = 0.02;
        state.aiOn = false;
        pushLog('EMERGENCY BRAKE activated - safe mode');
        render();
      });
    }

    if (btnSafe) {
      btnSafe.addEventListener('click', (e) => {
        e.preventDefault();
        state.brake = false;
        pushLog('Safe mode toggled');
        render();
      });
    }

    if (runRebalance) {
      runRebalance.addEventListener('click', (e) => {
        e.preventDefault();
        state.pool.change = Math.min(0.12, state.pool.change + 0.01);
        state.pool.tvl += Math.round(12000 + Math.random() * 8000);
        pushLog('Rebalance executed (sim)');
        render();
      });
    }

    if (viewPools) {
      viewPools.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Pools viewed (sim)');
        alert('Pools view (demo)');
      });
    }

    if (dbReindex) {
      dbReindex.addEventListener('click', (e) => {
        e.preventDefault();
        state.db.latency += 5;
        pushLog('Reindex triggered (sim)');
        render();
      });
    }

    if (exportAudit) {
      exportAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Audit export requested');
        alert('Audit export (demo)');
      });
    }

    if (openMs) {
      openMs.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Multi-sig opened (sim)');
        alert('Multi-sig (demo)');
      });
    }

    if (downloadAudit) {
      downloadAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Audit downloaded (sim)');
        alert('Audit (demo)');
      });
    }

    if (refreshChain) {
      refreshChain.addEventListener('click', (e) => {
        e.preventDefault();
        state.chain.block += 1;
        pushLog('Chain refreshed (sim)');
        render();
      });
    }

    if (openExplorer) {
      openExplorer.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Explorer opened (sim)');
        alert('Explorer (demo)');
      });
    }

    if (engineSim) {
      engineSim.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = state.layers.map((v) => Math.min(1, v + 0.05));
        pushLog('Engine simulation step');
        render();
      });
    }

    if (engineReset) {
      engineReset.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82];
        pushLog('Engine reset');
        render();
      });
    }

    if (scaleUp) {
      scaleUp.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops += 200;
        pushLog('Scale up requested');
        render();
      });
    }

    if (scaleDown) {
      scaleDown.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops = Math.max(200, state.throughput.ops - 200);
        pushLog('Scale down requested');
        render();
      });
    }

    if (clearLogs) {
      clearLogs.addEventListener('click', (e) => {
        e.preventDefault();
        state.logs = [];
        renderLogs();
        pushLog('Logs cleared');
      });
    }

    if (exportLogs) {
      exportLogs.addEventListener('click', (e) => {
        e.preventDefault();
        const txt = state.logs.map((l) => `${l.ts} - ${l.msg}`).join('\n');
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ayas7_logs.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        pushLog('Logs exported');
      });
    }

    // Expand karty (… tlačítko)
    $$('.expand-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        card.classList.toggle('expanded');
        if (card.classList.contains('expanded')) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Hover efekt
    $$('.card').forEach((c) => {
      c.addEventListener(
        'mouseenter',
        () => (c.style.boxShadow = '0 30px 80px rgba(2,6,23,0.95)')
      );
      c.addEventListener(
        'mouseleave',
        () => (c.style.boxShadow = '0 18px 40px rgba(2,6,23,0.7)')
      );
    });

    // Klávesové zkratky
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' && btnManual) btnManual.click();
      if (e.key === 'a' && toggleAI) toggleAI.click();
      if (e.key === 'b' && btnBrake) btnBrake.click();
    });
  }

  // --- Inicializace po načtení ---------------------------------------
  function initChipCore() {
    pushLog('AYAS-7 Chip Core initialized');
    pushLog('Telemetry link established (demo)');
    pushLog('Simulations active');

    bindInteractions();
    render();

    const loopInterval = 280;
    setInterval(tick, loopInterval);
  }

  // Pokud je DOM ready, spustíme init hned
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChipCore);
  } else {
    initChipCore();
  }

  // Export pro debug (do konzole)
  window.AYAS7ChipCore = {
    state,
    tick,
    render,
    pushLog
  };
})();
