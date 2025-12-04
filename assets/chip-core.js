// assets/chip-core.js
// AYAS-7 CHIP CORE · S2 Hybrid Full Mode
// - řízení celé simulace velínu (AI, Manual, Pool, DB, Multi-Sig, Chain, Engine, Throughput, Log)
// - přidán risk engine, fail-safe, mikro-kalibrace a AI autonomie

(function () {
  'use strict';

  // ---------- HELPERY ----------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => n.toLocaleString('cs-CZ');

  // ---------- STAV „ČIPU“ ----------
  const state = {
    // AI / manuál / bezpečnost
    aiOn: true,
    aiRuntime: 0.74,        // 0–1
    aiInterventions: 12,
    aiAutonomy: 0.82,       // 0–1 (jak moc si AI dovolí zasahovat)
    manual: false,
    brake: false,

    // kalibrace
    calibration: {
      active: false,
      progress: 0        // 0–1
    },

    // risk engine
    risk: {
      score: 0.32,       // 0–1
      level: 'LOW'       // LOW / MEDIUM / HIGH
    },

    // Pool / výnos
    pool: { tvl: 1248332, change: 0.015, yield: 4.8 },

    // DB
    db: { latency: 14, writes: 120, integrity: 100, last: '2025-11-27' },

    // Multi-Sig
    ms: { required: 5, submitted: 3, timelock: '2h' },

    // Chain
    chain: { block: 23231241, rpc: 3.12, sync: 0.98 },

    // 7 vrstev enginu
    layers: [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82],

    // výkon / throughput
    throughput: { ops: 1232, queue: 24, through: '320 MB/s' },

    // alerty
    alerts: {
      chainDegraded: false,
      dbDegraded: false
    },

    // logy
    logs: []
  };

  // ---------- MAPOVÁNÍ DOM PRVKŮ ----------
  const elements = {};

  function mapElements() {
    elements.aiFill          = $('#aiFill');
    elements.aiPercent       = $('#aiPercent');
    elements.aiInterventions = $('#aiInterventions');
    elements.aiLast          = $('#aiLast');
    elements.ledAi           = $('#ledAi');
    elements.toggleAiLabel   = $('#toggleAiLabel');
    elements.aiMode          = $('#aiMode');
    elements.aiMs            = $('#aiMs');

    elements.manualFill   = $('#manualFill');
    elements.manualActive = $('#manualActive');
    elements.brakeState   = $('#brakeState');
    elements.safeMode     = $('#safeMode');
    elements.manualMs     = $('#manualMs');

    elements.poolFill    = $('#poolFill');
    elements.tvl         = $('#tvl');
    elements.tvlChange   = $('#tvlChange');
    elements.simYield    = $('#simYield');
    elements.poolMs      = $('#poolMs');
    elements.poolLast    = $('#poolLast');

    elements.dbFill      = $('#dbFill');
    elements.dbLatency   = $('#dbLatency');
    elements.dbWrites    = $('#dbWrites');
    elements.dbIntegrity = $('#dbIntegrity');
    elements.dbLast      = $('#dbLast');
    elements.dbMs        = $('#dbMs');

    elements.msFill      = $('#msFill');
    elements.msRequired  = $('#msRequired');
    elements.msSubmitted = $('#msSubmitted');
    elements.msTimelock  = $('#msTimelock');
    elements.msLast      = $('#msLast');
    elements.msLight     = $('#msLight');

    elements.chainFill   = $('#chainFill');
    elements.blockHeight = $('#blockHeight');
    elements.rpcLatency  = $('#rpcLatency');
    elements.syncPerc    = $('#syncPerc');
    elements.chainMs     = $('#chainMs');

    elements.L     = [$('#L1'), $('#L2'), $('#L3'), $('#L4'), $('#L5'), $('#L6'), $('#L7')];
    elements.Lpct  = [$('#L1pct'), $('#L2pct'), $('#L3pct'), $('#L4pct'), $('#L5pct'), $('#L6pct'), $('#L7pct')];
    elements.engineMode = $('#engineMode');
    elements.engineMs   = $('#engineMs');

    elements.tpFill  = $('#tpFill');
    elements.ops     = $('#ops');
    elements.queue   = $('#queue');
    elements.through = $('#through');
    elements.tpMs    = $('#tpMs');

    elements.logBox   = $('#logBox');
    elements.logStatus= $('#logStatus');
  }

  // ---------- POMOCNÉ FUNKCE LED / RISK ----------
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
    el.style.boxShadow = `0 6px ${18 * glow}px rgba(79,163,255,${0.08 + glow * 0.14})`;
  }

  function setMsLight(el, pct) {
    if (!el) return;
    el.classList.remove('ms-green', 'ms-yellow', 'ms-red');
    if (pct >= 0.75) el.classList.add('ms-green');
    else if (pct >= 0.4) el.classList.add('ms-yellow');
    else el.classList.add('ms-red');
  }

  // ---------- LOGY ----------
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

  // ---------- RISK ENGINE ----------
  function recomputeRisk() {
    // volatilita poolu (0–0.1 typicky)
    const priceVol = Math.min(0.12, Math.abs(state.pool.change));
    // nestabilita chainu (sync + RPC)
    const chainInstab =
      (1 - state.chain.sync) +
      Math.max(0, (state.chain.rpc - 3) / 10);
    // tlak na DB
    const dbPressure = Math.max(0, (state.db.latency - 80) / 220);
    // fronta
    const queueLoad = Math.min(1, state.throughput.queue / 80);

    let score =
      priceVol * 2.2 +
      chainInstab * 1.8 +
      dbPressure * 1.4 +
      queueLoad * 1.2;

    score = Math.max(0, Math.min(1, score));

    state.risk.score = score;
    if (score < 0.33) state.risk.level = 'LOW';
    else if (score < 0.66) state.risk.level = 'MEDIUM';
    else state.risk.level = 'HIGH';

    // alerty
    state.alerts.chainDegraded = (state.chain.sync < 0.9 || state.chain.rpc > 6);
    state.alerts.dbDegraded    = (state.db.latency > 180 || state.db.integrity < 99);
  }

  // ---------- AUTONOMIE AI ----------
  function recomputeAiAutonomy() {
    const stability = 1 - state.risk.score; // 0 – riziko, 1 – klid
    const target = 0.4 + stability * 0.5;   // 0.4–0.9
    state.aiAutonomy += (target - state.aiAutonomy) * 0.05;
    state.aiAutonomy = Math.max(0.25, Math.min(0.95, state.aiAutonomy));
  }

  // ---------- KALIBRACE ----------
  function maybeStartCalibration() {
    if (state.calibration.active) return;
    if (state.risk.level === 'MEDIUM' && Math.random() < 0.05) {
      state.calibration.active = true;
      state.calibration.progress = 0;
      pushLog('ChipCore: start micro-calibration cycle');
    }
  }

  function stepCalibration(dt) {
    if (!state.calibration.active) return;
    state.calibration.progress += dt * 0.35;
    const p = state.calibration.progress;

    // během kalibrace lehce utlumíme systém
    state.pool.change *= 0.98;
    state.throughput.ops *= 0.995;
    state.db.latency  *= 0.995;

    if (p >= 1) {
      state.calibration.active = false;
      state.calibration.progress = 0;
      // malý reset rizika
      state.risk.score *= 0.85;
      pushLog('ChipCore: calibration completed · parameters stabilized');
    }
  }

  // ---------- FAIL-SAFE ----------
  function applyFailSafe() {
    const highRisk   = state.risk.level === 'HIGH';
    const badChain   = state.alerts.chainDegraded;
    const badDb      = state.alerts.dbDegraded;
    const overloaded = state.throughput.ops > 4200 || state.throughput.queue > 60;

    if ((highRisk && (badChain || badDb)) || overloaded) {
      if (!state.brake) {
        state.brake  = true;
        state.manual = true;
        state.aiOn   = false;
        // prudké stažení výkonu
        state.layers = state.layers.map(() => 0.12);
        state.aiRuntime = 0.08;
        pushLog('ChipCore FAIL-SAFE: switching to SAFE · MANUAL mode');
      }
    } else if (state.brake && state.risk.level === 'LOW' && !badChain && !badDb) {
      // opatrný návrat
      state.brake = false;
      pushLog('ChipCore: SAFE mode relaxed, system back to normal envelope');
    }
  }

  // ---------- RENDER UI ----------
  function render() {
    // AI
    if (elements.aiFill) {
      const targetAiPct = Math.round(state.aiRuntime * 100);
      setFill(elements.aiFill, targetAiPct);

      if (elements.aiPercent)       elements.aiPercent.textContent = targetAiPct + ' %';
      if (elements.aiInterventions) elements.aiInterventions.textContent = state.aiInterventions;
      if (elements.aiLast)          elements.aiLast.textContent = 'a few sec';

      if (elements.ledAi) {
        elements.ledAi.style.background = state.aiOn ? 'var(--accent-green)' : '#ff6b6b';
        elements.ledAi.style.boxShadow = state.aiOn
          ? '0 0 10px rgba(34,197,94,0.95)'
          : '0 0 11px rgba(239,68,68,0.98)';
      }

      if (elements.toggleAiLabel) {
        elements.toggleAiLabel.textContent = state.aiOn ? 'AI ON' : 'AI OFF';
      }

      if (elements.aiMode) {
        if (state.brake) elements.aiMode.textContent = 'SAFE';
        else if (state.manual && !state.aiOn) elements.aiMode.textContent = 'MANUAL';
        else if (state.aiOn) elements.aiMode.textContent = 'AUTO';
        else elements.aiMode.textContent = 'OFF';
      }

      // AI Health = kombinace runtime a rizika
      const aiHealth = state.aiRuntime * (1 - state.risk.score * 0.7);
      setMsLight(elements.aiMs, aiHealth);
    }

    // Manual / Brake
    if (elements.manualFill) {
      setFill(elements.manualFill, state.manual ? 80 : 30);
      if (elements.manualActive) elements.manualActive.textContent = state.manual ? 'ON' : 'OFF';
      if (elements.brakeState)   elements.brakeState.textContent   = state.brake ? 'ARMED' : 'DISARMED';
      if (elements.safeMode)     elements.safeMode.textContent     = state.brake ? 'SAFE' : 'OK';

      const manualScore = state.manual ? (state.brake ? 0.3 : 0.6) : 0.45;
      setMsLight(elements.manualMs, manualScore);
    }

    // Pool
    if (elements.poolFill) {
      const poolPct = Math.min(100, Math.max(0, (state.pool.change + 0.05) * 100));
      setFill(elements.poolFill, poolPct);
      if (elements.tvl)       elements.tvl.textContent = fmt(state.pool.tvl);
      if (elements.tvlChange) elements.tvlChange.textContent =
        (state.pool.change >= 0 ? '+' : '') + (state.pool.change * 100).toFixed(2) + '%';
      if (elements.simYield)  elements.simYield.textContent = state.pool.yield.toFixed(1) + '%';
      setMsLight(elements.poolMs, 0.8);
    }

    // DB
    if (elements.dbFill) {
      const dbPct = Math.max(0, Math.min(100, 100 - state.db.latency));
      setFill(elements.dbFill, dbPct);
      if (elements.dbLatency)   elements.dbLatency.textContent   = state.db.latency + ' ms';
      if (elements.dbWrites)    elements.dbWrites.textContent    = state.db.writes;
      if (elements.dbIntegrity) elements.dbIntegrity.textContent = state.db.integrity + '%';
      if (elements.dbLast)      elements.dbLast.textContent      = state.db.last;

      const dbScore = state.db.integrity / 100 - Math.max(0, (state.db.latency - 80) / 400);
      setMsLight(elements.dbMs, dbScore);
    }

    // Multi-Sig
    if (elements.msFill) {
      const msPct = state.ms.submitted / Math.max(1, state.ms.required);
      setFill(elements.msFill, Math.round(msPct * 100));
      if (elements.msRequired)  elements.msRequired.textContent  = state.ms.required;
      if (elements.msSubmitted) elements.msSubmitted.textContent = state.ms.submitted;
      if (elements.msTimelock)  elements.msTimelock.textContent  = state.ms.timelock;
      if (elements.msLast)      elements.msLast.textContent      = '2h ago';
      setMsLight(elements.msLight, msPct);
    }

    // Chain
    if (elements.chainFill) {
      setFill(elements.chainFill, Math.round(state.chain.sync * 100));
      if (elements.blockHeight) elements.blockHeight.textContent = '#' + fmt(state.chain.block);
      if (elements.rpcLatency)  elements.rpcLatency.textContent  = state.chain.rpc.toFixed(2) + ' s';
      if (elements.syncPerc)    elements.syncPerc.textContent    = Math.round(state.chain.sync * 100) + '%';

      const chainScore = state.alerts.chainDegraded ? 0.35 : state.chain.sync;
      setMsLight(elements.chainMs, chainScore);
    }

    // Engine layers
    if (elements.L && elements.Lpct) {
      state.layers.forEach((val, i) => {
        const bar   = elements.L[i];
        const label = elements.Lpct[i];
        if (!bar || !label) return;
        const pct = Math.round(val * 100);
        setFill(bar, pct);

        if (i === 3) {
          // Layer 4 · Risk — doplníme text úrovně
          label.textContent = pct + '% · ' + state.risk.level;
        } else {
          label.textContent = pct + '%';
        }

        const pulse = 1 + (Math.sin(Date.now() / 300 + i) * 0.002 * (pct / 20));
        bar.style.transform = `scaleY(${pulse})`;
      });
    }

    // Engine mód LED
    if (elements.engineMode) {
      if (state.brake) {
        elements.engineMode.textContent = 'SAFE';
      } else if (state.calibration.active) {
        elements.engineMode.textContent = 'CAL';
      } else if (state.aiOn) {
        elements.engineMode.textContent = 'AUTO';
      } else if (state.manual) {
        elements.engineMode.textContent = 'MAN';
      } else {
        elements.engineMode.textContent = 'SIM';
      }
    }
    if (elements.engineMs) {
      const engineScore = (1 - state.risk.score * 0.8);
      setMsLight(elements.engineMs, engineScore);
    }

    // Throughput
    if (elements.tpFill) {
      setFill(elements.tpFill, Math.min(100, (state.throughput.ops / 2000) * 100));
      if (elements.ops)     elements.ops.textContent     = fmt(Math.round(state.throughput.ops));
      if (elements.queue)   elements.queue.textContent   = state.throughput.queue;
      if (elements.through) elements.through.textContent = state.throughput.through;
      const tpScore = Math.max(0.3, 1 - state.throughput.queue / 100);
      setMsLight(elements.tpMs, tpScore);
    }
  }

  // ---------- SIMULAČNÍ TICK ----------
  function tick() {
    // dt ~ 0.28 s (jen pro kalibraci, aby to bylo plynulé)
    const dt = 0.28;

    // AI runtime – random walk
    if (state.aiOn) {
      state.aiRuntime = Math.max(
        0.25,
        Math.min(0.99, state.aiRuntime + (Math.random() - 0.45) * 0.02)
      );
      // šance na zásah AI závisí na autonomii
      const interventionProb = 0.65 * state.aiAutonomy;
      if (Math.random() < interventionProb * 0.08) {
        state.aiInterventions += 1;
        pushLog('AI: autonomous adjustment executed (sim)');
      }
    } else {
      state.aiRuntime = Math.max(0.05, state.aiRuntime - 0.01);
    }

    // Pool
    state.pool.tvl = Math.max(
      300000,
      state.pool.tvl + Math.round((Math.random() - 0.45) * 12000)
    );
    state.pool.change = Math.max(
      -0.06,
      Math.min(0.12, state.pool.change + (Math.random() - 0.5) * 0.0025)
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
      Math.min(320, Math.round(state.db.latency + (Math.random() - 0.5) * 6))
    );
    state.db.writes = Math.max(
      10,
      state.db.writes + Math.round((Math.random() - 0.5) * 8)
    );

    // Multi-Sig
    if (Math.random() > 0.86 && state.ms.submitted < state.ms.required) {
      state.ms.submitted += 1;
      pushLog('Multi-Sig: new signature received (sim)');
    }

    // Layers – lehký „život“
    state.layers = state.layers.map((l, idx) => {
      let drift = (Math.random() - 0.5) * 0.045;

      // Risk (L4) reaguje víc na risk score
      if (idx === 3) {
        const target = 0.25 + state.risk.score * 0.7;
        drift += (target - l) * 0.08;
      }

      return Math.max(0.02, Math.min(1, l + drift));
    });

    // Throughput
    state.throughput.ops = Math.max(
      120,
      Math.min(5000, state.throughput.ops + Math.round((Math.random() - 0.5) * 140))
    );
    state.throughput.queue = Math.max(
      1,
      state.throughput.queue + Math.round((Math.random() - 0.3) * 6)
    );

    // rozhodovací logy
    if (Math.random() < 0.16) {
      const ev = [
        'DB checkpoint created (sim)',
        'RPC latency spike detected (sim)',
        'Telemetry snapshot saved (sim)',
        'Manual override check (sim)'
      ];
      pushLog(ev[Math.floor(Math.random() * ev.length)]);
    }

    // risk engine + autonomie + kalibrace + fail-safe
    recomputeRisk();
    recomputeAiAutonomy();
    maybeStartCalibration();
    stepCalibration(dt);
    applyFailSafe();

    render();
  }

  // ---------- INTERAKCE (TLAČÍTKA) ----------
  function bindInteractions() {
    const toggleAI     = $('#toggleAI');
    const btnManual    = $('#btnManual');
    const btnBrake     = $('#btnBrake');
    const btnSafe      = $('#btnSafe');
    const runRebalance = $('#runRebalance');
    const viewPools    = $('#viewPools');
    const dbReindex    = $('#dbReindex');
    const exportAudit  = $('#exportAudit');
    const openMs       = $('#openMs');
    const downloadAudit= $('#downloadAudit');
    const refreshChain = $('#refreshChain');
    const openExplorer = $('#openExplorer');
    const engineSim    = $('#engineSim');
    const engineReset  = $('#engineReset');
    const scaleUp      = $('#scaleUp');
    const scaleDown    = $('#scaleDown');
    const clearLogs    = $('#clearLogs');
    const exportLogs   = $('#exportLogs');

    if (toggleAI) {
      toggleAI.addEventListener('click', (e) => {
        e.preventDefault();
        state.aiOn = !state.aiOn;
        if (!state.aiOn) state.manual = true;
        pushLog(state.aiOn ? 'AI enabled by admin' : 'AI disabled · manual preferred');
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
        state.brake  = true;
        state.manual = true;
        state.aiOn   = false;
        state.layers = state.layers.map(() => 0.02);
        state.aiRuntime = 0.04;
        pushLog('EMERGENCY BRAKE activated · SAFE mode');
        render();
      });
    }

    if (btnSafe) {
      btnSafe.addEventListener('click', (e) => {
        e.preventDefault();
        state.brake = false;
        pushLog('Safe mode toggled (soft)');
        render();
      });
    }

    if (runRebalance) {
      runRebalance.addEventListener('click', (e) => {
        e.preventDefault();
        state.pool.change = Math.min(0.12, state.pool.change + 0.01);
        state.pool.tvl += Math.round(12000 + Math.random() * 8000);
        pushLog('Rebalance executed (demo)');
        render();
      });
    }

    if (viewPools) {
      viewPools.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Pools viewed (demo)');
        alert('Pools view (demo)');
      });
    }

    if (dbReindex) {
      dbReindex.addEventListener('click', (e) => {
        e.preventDefault();
        state.db.latency += 5;
        pushLog('DB reindex triggered (demo)');
        render();
      });
    }

    if (exportAudit) {
      exportAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Audit export requested (demo)');
        alert('Audit export (demo)');
      });
    }

    if (openMs) {
      openMs.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Multi-Sig panel opened (demo)');
        alert('Multi-Sig (demo)');
      });
    }

    if (downloadAudit) {
      downloadAudit.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Multi-Sig audit downloaded (demo)');
        alert('Audit (demo)');
      });
    }

    if (refreshChain) {
      refreshChain.addEventListener('click', (e) => {
        e.preventDefault();
        state.chain.block += 1;
        pushLog('Chain refreshed (demo)');
        render();
      });
    }

    if (openExplorer) {
      openExplorer.addEventListener('click', (e) => {
        e.preventDefault();
        pushLog('Explorer opened (demo)');
        alert('Explorer (demo)');
      });
    }

    if (engineSim) {
      engineSim.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = state.layers.map((v) => Math.min(1, v + 0.05));
        pushLog('Engine simulation step (manual)');
        render();
      });
    }

    if (engineReset) {
      engineReset.addEventListener('click', (e) => {
        e.preventDefault();
        state.layers = [0.88, 0.68, 0.81, 0.92, 0.56, 0.61, 0.82];
        pushLog('Engine reset (demo)');
        render();
      });
    }

    if (scaleUp) {
      scaleUp.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops += 200;
        pushLog('Scale up requested (demo)');
        render();
      });
    }

    if (scaleDown) {
      scaleDown.addEventListener('click', (e) => {
        e.preventDefault();
        state.throughput.ops = Math.max(200, state.throughput.ops - 200);
        pushLog('Scale down requested (demo)');
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

    // klávesové zkratky (M/A/B)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'm' && btnManual) btnManual.click();
      if (e.key === 'a' && toggleAI)  toggleAI.click();
      if (e.key === 'b' && btnBrake)  btnBrake.click();
    });
  }

  // ---------- INIT ----------
  function initChipCore() {
    mapElements();
    bindInteractions();

    pushLog('AYAS-7 Chip Core · S2 Hybrid initialized');
    pushLog('Telemetry link established (demo)');
    pushLog('Simulations active · risk engine online');

    render();
    setInterval(tick, 280);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChipCore);
  } else {
    initChipCore();
  }

  // export do konzole (debug)
  window.AYAS7ChipCore = {
    state,
    tick,
    render,
    pushLog
  };
})();
