// chip-core.js (GitHub / frontend verze)
// AYAS-7 – simulovaný centrální mozek běžící přímo v prohlížeči.
//
// - Sdílený stav přes localStorage (admin + dashboard + další taby).
// - Simuluje takt, zátěž, historii pro grafy.
// - Obsahuje alarm logiku, auto-recovery, overload detekci.
// - Generuje UI hinty pro glow efekty (ui.glowClass, glowLevel, dangerLevel, pulse).
//
// Použití z admin.html / dashboard.html:
//
// <script type="module">
//   import { Core } from './assets/chip-core.js';
//
//   Core.subscribe(state => {
//       // aktualizuj UI podle state
//   });
//
//   Core.setMode('ACTIVE');
//   Core.adjustYield(+5);
// </script>

const STORAGE_KEY = 'AYAS7_CORE_STATE_V2';

class AyasCoreSim {
    constructor() {
        this.listeners = new Set();
        this._lastRecoveryToken = null;
        this._tickCount = 0;

        this.state = this._loadInitialState();

        // posloucháme změny z jiných tabů
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const newState = JSON.parse(e.newValue);
                    this.state = newState;
                    this._notify();
                } catch (err) {
                    console.warn('AYAS-7: Chyba při čtení state ze storage', err);
                }
            }
        });

        // spustíme takt – každou vteřinu lehká simulace dění
        this._startTicker();
    }

    // ---------- PUBLIC API ----------

    subscribe(fn) {
        this.listeners.add(fn);
        // hned po přihlášení pošli aktuální stav
        fn(this.state);
        return () => this.listeners.delete(fn);
    }

    getState() {
        return this.state;
    }

    setMode(mode) {
        if (!['IDLE', 'ACTIVE', 'SAFE', 'ERROR'].includes(mode)) return;
        this._updateState({ systemMode: mode }, `MODE → ${mode}`);
    }

    adjustYield(delta) {
        const cur = Number(this.state.yieldRate) || 0;
        let next = cur + delta;
        if (next < 0) next = 0;
        if (next > 100) next = 100; // prezentační maximum
        this._updateState({ yieldRate: Math.round(next * 10) / 10 }, `YIELD ${delta >= 0 ? '+' : ''}${delta}`);
    }

    adjustNodes(delta) {
        const cur = Number(this.state.nodesOnline) || 0;
        let next = cur + delta;
        if (next < 0) next = 0;
        if (next > 50) next = 50; // prezentační limit nodů
        this._updateState({ nodesOnline: next }, `NODES ${delta >= 0 ? '+' : ''}${delta}`);
    }

    resetState() {
        this._log('🔁 RESET STATE → DEFAULT');
        this.state = this._defaultState();
        this._saveState();
        this._notify();
    }

    // “showtime” scénáře pro prezentace
    triggerScenario(name) {
        switch (name) {
            case 'spike':
                this._log('⚡ SCENARIO: Performance Spike');
                this._updateState({
                    systemMode: 'ACTIVE',
                    yieldRate: 90,
                    nodesOnline: Math.max(this.state.nodesOnline, 5)
                }, null);
                break;
            case 'drain':
                this._log('🕳 SCENARIO: Drain & Recovery');
                this._updateState({
                    systemMode: 'ACTIVE',
                    yieldRate: 15,
                    nodesOnline: 2
                }, null);
                break;
            case 'errorStorm':
                this._log('🌩 SCENARIO: Error Storm');
                this._updateState({
                    systemMode: 'ERROR',
                    yieldRate: 30
                }, null);
                break;
            case 'stableSafe':
                this._log('🛡 SCENARIO: Stabilní SAFE');
                this._updateState({
                    systemMode: 'SAFE',
                    yieldRate: 25,
                    nodesOnline: 4
                }, null);
                break;
            default:
                this._log(`ℹ Unknown scenario: ${name}`);
        }
    }

    // ---------- INTERNAL: STATE / STORAGE ----------

    _defaultState() {
        const now = new Date();
        return {
            systemMode: 'IDLE',
            yieldRate: 0,
            nodesOnline: 0,
            alarm: 'OK',
            alarmDetail: '',
            logs: [],
            lastUpdate: now.toISOString(),
            uptimeSeconds: 0,
            history: [],           // { t, yieldRate, nodesOnline, mode, alarm }
            ui: {
                glowClass: 'glow-idle',
                glowLevel: 0.2,
                dangerLevel: 0,
                pulse: false
            }
        };
    }

    _loadInitialState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ...this._defaultState(),
                    ...parsed
                };
            }
        } catch (err) {
            console.warn('AYAS-7: Nelze načíst stav, používám default:', err);
        }
        return this._defaultState();
    }

    _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (err) {
            console.warn('AYAS-7: Chyba ukládání stavu do localStorage', err);
        }
    }

    _log(line) {
        const entry = `[${new Date().toLocaleTimeString()}] ${line}`;
        this.state.logs.unshift(entry);
        if (this.state.logs.length > 200) this.state.logs.pop();
    }

    _updateState(patch, logText = null) {
        if (logText) this._log(logText);

        this.state = {
            ...this.state,
            ...patch,
            lastUpdate: new Date().toISOString()
        };

        this._checkAlarmsAndRecovery();
        this._recalcUiHints();

        this._saveState();
        this._notify();
    }

    _notify() {
        for (const fn of this.listeners) {
            try {
                fn(this.state);
            } catch (err) {
                console.error('AYAS-7: Listener error:', err);
            }
        }
    }

    // ---------- ALARM / AUTO-RECOVERY LOGIKA ----------

    _checkAlarmsAndRecovery() {
        let alarm = 'OK';
        let detail = '';

        // Hard ERROR alarm
        if (this.state.systemMode === 'ERROR') {
            alarm = '⚠ SYSTEM ERROR';
            detail = 'Critical fault reported by core.';
            this._log('⚠ ALARM TRIGGERED: SYSTEM ERROR');

            const token = Symbol('RECOVERY');
            this._lastRecoveryToken = token;

            // Auto-recovery po 7s
            setTimeout(() => {
                if (this._lastRecoveryToken !== token) return;
                if (this.state.systemMode === 'ERROR') {
                    this._log('🔄 AUTO-RECOVERY → SAFE MODE');
                    this.state.systemMode = 'SAFE';
                    alarm = 'OK';
                    detail = 'Recovered from ERROR to SAFE.';
                    this.state.lastUpdate = new Date().toISOString();
                    this._recalcUiHints();
                    this._saveState();
                    this._notify();
                }
            }, 7000);
        } else {
            this._lastRecoveryToken = null;

            // Overload / high-load alarm (měkký)
            if (this.state.systemMode === 'ACTIVE' && this.state.yieldRate >= 80) {
                alarm = '⚠ HIGH LOAD';
                detail = 'Performance near maximum capacity.';
                this._log('⚠ SOFT ALARM: HIGH LOAD');
            }

            // Node failure / suspicious low nodes
            if (this.state.systemMode === 'ACTIVE' && this.state.nodesOnline === 0) {
                alarm = '⚠ NO NODES ONLINE';
                detail = 'Active mode with zero nodes – check network.';
                this._log('⚠ SOFT ALARM: ACTIVE MODE WITHOUT NODES');
            }
        }

        this.state.alarm = alarm;
        this.state.alarmDetail = detail;
    }

    // ---------- UI HINTS PRO GLOW / EFEKTY ----------

    _recalcUiHints() {
        let glowLevel = 0.2;
        let dangerLevel = 0;
        let pulse = false;
        let glowClass = 'glow-idle';

        const mode = this.state.systemMode;
        const alarm = this.state.alarm;
        const yieldRate = this.state.yieldRate;

        if (mode === 'IDLE') {
            glowLevel = 0.15;
            dangerLevel = 0;
            glowClass = 'glow-idle';
        } else if (mode === 'SAFE') {
            glowLevel = 0.3;
            dangerLevel = 0.1;
            glowClass = 'glow-safe';
        } else if (mode === 'ACTIVE') {
            glowLevel = 0.6;
            dangerLevel = 0.3;
            glowClass = 'glow-active';
            if (yieldRate > 70) {
                glowLevel = 0.8;
                dangerLevel = 0.6;
                glowClass = 'glow-overload';
                pulse = true;
            }
        } else if (mode === 'ERROR') {
            glowLevel = 1.0;
            dangerLevel = 1.0;
            glowClass = 'glow-error';
            pulse = true;
        }

        if (alarm && alarm !== 'OK') {
            dangerLevel = Math.max(dangerLevel, 0.7);
            pulse = true;
        }

        this.state.ui = {
            glowLevel,
            dangerLevel,
            pulse,
            glowClass
        };
    }

    // ---------- TICKER / SIMULACE ČASU / HISTORIE ----------

    _startTicker() {
        setInterval(() => {
            this._tickCount += 1;
            this.state.uptimeSeconds += 1;

            const now = new Date();

            const patch = {};

            // jemný drift výkonu při ACTIVE
            if (this.state.systemMode === 'ACTIVE') {
                const drift = (Math.random() - 0.5) * 1.8; // -0.9 až +0.9
                let newYield = this.state.yieldRate + drift;
                if (newYield < 0) newYield = 0;
                if (newYield > 100) newYield = 100;
                patch.yieldRate = Math.round(newYield * 10) / 10;

                // občasná simulace micro eventu v logu (jen pro show)
                if (this._tickCount % 10 === 0) {
                    const micro = Math.random();
                    if (micro < 0.33) {
                        this._log('✅ Node heartbeat OK');
                    } else if (micro < 0.66) {
                        this._log('ℹ Telemetry packet processed');
                    } else {
                        this._log('ℹ Yield calibration sample stored');
                    }
                }
            }

            // generování bodu do historie pro graf
            const point = {
                t: now.toISOString(),
                yieldRate: this.state.yieldRate,
                nodesOnline: this.state.nodesOnline,
                mode: this.state.systemMode,
                alarm: this.state.alarm
            };
            const hist = Array.isArray(this.state.history) ? [...this.state.history] : [];
            hist.push(point);
            if (hist.length > 300) hist.shift();
            patch.history = hist;

            this.state = {
                ...this.state,
                ...patch,
                lastUpdate: now.toISOString()
            };

            this._checkAlarmsAndRecovery();
            this._recalcUiHints();
            this._saveState();
            this._notify();
        }, 1000); // takt 1s
    }
}

const coreInstance = new AyasCoreSim();

// Exportované API pro admin/dashboard
export const Core = {
    subscribe: (fn) => coreInstance.subscribe(fn),
    getState: () => coreInstance.getState(),
    setMode: (mode) => coreInstance.setMode(mode),
    adjustYield: (delta) => coreInstance.adjustYield(delta),
    adjustNodes: (delta) => coreInstance.adjustNodes(delta),
    resetState: () => coreInstance.resetState(),
    triggerScenario: (name) => coreInstance.triggerScenario(name)
};
