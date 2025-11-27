// script.js

const layers = [
  {id:1, name:"Layer 1: Token Layer", desc:"Správa tokenů USDt.z a GUSD"},
  {id:2, name:"Layer 2: Liquidity Engine", desc:"Řízení likvidity a strategií"},
  {id:3, name:"Layer 3: Yield Routing", desc:"Optimalizace zhodnocení"},
  {id:4, name:"Layer 4: Risk & Compliance", desc:"Řízení rizik a audit"},
  {id:5, name:"Layer 5: FinTech Interaction", desc:"Interakce s členy a reporting"},
  {id:6, name:"Layer 6: Core Engine", desc:"Výpočetní jádro motoru"},
  {id:7, name:"Layer 7: Dashboard Layer", desc:"Vizualizace a přehled výkonu"}
];

// Simulace aktuálního kurzu CZK → USDT.z
function getCurrentRate() {
    return 0.04; // 1 CZK = 0.04 USDT.z, uprav podle skutečných dat
}

// Generuje náhodné GUSD (demo pro GitHub)
function generateGUSD() {
    return Math.floor(Math.random() * 10000) + 1000; // 1000-10999
}

// Inicializace grafů
layers.forEach(layer => {
    // Line chart
    const ctxLine = document.getElementById(`line-${layer.id}`).getContext('2d');
    layer.lineChart = new Chart(ctxLine, {
        type:'line',
        data:{ labels:["Týden 1","Týden 2","Týden 3","Týden 4"], datasets:[{label:'Výkon', data:[0,0,0,0], borderColor:'orange', tension:0.3, fill:false}]},
        options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });

    // Bar chart (pravá strana pouze jeden pro celé družstvo)
    const ctxBar = document.getElementById(`bar-${layer.id}`).getContext('2d');
    layer.barChart = new Chart(ctxBar, {
        type:'bar',
        data:{ labels:["Družstvo"], datasets:[{label:'Zhodnocení %', data:[0], backgroundColor:'green'}] },
        options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, min:0, max:10}} }
    });
});

// Funkce pro přidání člena
function addMember(id){
    const vkladCZK = Number(document.getElementById(`member-${id}`).value);

    // Převod CZK → USDT.z
    const rate = getCurrentRate();
    const usdt = +(vkladCZK * rate).toFixed(2);

    // GUSD demo
    const gusd = generateGUSD();

    // WW_key pouze z USDT.z
    const ww_key = usdt;

    // Aktualizace UI
    document.getElementById(`usd-${id}`).innerText = usdt;
    document.getElementById(`gusd-${id}`).innerText = gusd;
    document.getElementById(`ww-${id}`).innerText = ww_key;

    // Aktualizace grafů levé strany
    const layer = layers.find(l => l.id === id);
    layer.lineChart.data.datasets[0].data = layer.lineChart.data.datasets[0].data.map(d => d + usdt/10);
    layer.lineChart.update();

    // Bar chart - jedno sloupcové zhodnocení družstva (demo)
    layer.barChart.data.datasets[0].data = [Math.random() * 6 + 4]; // 4-10 %
    layer.barChart.update();

    // Živá data DEX a kurz
    document.getElementById(`dex-${id}`).innerText = (Math.random() * 1000).toFixed(2);
    document.getElementById(`rate-${id}`).innerText = rate.toFixed(2);
}
