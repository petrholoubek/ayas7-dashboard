// assets/chip-core.js
// AYAS-7 · CHIP CORE · Intelligent Simulation Engine (E1)

(function () {
  'use strict';

  /* ========== HELPERY ========== */

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => n.toLocaleString('cs-CZ');

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // lineární přiblížení (plynulé chování)
  const lerp = (from, to, k) => from + (to - from) * k;

  function setFill(el, pct) {
    if (!el) return;
    pct = clamp(pct, 0, 100);
    el.style.width = pct + '%';

    if (pct >= 90) {
      el.style.background = 'linear-gradient(90deg,#ff6b6b,#ff8a65)';
    } else if (pct >= 75) {
      el.style.background = 'linear-gradient(90deg,#f6d365,#ff8a65)';
    } else {
      el.style.background = 'linear-gradient(90deg,var(--accent-blue),var(--accent-green-soft))';
    }

    const glow = Math.min(1.0, pct / 100);
    el.style.boxShadow = `0 6px ${18 * glow}px rgba(79,163,255,${0.08 + glow * 0.14})`;
  }

  function setMsLight(el, pct) {
    if (!el) return;
    el.classList.remove('ms-green', 'ms-yellow', 'ms-red');
    if (pct >= 0.75) el.classList.add('ms-green');
    else if (pct >= 0.4) el.classList.add('ms-yellow');
    else el.classList.add('ms-red');
  }

  /* ========== STAV CHIP CORE ========== */

  const state = {
    ai: {
      on: true,
      runtime: 0.78,       // 0–1
      interventions: 12,
      lastSec: 3
    },
    manual: {
      active: false,
      brake: false
    },
    pool: {
      tvl: 1248332,
      change: 0.015,       // -0.05 – 0.1
      yield: 4.8
    },
    db: {
      latency: 14,         // ms
      writes: 120,
      integrity: 100,
      last: '2025-11-27'
    },
    ms: {
      required: 5,
      submitted: 3,
      timelock: '2h'
    },
    chain: {
      block: 23231241,
      rpc: 3.12,           // s
      sync: 0.98
    },
    layers: [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82],
    throughput: {
      ops: 1232,
      queue: 24,
      through: 320 // MB/s jako číslo
    },
    logs: [],
    // odvozené metriky
    stress: 0.2,
    engineHealth: 0.9
  };

  /* ========== MAPOVÁNÍ DOM ========== */

  const elements = {};

  function mapDom() {
    Object.assign(elements, {
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
    });
  }

  /* ========== LOGY ========== */

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

  /* ========== VÝPOČET „STRESS / HEALTH“ ========== */

  function computeDerived() {
    // normalizace jednotlivých stresorů 0–1
    const dbLatencyNorm = clamp(state.db.latency / 250, 0, 1);
    const rpcNorm = clamp(state.chain.rpc / 7, 0, 1);
    const queueNorm = clamp(state.throughput.queue / 80, 0, 1);
    const syncPenalty = clamp(1 - state.chain.sync, 0, 1);
    const msPenalty = clamp(
      (state.ms.required - state.ms.submitted) / Math.max(1, state.ms.required),
      0,
      1
    );
    const negativeYieldPenalty = state.pool.change < 0 ? clamp(-state.pool.change / 0.05, 0, 1) : 0;

    const stressRaw =
      dbLatencyNorm * 0.22 +
      rpcNorm * 0.18 +
      queueNorm * 0.18 +
      syncPenalty * 0.16 +
      msPenalty * 0.16 +
      negativeYieldPenalty * 0.1;

    state.stress = clamp(stressRaw, 0, 1);

    // engine health = invertovaný stress + kvalita layers
    const layerAvg = state.layers.reduce((a, v) => a + v, 0) / state.layers.length;
    const health = clamp(0.5 * (1 - state.stress) + 0.5 * layerAvg, 0, 1);
    state.engineHealth = lerp(state.engineHealth, health, 0.1);
  }

  /* ========== RENDER UI ========== */

  function render() {
    // AI
    if (elements.aiFill) {
      const pct = Math.round(state.ai.runtime * 100);
      setFill(elements.aiFill, pct);
      if (elements.aiPercent) elements.aiPercent.textContent = pct + ' %';
      if (elements.aiInterventions) elements.aiInterventions.textContent = state.ai.interventions;
      if (elements.aiLast) elements.aiLast.textContent = state.ai.lastSec + ' s';
      if (elements.ledAi) {
        elements.ledAi.style.background = state.ai.on ? 'var(--accent-green)' : '#ff6b6b';
        elements.ledAi.style.boxShadow = state.ai.on
          ? '0 0 10px rgba(34,197,94,0.9)'
          : '0 0 10px rgba(239,68,68,0.95)';
      }
      if (elements.toggleAiLabel)
        elements.toggleAiLabel.textContent = state.ai.on ? 'AI ON' : 'AI OFF';
      if (elements.aiMode)
        elements.aiMode.textContent = state.ai.on
          ? 'AUTO'
          : state.manual.active
          ? 'MANUAL'
          : 'OFF';
      setMsLight(elements.aiMs, state.ai.runtime);
    }

    // Manual
    if (elements.manualFill) {
      setFill(elements.manualFill, state.manual.active ? 80 : 30);
      if (elements.manualActive)
        elements.manualActive.textContent = state.manual.active ? 'ON' : 'OFF';
      if (elements.brakeState)
        elements.brakeState.textContent = state.manual.brake ? 'ARMED' : 'DISARMED';
      if (elements.safeMode)
        elements.safeMode.textContent = state.manual.brake ? 'SAFE' : 'OK';
      setMsLight(elements.manualMs, state.manual.active ? 0.8 : 0.4);
    }

    // Pool
    if (elements.poolFill) {
      const poolPct = clamp((state.pool.change + 0.08) * 100, 5, 98);
      setFill(elements.poolFill, poolPct);
      if (elements.tvl) elements.tvl.textContent = fmt(state.pool.tvl);
      if (elements.tvlChange) {
        const v = (state.pool.change * 100).toFixed(2);
        elements.tvlChange.textContent = (state.pool.change >= 0 ? '+' : '') + v + '%';
      }
      if (elements.simYield) elements.simYield.textContent = state.pool.yield.toFixed(1) + '%';
      setMsLight(elements.poolMs, state.pool.change >= 0 ? 0.8 : 0.5);
    }

    // DB
    if (elements.dbFill) {
      const dbPct = clamp(100 - state.db.latency / 2.5, 0, 100);
      setFill(elements.dbFill, dbPct);
      if (elements.dbLatency) elements.dbLatency.textContent = state.db.latency + ' ms';
      if (elements.dbWrites) elements.dbWrites.textContent = state.db.writes;
      if (elements.dbIntegrity) elements.dbIntegrity.textContent = state.db.integrity + '%';
      if (elements.dbLast) elements.dbLast.textContent = state.db.last;
      setMsLight(elements.dbMs, state.db.integrity / 100);
    }

    // Multi-sig
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
    if (elements.L && elements.L.length) {
      state.layers.forEach((val, i) => {
        const bar = elements.L[i];
        const label = elements.Lpct[i];
        if (!bar || !label) return;
        const pct = Math.round(val * 100);
        setFill(bar, pct);
        label.textContent = pct + '%';
        const pulse = 1 + (Math.sin(Date.now() / 380 + i) * 0.0025 * (pct / 20));
        bar.style.transform = `scaleY(${pulse})`;
      });
    }

    // Engine health LED
    if (elements.engineMs) {
      setMsLight(elements.engineMs, state.engineHealth);
    }

    // Throughput
    if (elements.tpFill) {
      const tpPct = clamp((state.throughput.ops / 2200) * 100, 5, 100);
      setFill(elements.tpFill, tpPct);
      if (elements.ops) elements.ops.textContent = fmt(state.throughput.ops);
      if (elements.queue) elements.queue.textContent = state.throughput.queue;
      if (elements.through)
        elements.through.textContent = state.throughput.through.toFixed(0) + ' MB/s';
      setMsLight(elements.tpMs, 0.85);
    }
  }

  /* ========== INTELIGENTNÍ SMYČKA ========== */

  function updateDynamics() {
    // 1) jemný náhodný šum
    state.pool.tvl = Math.max(
      300000,
      state.pool.tvl + Math.round((Math.random() - 0.45) * 18000)
    );
    state.pool.change = clamp(
      state.pool.change + (Math.random() - 0.5) * 0.0025,
      -0.05,
      0.12
    );

    state.chain.block += Math.round(Math.random() * 4);
    state.chain.rpc = clamp(
      state.chain.rpc + (Math.random() - 0.5) * 0.16,
      0.7,
      8
    );
    state.chain.sync = clamp(
      state.chain.sync + (Math.random() - 0.5) * 0.01,
      0.7,
      1
    );

    state.db.latency = clamp(
      state.db.latency + (Math.random() - 0.45) * 5,
      6,
      260
    );
    state.db.writes = clamp(
      state.db.writes + Math.round((Math.random() - 0.5) * 10),
      15,
      680
    );

    // integrity mírně padá se stresem
    const targetIntegrity = clamp(100 - state.stress * 22, 75, 100);
    state.db.integrity = Math.round(lerp(state.db.integrity, targetIntegrity, 0.05));

    // throughput
    state.throughput.ops = clamp(
      state.throughput.ops + Math.round((Math.random() - 0.4) * 160),
      120,
      5400
    );
    state.throughput.queue = clamp(
      state.throughput.queue + Math.round((Math.random() - 0.25) * 8),
      1,
      120
    );

    const targetThrough = clamp(
      120 + state.throughput.ops / 10 - state.stress * 60,
      80,
      900
    );
    state.throughput.through = lerp(state.throughput.through, targetThrough, 0.12);

    // Multi-sig – občas přijde podpis
    if (Math.random() > 0.9 && state.ms.submitted < state.ms.required) {
      state.ms.submitted += 1;
      pushLog('New multisig signature received (sim)');
    }

    // AI runtime cíl podle stresu
    if (state.ai.on) {
      const targetRuntime = clamp(0.65 + (1 - state.stress) * 0.25, 0.55, 0.95);
      state.ai.runtime = lerp(state.ai.runtime, targetRuntime, 0.08);

      // čím větší stress, tím víc zásahů
      const pIntervention = 0.5 * state.stress + 0.1;
      if (Math.random() < pIntervention) {
        state.ai.interventions += 1;
        state.ai.lastSec = 1 + Math.floor(Math.random() * 5);
        pushLog('AI intervention executed (sim)');
      } else {
        state.ai.lastSec = Math.min(state.ai.lastSec + 1, 99);
      }
    } else {
      const targetRuntime = state.manual.brake ? 0.02 : 0.25;
      state.ai.runtime = lerp(state.ai.runtime, targetRuntime, 0.12);
      state.ai.lastSec = Math.min(state.ai.lastSec + 2, 120);
    }

    // Engine layers – chování z reality
    const tvlNorm = clamp(Math.log10(state.pool.tvl / 100000) / 2, 0.2, 1);
    const yieldNorm = clamp(state.pool.yield / 12, 0.1, 1);
    const riskBase = clamp(
      0.3 +
        state.stress * 0.5 +
        (state.chain.rpc - 1) * 0.05 +
        (state.pool.change < 0 ? -state.pool.change * 2 : 0),
      0,
      1
    );

    const targetLayers = [
      // L1 Token – síla tokenu ~ TVL
      tvlNorm,
      // L2 Liquidity – závislá na TVL + queue (čím vyšší queue, tím horší)
      clamp(tvlNorm - state.throughput.queue / 300, 0.15, 1),
      // L3 Yield – přímo z výnosu
      yieldNorm,
      // L4 Risk – vyšší stress, vyšší risk
      riskBase,
      // L5 FinTech – spíš stabilní, ale klesá při velkém stresu
      clamp(0.8 - state.stress * 0.4, 0.25, 0.9),
      // L6 Core – jádro systému, reaguje na DB integrity a sync
      clamp((state.db.integrity / 100) * 0.6 + state.chain.sync * 0.4, 0.3, 1),
      // L7 Analytics – roste s daty (writes) a throughputem
      clamp(
        0.3 + (state.db.writes / 600) * 0.3 + (state.throughput.through / 900) * 0.4,
        0.25,
        1
      )
    ];

    state.layers = state.layers.map((v, i) => lerp(v, targetLayers[i], 0.08));
  }

  /* ========== TICK ========== */

  function tick() {
    computeDerived();
    updateDynamics();

    // náhodné „události“
    if (Math.random() < 0.12) {
      const ev = [
        'RPC latency spike detected',
        'DB checkpoint created',
        'Telemetry snapshot saved',
        'Manual override verified (sim)',
        'Liquidity micro-rebalance scheduled',
        'Engine self-diagnostic passed',
        'AI risk model recalibrated'
      ];
      pushLog(ev[Math.floor(Math.random() * ev.length)]);
    }

    render();
  }

  /* ========== INTERAKCE (TLAČÍTKA) ========== */

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
    const openAiLog = $('#openAiLog');

    if (toggleAI) {
      toggleAI.addEventListener('click', (e) => {
        e.preventDefault();
        state.ai.on = !state.ai.on;
        if (!state.ai.on) state.manual.active = true;
        pushLog(state.ai.on ? 'AI enabled by admin' : 'AI disabled — manual mode');
        render();
      });
    }

    if (openAiLog) {
      openAiLog.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('AI Log opened (demo)');
        alert('AI LOG DEMO – události jsou v Event Logu.');
      });
    }

    if (btnManual) {
      btnManual.addEventListener('click', (e) => {
        e.preventDefault();
        state.manual.active = !state.manual.active;
        if (!state.manual.active && !state.ai.on) {
          // když vypneš manual a AI je OFF → zůstává OFF
          pushLog('Manual mode deactivated, AI remains OFF');
        } else {
          pushLog(state.manual.active ? 'Manual mode activated' : 'Manual mode deactivated');
        }
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
        state.manual.brake = true;
        state.manual.active = true;
        state.ai.on = false;
        state.layers = state.layers.map(() => 0.02);
        state.ai.runtime = 0.02;
        pushLog('EMERGENCY BRAKE activated — safe mode');
        render();
      });
    }

    if (btnSafe) {
      btnSafe.addEventListener('click', (e) => {
        e.preventDefault();
        state.manual.brake = false;
        pushLog('Safe mode toggled');
        render();
      });
    }

    if (runRebalance) {
      runRebalance.addEventListener('click', (e) => {
        e.preventDefault();
        state.pool.change = clamp(state.pool.change + 0.01, -0.05, 0.14);
        state.pool.tvl += Math.round(18000 + Math.random() * 12000);
        pushLog('Pool rebalance executed (demo)');
        render();
      });
    }

    if (viewPools) {
      viewPools.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Pools view opened (demo)');
        alert('Pools view (demo) – v ostré verzi zde budou konkrétní pooly.');
      });
    }

    if (dbReindex) {
      dbReindex.addEventListener('click', (e) => {
        e.preventDefault();
        state.db.latency += 8;
        pushLog('DB reindex triggered (demo)');
        render();
      });
    }

    if (exportAudit) {
      exportAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Audit export requested (demo)');
        alert('Audit export (demo) – v ostrém režimu stáhneš auditní log.');
      });
    }

    if (openMs) {
      openMs.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Multi-sig panel opened (demo)');
        alert('Multi-sig (demo) – v ostré verzi zde budou konkrétní trezory.');
      });
    }

    if (downloadAudit) {
      downloadAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Multi-sig audit downloaded (demo)');
        alert('Multi-sig audit (demo).');
      });
    }

    if (refreshChain) {
      refreshChain.addEventListener('click', (e) => {
        e.preventDefault();
        state.chain.block += 1;
        pushLog('Chain state refreshed (demo)');
        render();
      });
    }

    if (openExplorer) {
      openExplorer.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Explorer opened (demo)');
        alert('Explorer (demo) – v ostré verzi link na skutečný block explorer.');
      });
    }

    if (engineSim) {
      engineSim.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = state.layers.map((v) => clamp(v + 0.04, 0, 1));
        pushLog('Engine simulation pulse');
        render();
      });
    }

    if (engineReset) {
      engineReset.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82];
        pushLog('Engine reset to baseline');
        render();
      });
    }

    if (scaleUp) {
      scaleUp.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops += 260;
        pushLog('Cluster scale-up requested');
        render();
      });
    }

    if (scaleDown) {
      scaleDown.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops = Math.max(200, state.throughput.ops - 260);
        pushLog('Cluster scale-down requested');
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
        pushLog('Logs exported (demo)');
      });
    }

    // Otevírání boxů 01–09 přes čísla
    $$('.card-index').forEach((pill) => {
      pill.addEventListener('click', () => {
        const card = pill.closest('.card');
        if (!card) return;
        const open = card.classList.contains('expanded');
        $$('.card.expanded').forEach((c) => c.classList.remove('expanded'));
        if (!open) {
          card.classList.add('expanded');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // ESC zavře
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.card.expanded').forEach((c) => c.classList.remove('expanded'));
      }
    });

    // Hover efekty karet
    $$('.card').forEach((c) => {
      c.addEventListener('mouseenter', () => {
        c.style.boxShadow = '0 30px 80px rgba(2,6,23,0.95)';
      });
      c.addEventListener('mouseleave', () => {
        c.style.boxShadow = '0 18px 40px rgba(2,6,23,0.7)';
      });
    });

    // Klávesové zkratky
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' && btnManual) btnManual.click();
      if (e.key === 'a' && toggleAI) toggleAI.click();
      if (e.key === 'b' && btnBrake) btnBrake.click();
    });
  }

  /* ========== INIT ========== */

  function init() {
    mapDom();
    bindInteractions();

    pushLog('AYAS-7 Chip Core (E1) initialized');
    pushLog('Telemetry link established (demo)');
    pushLog('Intelligent simulation loop active');

    computeDerived();
    render();

    setInterval(tick, 320); // trochu pomalejší, „dospělejší“ pohyb
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug hook — můžeš si hrát v konzoli
  window.AYAS7ChipCore = {
    state,
    tick,
    render
  };
})();
