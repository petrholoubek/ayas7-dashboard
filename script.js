// ====================== LEVÝ SLUPEC – MOTOR ======================
const layers = [
  {name:"Token Layer", desc:"Správa páru USDt.z / GUSD", img:"assets/1.png"},
  {name:"Liquidity Engine", desc:"Data z DEX / BSC, likvidita", img:"assets/2.png"},
  {name:"Yield Routing", desc:"Směrování a distribuce výnosů", img:"assets/3.png"},
  {name:"Risk & Compliance", desc:"Kontrola volatility a audit", img:"assets/4.png"},
  {name:"FinTech Interaction", desc:"Interakce s uživateli", img:"assets/5.png"},
  {name:"Core Engine", desc:"Výpočetní jádro AYAS", img:"assets/6.png"},
  {name:"Dashboard & Analytics", desc:"Vizualizace motoru", img:"assets/7.png"}
];

const motorColumn = document.getElementById('motor-column');

layers.forEach((layer,index)=>{
  const box = document.createElement('div');
  box.className='box';
  box.innerHTML=`
    <div class='box-title'><img src='${layer.img}' width='50' alt='Layer ${index+1}'> ${layer.name}</div>
    <div class='box-desc'>${layer.desc}</div>
    <canvas id='motor-chart-${index}' height='100'></canvas>
  `;
  motorColumn.appendChild(box);

  const ctx = document.getElementById(`motor-chart-${index}`).getContext('2d');
  new Chart(ctx,{
    type:'line',
    data:{
      labels:['T1','T2','T3','T4','T5'],
      datasets:[
        { label:'USDt.z', data:[12000,15000,17000,21000,25000], borderColor:'#1da84f', backgroundColor:'rgba(29,168,79,0.2)', fill:true, tension:0.4 },
        { label:'GUSD', data:[8000,9000,12000,14000,16000], borderColor:'#0066ff', backgroundColor:'rgba(0,102,255,0.2)', fill:true, tension:0.4 }
      ]
    },
    options:{ responsive:true, plugins:{ legend:{ position:'top' } }, scales:{ y:{ beginAtZero:true } } }
  });
});

// ====================== PRAVÝ SLUPEC – ČLENSKÁ ZÁKLADNA / DEX ======================
const functionColumn = document.getElementById('function-column');

let members = [];

function addMember(name, amountCZK){
  const ww = Math.round(amountCZK / 24.5); // převod na WW-KEY
  members.push({name, czk: amountCZK, ww});
  renderMembers();
  renderYields();
}

function renderMembers(){
  const container = document.getElementById('member-list');
  if(!container) return;
  container.innerHTML = members.map(m=>`<div class='member-entry'>${m.name}: ${m.czk} CZK → ${m.ww} WW-KEY</div>`).join('');
}

function renderYields(){
  const yieldDiv = document.getElementById('member-yield');
  if(!yieldDiv) return;
  const MONTHLY_YIELD = 0.05;
  yieldDiv.innerHTML = members.map(m=>{
    const yieldAmount = Math.round(m.ww*MONTHLY_YIELD);
    return `${m.name}: ${yieldAmount} WW-KEY (${(MONTHLY_YIELD*100).toFixed(1)}%)`;
  }).join('<br>');

  const totalYieldDiv = document.getElementById('total-yield');
  if(totalYieldDiv){
    const totalYield = members.reduce((sum,m)=>sum + Math.round(m.ww*MONTHLY_YIELD),0);
    totalYieldDiv.innerText = `Celkový měsíční výnos motoru: ${totalYield} WW-KEY`;
  }
}

// ====================== GLOBÁLNÍ MENU – hover efekty ======================
document.querySelectorAll('.nav-menu a').forEach(link=>{
  link.addEventListener('mouseenter', ()=> link.style.backgroundColor='#0073e6');
  link.addEventListener('mouseleave', ()=> link.style.backgroundColor='transparent');
});

// ====================== PŘÍKLAD DEX / KURZY ======================
function updateDexData(){
  // sem budeme volat BSC / PancakeSwap API a aktualizovat kurzy
  const dexDiv = document.getElementById('dex-data');
  if(dexDiv){
    dexDiv.innerHTML = `
      <div>USDT.z / USD: 1.00</div>
      <div>GUSD / USD: 1.00</div>
      <div>Objem USDT.z: 1500000</div>
      <div>Objem GUSD: 1200000</div>
    `;
  }
}

// voláme po načtení stránky
window.onload = ()=>{
  renderMembers();
  renderYields();
  updateDexData();
};
