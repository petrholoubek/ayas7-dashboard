/* ===========================================================
   AYAS-7 CHIP-CORE ENGINE · CYCLE AI · FULL RECONSTRUCT 2025
   Author: Petr Holoubek + AI Core Co-Dev
   =========================================================== */

(function(){

/* Quick DOM helpers */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => n.toLocaleString("cs-CZ");

/* ===========================================================
   CHIP STATE — MAIN MEMORY & SIMULATION FIELD
   =========================================================== */

const state = {
    cycle:0, cycleTimer:0, cycleLen:260, // ~72s jeden ekonomický cyklus
    aiOn:true, manual:false, brake:false,
    aiRuntime:0.72, aiInterventions:4,

    pool:{tvl:1248332, change:0.014, yield:5.2},
    db:{latency:13, writes:118, integrity:100, last:"2025-12-03"},
    ms:{required:5, submitted:3, timelock:"2h"},
    chain:{block:23231241, rpc:3.15, sync:0.97},
    layers:[0.86,0.72,0.81,0.93,0.58,0.63,0.84],
    throughput:{ops:1244, queue:22, through:"330 MB/s"},
    logs:[]
};

/* ===========================================================
   LED / GLOW FUNCTIONS
   =========================================================== */
function setFill(el,pct){
    if(!el) return;
    pct=Math.max(0,Math.min(100,pct));
    el.style.width=pct+"%";
    el.style.background=pct>=90
        ? "linear-gradient(90deg,#ff6b6b,#ff8a65)"
        : pct>=75
        ? "linear-gradient(90deg,#f6d365,#ff8a65)"
        : "linear-gradient(90deg,var(--accent-blue),var(--accent-green-soft))";

    el.style.boxShadow=`0 6px ${16*(pct/100)}px rgba(79,163,255,${0.10+(pct/100)*0.14})`;
}
function setMS(el,p){ el.classList.remove("ms-green","ms-yellow","ms-red");
    el.classList.add(p>=0.75?"ms-green":p>=0.4?"ms-yellow":"ms-red"); }

/* ===========================================================
   LOGS
   =========================================================== */
function log(msg){
    state.logs.push({t:new Date().toLocaleTimeString(),msg});
    if(state.logs.length>250) state.logs.shift();
    renderLogs();
}
function renderLogs(){
    const box=$("#logBox"); if(!box) return;
    box.innerHTML="";
    state.logs.slice().reverse().forEach(l=>{
        const d=document.createElement("div");
        d.className="log-item"; d.textContent=`${l.t} · ${l.msg}`;
        box.appendChild(d);
    });
    $("#logStatus").textContent="connected";
}

/* ===========================================================
   CYCLE-AI · Ekonomické fáze 4×
   =========================================================== */

function tick(){

    state.cycleTimer++;
    if(state.cycleTimer>state.cycleLen){
        state.cycleTimer=0;
        state.cycle=(state.cycle+1)%4;
        log("Market cycle → "+["Bull","Flat","Bear","Recovery"][state.cycle]);
    }

    const trend=[+0.014,+0.002,-0.022,+0.009][state.cycle];
    const risk =[+0.05,+0.01,+0.14,-0.03][state.cycle];

    /* === AI === */
    if(state.aiOn) state.aiRuntime=Math.min(1,Math.max(.22,state.aiRuntime+(Math.random()-0.5)*0.015));
    if(Math.random()>0.90) state.aiInterventions++;

    /* === POOL === */
    state.pool.tvl*=1+(trend*(0.4+Math.random()*0.6));
    state.pool.change=trend;
    state.pool.yield=Math.max(1,Math.min(15,state.pool.yield+trend*30));

    /* === LAYERS === */
    for(let i=0;i<7;i++){
        let drift=(Math.random()-0.5)*0.012;
        if(i<3) drift+=trend*0.35;
        if(i==3) drift+=risk*0.8;
        if(state.cycle===2 && i>4) drift-=0.03;
        state.layers[i]=Math.max(0.12,Math.min(1,state.layers[i]+drift));
    }

    /* === DB / RPC === */
    state.db.latency=Math.max(6,Math.min(230,state.db.latency+(Math.random()-0.5)*4));
    state.db.writes=Math.max(14,state.db.writes+Math.round((Math.random()-0.5)*8));
    state.chain.block+=Math.round(Math.random()*4);
    state.chain.sync=Math.max(.72,Math.min(1,state.chain.sync+(Math.random()-0.5)*0.012));
    state.chain.rpc=Math.max(.9,Math.min(7.8,state.chain.rpc+(Math.random()-0.5)*0.12));

    /* === Throughput === */
    state.throughput.ops=Math.max(140,Math.min(5200,state.throughput.ops+Math.round((Math.random()-0.5)*160)));
    state.throughput.queue=Math.max(1,state.throughput.queue+Math.round((Math.random()-0.3)*6));

    /* vizuální update */
    render();
}

/* ===========================================================
   RENDER all UI from state
   =========================================================== */

function render(){

    /* AI */
    setFill($("#aiFill"),state.aiRuntime*100);
    $("#aiPercent").textContent=Math.round(state.aiRuntime*100)+"%";
    $("#aiInterventions").textContent=state.aiInterventions;
    $("#aiMode").textContent=state.aiOn?"AUTO":state.manual?"MANUAL":"OFF";
    setMS($("#aiMs"),state.aiRuntime);

    /* DB */
    setFill($("#dbFill"),100-state.db.latency);
    $("#dbLatency").textContent=state.db.latency+" ms";
    $("#dbWrites").textContent=state.db.writes;
    $("#dbIntegrity").textContent=state.db.integrity+"%";

    /* POOL */
    setFill($("#poolFill"),(state.pool.change+0.05)*100);
    $("#tvl").textContent=fmt(state.pool.tvl);
    $("#simYield").textContent=state.pool.yield.toFixed(1)+"%";
    $("#tvlChange").textContent=(state.pool.change>=0?"+":"")+ (state.pool.change*100).toFixed(2)+"%";

    /* CHAIN */
    setFill($("#chainFill"),state.chain.sync*100);
    $("#blockHeight").textContent="#"+fmt(state.chain.block);
    $("#rpcLatency").textContent=state.chain.rpc.toFixed(2)+" s";
    $("#syncPerc").textContent=Math.round(state.chain.sync*100)+"%";
    setMS($("#chainMs"),state.chain.sync);

    /* MULTI-SIG */
    const mp=state.ms.submitted/state.ms.required;
    setFill($("#msFill"),mp*100); setMS($("#msLight"),mp);

    /* THROUGHPUT */
    setFill($("#tpFill"),Math.min(100,(state.throughput.ops/2000)*100));
    $("#ops").textContent=fmt(state.throughput.ops);
    $("#queue").textContent=state.throughput.queue;
    $("#through").textContent=state.throughput.through;

    /* ENGINE 7-layers */
    state.layers.forEach((v,i)=>{
        setFill($("#L"+(i+1)),v*100);
        $("#L"+(i+1)+"pct").textContent=Math.round(v*100)+"%";
    });

    renderLogs();
}

/* ===========================================================
   INIT
   =========================================================== */

function start(){
    log("CORE ONLINE");
    log("Cycle-AI boot complete");
    setInterval(tick,280);
}
document.readyState==="loading"
    ? document.addEventListener("DOMContentLoaded",start)
    : start();

})();
