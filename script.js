<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>AYAS-7 Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background:#f4f4f4;
    margin:0;
    padding:0;
    display:flex;
    justify-content:center;
  }
  #main-container {
    max-width:1200px;
    width:100%;
    margin:20px;
    display:flex;
    flex-direction:column;
    gap:20px;
  }
  .row {
    display:flex;
    gap:20px;
    flex-wrap:wrap;
  }
  .left-box, .right-box {
    background:#fff;
    border-radius:8px;
    box-shadow:0 2px 6px rgba(0,0,0,0.1);
    padding:15px;
    flex:1;
    min-width:280px;
  }
  .layer-title { font-weight:bold; font-size:1.2em; }
  .layer-desc { margin:5px 0 10px 0; }
  .token-box { display:flex; gap:10px; margin-bottom:10px; }
  .token { flex:1; text-align:center; padding:5px; border-radius:5px; color:#fff; font-weight:bold; }
  .usd { background:#1da84f; }
  .gusd { background:#007bff; }
  .right-box h4 { margin:5px 0; }
  .right-box button { margin-top:5px; padding:5px 10px; border:none; background:#003063; color:white; border-radius:5px; cursor:pointer; }
  canvas { background:#f9f9f9; border-radius:5px; margin-top:10px; }
  @media(max-width:1000px){ .row { flex-direction:column; } }
</style>
</head>
<body>
<div id="main-container">

<!-- 7 vrstev -->
<script>
const layers = [
  {id:1, name:"Layer 1: Token Layer", desc:"Správa tokenů USDt.z a GUSD"},
  {id:2, name:"Layer 2: Liquidity Engine", desc:"Řízení likvidity a strategií"},
  {id:3, name:"Layer 3: Yield Routing", desc:"Optimalizace zhodnocení"},
  {id:4, name:"Layer 4: Risk & Compliance", desc:"Řízení rizik a audit"},
  {id:5, name:"Layer 5: FinTech Interaction", desc:"Interakce s členy a reporting"},
  {id:6, name:"Layer 6: Core Engine", desc:"Výpočetní jádro motoru"},
  {id:7, name:"Layer 7: Dashboard Layer", desc:"Vizualizace a přehled výkonu"}
];

// Vytvoření řádků
layers.forEach(layer=>{
  document.write(`
    <div class="row">
      <!-- Levý box -->
      <div class="left-box">
        <img src="https://raw.githubusercontent.com/petrholoubek/ayas7-dashboard/main/assets/${layer.id}.png" alt="Layer ${layer.id}">
        <div class="layer-title">${layer.name}</div>
        <div class="layer-desc">${layer.desc}</div>
        <div class="token-box">
          <div class="token usd">USDT.z: <span id="usd-${layer.id}">0</span></div>
          <div class="token gusd">GUSD: <span id="gusd-${layer.id}">0</span></div>
        </div>
        <canvas id="line-${layer.id}" height="100"></canvas>
      </div>

      <!-- Pravý box -->
      <div class="right-box">
        <h4>Přidat člena</h4>
        <label>Jméno: <input type="text" id="name-${layer.id}" value=""></label><br>
        <label>Email: <input type="email" id="email-${layer.id}" value=""></label><br>
        <label>Telefon: <input type="text" id="phone-${layer.id}" value=""></label><br>
        <label>Vklad CZK: <input type="number" id="member-${layer.id}" value="15000"></label>
        <button onclick="addMember(${layer.id})">Přidat člena</button>
      </div>
    </div>
  `);
});

// Sloupcový graf Win-Win – jen jeden pro všechny
document.write(`
  <div class="row">
    <div class="right-box" style="flex:1">
      <h4>Win-Win výnos družstva</h4>
      <canvas id="winwin-bar" height="100"></canvas>
    </div>
  </div>
`);

let winWinChart;
window.addEventListener('load', async ()=>{
  const ctxWW = document.getElementById('winwin-bar').getContext('2d');
  winWinChart = new Chart(ctxWW, {
    type:'bar',
    data:{
      labels: layers.map(l=>l.name),
      datasets:[{label:'Výnos %', data: layers.map(()=>Math.random()*6 + 4), backgroundColor:'green'}]
    },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:10}} }
  });

  // Inicializace line grafů
  layers.forEach(layer=>{
    const ctxLine = document.getElementById(`line-${layer.id}`).getContext('2d');
    layer.lineChart = new Chart(ctxLine, {
      type:'line',
      data:{ labels:["Týden 1","Týden 2","Týden 3","Týden 4"], datasets:[{label:'Výkon', data:[0,0,0,0], borderColor:'orange', tension:0.3, fill:false}]},
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  });
});

// Přidání člena a přepočet USD/GUSD
async function addMember(id){
  const vkladCZK = Number(document.getElementById(`member-${id}`).value);

  // Získání živého kurzu z API (např. CoinGecko)
  let kurzUSD = 25; // fallback
  try{
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=czk');
    const data = await res.json();
    if(data && data.tether && data.tether.czk) kurzUSD = data.tether.czk;
  } catch(e){ console.log('Chyba při načítání kurzu:', e); }

  const usd = Math.round(vkladCZK / kurzUSD);
  const gusd = Math.round(usd * 0.5);
  const ww = usd;

  document.getElementById(`usd-${id}`).innerText = usd;
  document.getElementById(`gusd-${id}`).innerText = gusd;
  document.getElementById(`ww-${id}`).innerText = ww;

  // Aktualizace line grafu (levý box)
  const layer = layers.find(l=>l.id===id);
  layer.lineChart.data.datasets[0].data = layer.lineChart.data.datasets[0].data.map(d=>d + usd/10);
  layer.lineChart.update();

  // Aktualizace Win-Win bar grafu
  winWinChart.data.datasets[0].data = layers.map(()=>Math.random()*6 + 4);
  winWinChart.update();
}
</script>

</div>
</body>
</html>
