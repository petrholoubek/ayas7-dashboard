// =============================================================
// AYAS-7 CHIP-CORE v4.0  (Stable · Anti-Crash · Auto-Recovery AI)
// =============================================================
// Tento soubor je nyní hlavní mozek systému.
// Velín a Dashboard nyní čtou stejné hodnoty.
// =============================================================

(function () {
'use strict';

/* === SHORT HELPERS === */
const $  = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const fmt=n=>n.toLocaleString();

/* === Stav čipu — jednotná datová sada === */
const state = {
  aiOn:true, aiRuntime:0.74, aiInterventions:12,
  manual:false, brake:false,

  pool:{tvl:1248332,change:0.015,yield:4.8},
  db:{latency:14,writes:120,integrity:100,last:"2025-11-27"},
  ms:{required:5,submitted:3,timelock:"2h"},
  chain:{block:23231241,rpc:3.12,sync:0.98},

  layers:[0.88,0.68,0.81,0.92,0.56,0.61,0.82],
  throughput:{ops:1232,queue:24,through:"320 MB/s"},

  logs:[]
};

/* === Logování === */
function pushLog(msg){
  const ts=new Date().toLocaleTimeString();
  state.logs.push({ts,msg});
  if(state.logs.length>300)state.logs.shift();
  if($('#logBox')) renderLogs();
}
function renderLogs(){
  const box=$("#logBox");
  if(!box)return;
  box.innerHTML="";
  state.logs.slice().reverse().forEach(l=>{
    const d=document.createElement("div");
    d.className="log-item";
    d.textContent=`${l.ts} · ${l.msg}`;
    box.appendChild(d);
  });
  if($('#logStatus')) $('#logStatus').textContent="connected";
}

/* === LED / výplň === */
function setFill(el,pct){
  if(!el)return;
  pct=Math.min(100,Math.max(0,pct));
  el.style.width=pct+"%";
  if(pct>89)el.style.background="linear-gradient(90deg,#ff6b6b,#ff8a65)";
  else if(pct>74)el.style.background="linear-gradient(90deg,#f6d365,#ff8a65)";
  else el.style.background="linear-gradient(90deg,var(--accent-blue),var(--accent-green-soft))";
}
function msLED(el,v){ if(!el)return;
  el.classList.remove("ms-green","ms-yellow","ms-red");
  if(v>=0.75)el.classList.add("ms-green");
  else if(v>=0.4)el.classList.add("ms-yellow");
  else el.classList.add("ms-red");
}

/* =============================================================
   🔥 AI stabilizační engine
   — už nikdy nespadne samovolně
   — pokud runtime klesne → obnoví se
============================================================= */
function ai_recovery() {
  if(!state.aiOn) return; // běží jen pokud je AI aktivní
  if(state.aiRuntime < 0.35){
    state.aiRuntime += 0.22;        // auto-boost
    pushLog("⚠ AI runtime low → autorecovery applied");
  }
  if(state.manual && state.aiOn){
    state.manual=false;             // AI nesmí být vytlačena ručně
    pushLog("AI regained control");
  }
}

/* =============================================================
   🔄 SIMULAČNÍ CYKLUS — 280ms
============================================================= */
function tick(){

  // AI
  state.aiRuntime=Math.max(0.20,Math.min(0.99,state.aiRuntime+(Math.random()-0.5)*0.02));
  if(Math.random()>0.88)state.aiInterventions++;

  ai_recovery(); // 🔥 zde stabilizujeme

  // Pool
  state.pool.tvl=Math.max(300000,state.pool.tvl+Math.round((Math.random()-0.45)*12000));
  state.pool.change=Math.max(-0.05,Math.min(0.1,state.pool.change+(Math.random()-0.5)*0.0025));

  // Chain
  state.chain.block+=Math.round(Math.random()*4);
  state.chain.sync=Math.max(0.7,Math.min(1,state.chain.sync+(Math.random()-0.5)*0.012));
  state.chain.rpc=Math.max(0.8,Math.min(8,state.chain.rpc+(Math.random()-0.5)*0.12));

  // Database
  state.db.latency=Math.max(5,Math.min(300,Math.round(state.db.latency+(Math.random()-0.5)*6)));
  state.db.writes=Math.max(10,state.db.writes+Math.round((Math.random()-0.5)*8));

  // Multi-sig
  if(Math.random()>0.86)state.ms.submitted=Math.min(state.ms.required,state.ms.submitted+1);

  // Engine layers
  state.layers=state.layers.map(l=>Math.max(0.03,Math.min(1,l+(Math.random()-0.5)*0.035)));

  // Throughput
  state.throughput.ops=Math.max(120,Math.min(5000,state.throughput.ops+Math.round((Math.random()-0.5)*140)));
  state.throughput.queue=Math.max(1,state.throughput.queue+Math.round((Math.random()-0.3)*6));

  render();
}

/* =============================================================
   🔥 RENDER celé UI
============================================================= */
function render(){
  if($('#aiFill')){
    const pct=Math.round(state.aiRuntime*100);
    setFill($('#aiFill'),pct);
    $('#aiPercent').textContent=pct+" %";
    $('#aiInterventions').textContent=state.aiInterventions;
    $('#ledAi').style.background=state.aiOn?"var(--accent-green)":"#ff4e4e";
    $('#toggleAiLabel').textContent=state.aiOn?"AI ON":"AI OFF";
    $('#aiMode').textContent=state.aiOn?"AUTO":(state.manual?"MANUAL":"OFF");
    msLED($('#aiMs'),state.aiRuntime);
  }

  if($('#manualFill')){
    setFill($('#manualFill'),state.manual?78:28);
    $('#manualActive').textContent=state.manual?"ON":"OFF";
    $('#brakeState').textContent=state.brake?"ARMED":"DISARMED";
    $('#safeMode').textContent=state.brake?"SAFE":"OK";
    msLED($('#manualMs'),state.manual?0.8:0.4);
  }

  if($('#poolFill')){
    const pct=Math.min(100,(state.pool.change+0.05)*100);
    setFill($('#poolFill'),pct);
    $('#tvl').textContent=fmt(state.pool.tvl);
    $('#tvlChange').textContent=(state.pool.change>=0?"+":"")+ (state.pool.change*100).toFixed(2)+"%";
    $('#simYield').textContent=state.pool.yield.toFixed(1)+"%";
    msLED($('#poolMs'),0.8);
  }

  if($('#dbFill')){
    const pct=Math.max(0,Math.min(100,100-state.db.latency));
    setFill($('#dbFill'),pct);
    $('#dbLatency').textContent=state.db.latency+" ms";
    $('#dbWrites').textContent=state.db.writes;
    $('#dbIntegrity').textContent=state.db.integrity+"%";
    $('#dbLast').textContent=state.db.last;
    msLED($('#dbMs'),state.db.integrity/100);
  }

  if($('#msFill')){
    const r=state.ms.submitted/state.ms.required;
    setFill($('#msFill'),Math.round(r*100));
    $('#msRequired').textContent=state.ms.required;
    $('#msSubmitted').textContent=state.ms.submitted;
    $('#msTimelock').textContent=state.ms.timelock;
    $('#msLast').textContent="2h ago";
    msLED($('#msLight'),r);
  }

  if($('#chainFill')){
    setFill($('#chainFill'),Math.round(state.chain.sync*100));
    $('#blockHeight').textContent="#"+fmt(state.chain.block);
    $('#rpcLatency').textContent=state.chain.rpc.toFixed(2)+" s";
    $('#syncPerc').textContent=Math.round(state.chain.sync*100)+"%";
    msLED($('#chainMs'),state.chain.sync);
  }

  state.layers.forEach((v,i)=>{
    const pct=Math.round(v*100);
    setFill($('#L'+(i+1)),pct);
    $('#L'+(i+1)+'pct').textContent=pct+"%";
  });

  if($('#tpFill')){
    setFill($('#tpFill'),Math.min(100,(state.throughput.ops/2000)*100));
    $('#ops').textContent=fmt(state.throughput.ops);
    $('#queue').textContent=state.throughput.queue;
    $('#through').textContent=state.throughput.through;
    msLED($('#tpMs'),0.85);
  }
}

/* =============================================================
   INIT
============================================================= */
pushLog("AYAS-7 CORE ONLINE");
pushLog("AI stabilized · no auto-shutdown");
pushLog("Telemetrie aktivní");

// spustíme smyčku
render();
setInterval(tick,280);

// export debug
window.AYAS7=state;

})(); // END SYSTEM
