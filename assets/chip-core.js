// AYAS-7 CENTRAL SIM ENGINE (BROWSER VERSION)
//
// - Realtime stavová logika
// - Live yield / nodes / alarm / auto-recovery
// - Historie pro grafy (dashboard.html)
// - Glow/alert UI indikátory
// - Napojení přes window.AYASCore.subscribe()
//
// 🚀 Tento soubor NEpoužívá export/module.
// 🚀 Funkční přímo v prohlížeči přes <script src="assets/chip-core.js">

(function(global){
  const STORAGE_KEY = 'AYAS7_CORE_STATE_V3';

  class AyasCoreSim {
    constructor(){
      this.listeners = new Set();
      this._tick = 0;
      this._lastRecoveryToken = null;
      this.state = this._load() || this._defaults();
      this._start();
    }

    // ---------------- PUBLIC API ---------------- //

    subscribe(fn){
      this.listeners.add(fn);
      fn(this.state); // první push ihned
      return ()=> this.listeners.delete(fn);
    }

    getState(){ return this.state; }

    setMode(mode){
      if(!['IDLE','ACTIVE','SAFE','ERROR'].includes(mode)) return;
      this._update({ systemMode:mode }, `MODE → ${mode}`);
    }

    adjustYield(delta){
      let y = this.state.yieldRate + delta;
      if(y<0) y=0; if(y>100) y=100;
      this._update({yieldRate:Math.round(y*10)/10}, `YIELD ${delta>=0?'+':''}${delta}`);
    }

    adjustNodes(delta){
      let n = this.state.nodesOnline + delta;
      if(n<0) n=0; if(n>50) n=50;
      this._update({nodesOnline:n}, `NODES ${delta>=0?'+':''}${delta}`);
    }

    addLog(m){ this._log(m); this._save(); this._notify(); }
    clearLogs(){ this.state.logs=[]; this._save(); this._notify(); }

    resetState(){
      this._log("🔁 RESET STATE");
      this.state=this._defaults();
      this._save();
      this._notify();
    }

    triggerScenario(name){
      switch(name){
        case "spike":
          this._log("⚡ SCENARIO: Spike");
          this._update({systemMode:"ACTIVE",yieldRate:90,nodesOnline:5});
          break;
        case "drain":
          this._log("🕳 SCENARIO: Drain");
          this._update({systemMode:"ACTIVE",yieldRate:15,nodesOnline:2});
          break;
        case "errorStorm":
          this._log("🌩 ERROR STORM");
          this._update({systemMode:"ERROR",yieldRate:30});
          break;
        case "stableSafe":
          this._log("🛡 SAFE MODE");
          this._update({systemMode:"SAFE",yieldRate:25,nodesOnline:4});
          break;
        default:
          this._log("ℹ Unknown scenario "+name);
      }
    }

    // ---------------- INTERNAL ---------------- //

    _defaults(){
      return{
        systemMode:"IDLE",
        yieldRate:0,
        nodesOnline:0,
        alarm:"OK",
        alarmDetail:"",
        uptimeSeconds:0,
        lastUpdate:new Date().toISOString(),

        logs:[],
        history:[], // {t,yieldRate,nodesOnline,mode,alarm}

        ui:{
          glowClass:"glow-idle",
          glowLevel:0.2,
          dangerLevel:0,
          pulse:false
        }
      };
    }

    _log(txt){
      const l=`[${new Date().toLocaleTimeString()}] ${txt}`;
      this.state.logs.unshift(l);
      if(this.state.logs.length>300) this.state.logs.pop();
    }

    _update(patch,log=null){
      if(log) this._log(log);

      this.state={...this.state,...patch,lastUpdate:new Date().toISOString()};
      this._alarms();
      this._ui();
      this._save();
      this._notify();
    }

    _notify(){
      for(const fn of this.listeners){
        try{ fn(this.state); } catch(e){ console.error(e); }
      }
    }

    _alarms(){
      let alarm="OK", detail="";

      if(this.state.systemMode==="ERROR"){
        alarm="⚠ SYSTEM ERROR"; detail="Critical fault";
        this._log("⚠ ERROR TRIGGERED");

        const tok=Symbol(); this._lastRecoveryToken=tok;
        setTimeout(()=>{
          if(this._lastRecoveryToken!==tok) return;
          if(this.state.systemMode==="ERROR"){
            this._log("🔄 AUTO-RECOVERY → SAFE");
            this.state.systemMode="SAFE";
            this._ui(); this._save(); this._notify();
          }
        },7000);

      }else{
        this._lastRecoveryToken=null;
        if(this.state.systemMode==="ACTIVE" && this.state.yieldRate>=80){
          alarm="⚠ HIGH LOAD";
          detail="High capacity load";
        }
        if(this.state.systemMode==="ACTIVE" && this.state.nodesOnline===0){
          alarm="⚠ ACTIVE w/ 0 nodes";
          detail="No workers online";
        }
      }

      this.state.alarm=alarm;
      this.state.alarmDetail=detail;
    }

    _ui(){
      const {systemMode,yieldRate,alarm}=this.state;
      let glow=0.2, danger=0, pulse=false, css="glow-idle";

      if(systemMode==="SAFE"){glow=.3;css="glow-safe";}
      if(systemMode==="ACTIVE"){
        glow=.6;danger=.3;css="glow-active";
        if(yieldRate>70){glow=.8;danger=.6;css="glow-overload";pulse=true;}
      }
      if(systemMode==="ERROR"){glow=1;danger=1;css="glow-error";pulse=true;}
      if(alarm!=="OK"){danger=.7;pulse=true;}

      this.state.ui={glowLevel:glow,dangerLevel:danger,pulse,glowClass:css};
    }

    _load(){
      try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
      catch{return null;}
    }
    _save(){
      try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(this.state)); }
      catch(e){}
    }

    _start(){
      setInterval(()=>{
        this._tick++, this.state.uptimeSeconds++;
        const now=new Date(), hist=[...this.state.history];

        if(this.state.systemMode==="ACTIVE"){
          const drift=(Math.random()-0.5)*1.8;
          let y=this.state.yieldRate+drift;
          if(y<0)y=0;if(y>100)y=100;
          this.state.yieldRate=Math.round(y*10)/10;
        }

        hist.push({t:now.toISOString(),yieldRate:this.state.yieldRate,nodesOnline:this.state.nodesOnline,mode:this.state.systemMode,alarm:this.state.alarm});
        if(hist.length>300) hist.shift();

        this.state={...this.state,history:hist,lastUpdate:now.toISOString()};
        this._alarms(); this._ui(); this._save(); this._notify();
      },1000);
    }
  }

  global.AYASCore = new AyasCoreSim();

})(typeof window!=="undefined"?window:this);
