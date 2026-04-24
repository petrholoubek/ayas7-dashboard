/*
 * AYAS-7 · AI Chat Widget (ARIA)
 * Přidej tento skript na konec <body> všech stránek (kromě info-snapshot a agent):
 * <script src="/supabase.js"></script>
 */

(function() {
  'use strict';

  const ARIA_API = 'https://ayas7.com/api/aria'; // API klíč je bezpečně na serveru
  const SNAP_URL = 'https://ayas7.com/api/snapshot';

  // Nepridavej na agent.html nebo info-snapshot
  if (location.pathname.includes('agent.html') || location.pathname.includes('info-snapshot')) return;

  // ═══ CSS ═══
  const style = document.createElement('style');
  style.textContent = `
  #aria-fab {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    width: 54px; height: 54px; border-radius: 50%; border: none; cursor: pointer;
    background: linear-gradient(135deg, #0ea5e9, rgba(56,189,248,0.7));
    box-shadow: 0 8px 24px rgba(14,165,233,0.45);
    display: flex; align-items: center; justify-content: center;
    transition: transform .2s, box-shadow .2s;
    color: white;
  }
  #aria-fab:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(14,165,233,0.6); }
  #aria-fab.open { background: linear-gradient(135deg, #475569, #334155); box-shadow: 0 4px 16px rgba(0,0,0,.4); }
  #aria-badge {
    position: absolute; top: -2px; right: -2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #22c55e; border: 2px solid #020917;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700; color: white; font-family: sans-serif;
  }
  #aria-panel {
    position: fixed; bottom: 90px; right: 24px; z-index: 9998;
    width: 360px; max-height: 520px;
    background: rgba(4,11,24,0.98);
    border: 1px solid rgba(56,189,248,0.18);
    border-radius: 20px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(56,189,248,0.06) inset;
    display: none; flex-direction: column;
    overflow: hidden; font-family: 'DM Sans', 'Segoe UI', sans-serif;
    transform: translateY(12px) scale(0.96); opacity: 0;
    transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease;
  }
  #aria-panel.visible {
    display: flex;
    transform: translateY(0) scale(1); opacity: 1;
  }
  .aria-head {
    padding: 14px 16px; border-bottom: 1px solid rgba(56,189,248,0.1);
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(180deg, rgba(14,165,233,0.08), transparent);
  }
  .aria-head-avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.25);
    display: flex; align-items: center; justify-content: center;
  }
  .aria-head-info { flex: 1; min-width: 0; }
  .aria-head-name { font-size: 13px; font-weight: 600; color: #f8fafc; font-family: 'Space Grotesk', sans-serif; }
  .aria-head-sub { font-size: 10px; color: #64748b; letter-spacing: .08em; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
  .aria-online-dot { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.8); flex-shrink: 0; animation: ariadot 2s ease-in-out infinite; }
  @keyframes ariadot { 0%,100%{opacity:1}50%{opacity:.4} }
  .aria-close { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,.06); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all .15s; }
  .aria-close:hover { background: rgba(255,255,255,.12); color: #94a3b8; }
  .aria-msgs {
    flex: 1; overflow-y: auto; padding: 14px 14px 8px; display: flex; flex-direction: column; gap: 10px;
    min-height: 0; scroll-behavior: smooth;
  }
  .aria-msgs::-webkit-scrollbar { width: 3px; }
  .aria-msgs::-webkit-scrollbar-thumb { background: rgba(56,189,248,.15); border-radius: 99px; }
  .aria-msg { display: flex; gap: 8px; animation: ariamsgin .25s ease; }
  @keyframes ariamsgin { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  .aria-msg.user { flex-direction: row-reverse; }
  .aria-msg-av { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  .aria-msg.agent .aria-msg-av { background: rgba(56,189,248,.12); border: 1px solid rgba(56,189,248,.2); color: #7dd3fc; }
  .aria-msg.user .aria-msg-av { background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.2); color: #4ade80; }
  .aria-bubble { max-width: 82%; padding: 9px 13px; font-size: 13px; line-height: 1.6; border-radius: 14px; }
  .aria-msg.agent .aria-bubble { background: rgba(56,189,248,.07); border: 1px solid rgba(56,189,248,.1); border-bottom-left-radius: 3px; color: #e2e8f0; }
  .aria-msg.user .aria-bubble { background: rgba(34,197,94,.08); border: 1px solid rgba(34,197,94,.12); border-bottom-right-radius: 3px; color: #e2e8f0; }
  .aria-bubble strong { color: #f8fafc; font-weight: 600; }
  .aria-bubble code { font-family: monospace; font-size: 11px; background: rgba(56,189,248,.12); padding: 1px 4px; border-radius: 3px; color: #7dd3fc; }
  .aria-typing { display: none; gap: 4px; padding: 8px 12px; background: rgba(56,189,248,.07); border: 1px solid rgba(56,189,248,.1); border-radius: 14px; border-bottom-left-radius: 3px; width: fit-content; }
  .aria-typing.on { display: flex; }
  .aria-td { width: 5px; height: 5px; border-radius: 50%; background: #7dd3fc; animation: ariatd .85s ease-in-out infinite; }
  .aria-td:nth-child(2){animation-delay:.14s}.aria-td:nth-child(3){animation-delay:.28s}
  @keyframes ariatd { 0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1} }
  .aria-quick { padding: 6px 14px 8px; display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid rgba(56,189,248,.06); }
  .aria-qbtn { padding: 5px 11px; border-radius: 999px; background: rgba(56,189,248,.07); border: 1px solid rgba(56,189,248,.12); color: #94a3b8; font-size: 11px; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
  .aria-qbtn:hover { background: rgba(56,189,248,.14); color: #7dd3fc; border-color: rgba(56,189,248,.25); }
  .aria-input-row { padding: 10px 12px; border-top: 1px solid rgba(56,189,248,.08); display: flex; gap: 8px; align-items: flex-end; }
  .aria-input { flex: 1; background: rgba(255,255,255,.05); border: 1px solid rgba(56,189,248,.1); border-radius: 10px; color: #e2e8f0; font-family: inherit; font-size: 13px; padding: 9px 12px; resize: none; outline: none; min-height: 38px; max-height: 100px; transition: border-color .15s; }
  .aria-input::placeholder { color: #334155; }
  .aria-input:focus { border-color: rgba(56,189,248,.25); }
  .aria-send { width: 36px; height: 36px; border-radius: 9px; border: none; background: linear-gradient(135deg, #0ea5e9, rgba(56,189,248,.6)); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
  .aria-send:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(14,165,233,.4); }
  .aria-send:disabled { opacity: .4; cursor: default; transform: none; box-shadow: none; }
  @media (max-width: 420px) {
    #aria-panel { width: calc(100vw - 32px); right: 16px; bottom: 84px; }
    #aria-fab { right: 16px; bottom: 16px; }
  }
  `;
  document.head.appendChild(style);

  // ═══ HTML ═══
  const fab = document.createElement('button');
  fab.id = 'aria-fab';
  fab.innerHTML = `
    <div id="aria-badge">AI</div>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" id="aria-icon-open">
      <circle cx="12" cy="9" r="4" stroke="white" stroke-width="1.6"/>
      <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="12" cy="9" r="1.5" fill="rgba(255,255,255,0.4)"/>
    </svg>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" id="aria-icon-close" style="display:none">
      <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 'aria-panel';
  panel.innerHTML = `
    <div class="aria-head">
      <div class="aria-head-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="9" r="4" stroke="#38bdf8" stroke-width="1.5"/>
          <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="aria-head-info">
        <div class="aria-head-name">ARIA · AI Poradce</div>
        <div class="aria-head-sub"><span class="aria-online-dot"></span>Online · WIN.WIN</div>
      </div>
      <button class="aria-close" onclick="ariaWidget.toggle()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="aria-msgs" id="aria-msgs"></div>
    <div class="aria-msg agent" id="aria-typing-row" style="padding:0 14px 4px;display:none">
      <div class="aria-msg-av">A</div>
      <div class="aria-typing on" id="aria-typing">
        <span class="aria-td"></span><span class="aria-td"></span><span class="aria-td"></span>
      </div>
    </div>
    <div class="aria-quick" id="aria-quick">
      <button class="aria-qbtn" onclick="ariaWidget.ask('Co je WW-Key?')">WW-Key</button>
      <button class="aria-qbtn" onclick="ariaWidget.ask('Jak funguje CRX?')">CRX</button>
      <button class="aria-qbtn" onclick="ariaWidget.ask('Jak funguje kariérní program?')">Kariéra</button>
      <button class="aria-qbtn" onclick="ariaWidget.ask('Jaké benefity mohu uplatnit?')">Benefity</button>
    </div>
    <div class="aria-input-row">
      <textarea class="aria-input" id="aria-input" placeholder="Napište dotaz…" rows="1" onkeydown="ariaWidget.key(event)"></textarea>
      <button class="aria-send" id="aria-send" onclick="ariaWidget.send()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
      </button>
    </div>`;
  document.body.appendChild(panel);

  // ═══ WIDGET LOGIC ═══
  let msgs = [];
  let loading = false;
  let isOpen = false;
  let snap = null;

  // Načti snapshot
  fetch(SNAP_URL + '?v=' + Date.now(), {cache:'no-store'})
    .then(r => r.json()).then(d => { snap = d; }).catch(()=>{});

  const SYSTEM = `Jsi ARIA — AI poradce systému AYAS-7 a kooperativy WIN.WIN. Mluvíš česky, jsi přátelský a věcný.

WW-KEY: interní evidenční jednotka, kurz 1 WW-Key = 25 Kč, není cenný papír.
CRX (CREDIX): věrnostní poukázky generované ze zisku systému, uplatňují se v tržnici benefitů (elektřina, PHM, zlato, Pluxee, AutoBonus). Každý benefit stojí 30 CRX.
KARIÉRNÍ PROGRAM: Trader (16%) → Trader I (21%) → Trader II (26%) → Manager (36%) → Director (30%) matching bonus. Na Trader I potřebuješ 10 členů.
AYAS-7: 7-vrstvý deterministický finanční systém, multisig governance, BSC blockchain, PancakeSwap DEX, cíl 4-6% měsíční výnos.
TOKENY: WW-UNIT ~$1.156, WW-RESERVE ~$1.009, WW-KEY interní.
LIQUIDITY POOLY: USDT/BNB TVL ~$17.1M, WW-UNIT/USDT ~$881, WW-RESERVE/USDT ~$603.

Odpovídej stručně a věcně. Nedávej finanční ani právní rady.`;

  function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function md(t) {
    return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/`(.+?)`/g,'<code>$1</code>')
            .replace(/^- (.+)$/gm,'<li>$1</li>')
            .replace(/\n/g,'<br>');
  }

  function addMsg(role, content) {
    const c = document.getElementById('aria-msgs');
    const d = document.createElement('div');
    d.className = `aria-msg ${role}`;
    d.innerHTML = `
      <div class="aria-msg-av">${role==='agent'?'A':'Ty'}</div>
      <div class="aria-bubble">${role==='agent'?md(content):esc(content)}</div>`;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function setLoad(v) {
    loading = v;
    document.getElementById('aria-send').disabled = v;
    document.getElementById('aria-input').disabled = v;
    document.getElementById('aria-typing-row').style.display = v ? 'flex' : 'none';
    const c = document.getElementById('aria-msgs');
    if (v) c.scrollTop = c.scrollHeight;
  }

  window.ariaWidget = {
    toggle() {
      isOpen = !isOpen;
      fab.classList.toggle('open', isOpen);
      document.getElementById('aria-icon-open').style.display = isOpen ? 'none' : '';
      document.getElementById('aria-icon-close').style.display = isOpen ? '' : 'none';
      if (isOpen) {
        panel.style.display = 'flex';
        setTimeout(() => panel.classList.add('visible'), 10);
        if (!msgs.length) {
          addMsg('agent', 'Ahoj! Jsem **ARIA**. Mohu vám pomoci s dotazy o WW-Key, CRX, benefitech nebo kariérním programu WIN.WIN.');
        }
        setTimeout(() => document.getElementById('aria-input').focus(), 300);
      } else {
        panel.classList.remove('visible');
        setTimeout(() => { panel.style.display = 'none'; }, 250);
      }
    },
    ask(q) {
      document.getElementById('aria-input').value = q;
      this.send();
    },
    key(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    },
    async send() {
      const inp = document.getElementById('aria-input');
      const txt = inp.value.trim();
      if (!txt || loading) return;
      inp.value = '';
      document.getElementById('aria-quick').style.display = 'none';
      addMsg('user', txt);
      msgs.push({role:'user', content:txt});
      setLoad(true);
      try {
        const r = await fetch(ARIA_API, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            messages: msgs.slice(-12),
            systemExtra: SYSTEM + (snap ? `\n\nLIVE DATA: WW-UNIT $${Number(snap.tokens?.WW_UNIT?.priceUSD||0).toFixed(4)}, Health: ${snap.meta?.health||0}%, CRX total: ${snap.crx?.total||0}` : '')
          })
        });
        const data = await r.json();
        const reply = data.content?.[0]?.text || 'Omlouvám se, nepodařilo se získat odpověď.';
        msgs.push({role:'assistant', content:reply});
        setLoad(false);
        addMsg('agent', reply);
      } catch(e) {
        setLoad(false);
        addMsg('agent', 'Omlouvám se, nastala technická chyba. Zkuste to prosím znovu.');
      }
    }
  };

  fab.addEventListener('click', () => ariaWidget.toggle());

})();
