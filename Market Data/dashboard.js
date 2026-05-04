/* ═══════════════════════════════
   CONFIG
═══════════════════════════════ */
const FINNHUB_KEY = 'd7s6969r01qm28g8f9ogd7s6969r01qm28g8f9p0';
const FINNHUB_REST = `https://finnhub.io/api/v1`;
const FINNHUB_WS   = `wss://ws.finnhub.io?token=${FINNHUB_KEY}`;

// Binance — try port 443 first (works from file://), fall back to 9443

const ESPN = {
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  epl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard'
};

const WX_CITIES = [
  {name:'London',lat:51.5074,lon:-0.1278},
  {name:'New York',lat:40.7128,lon:-74.006},
  {name:'Tokyo',lat:35.6762,lon:139.6503},
  {name:'Dubai',lat:25.2048,lon:55.2708},
  {name:'Sydney',lat:-33.8688,lon:151.2093},
  {name:'São Paulo',lat:-23.5505,lon:-46.6333}
];

const CSYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const CM = {
  BTCUSDT:{s:'BTC',n:'Bitcoin',cg:'bitcoin'},
  ETHUSDT:{s:'ETH',n:'Ethereum',cg:'ethereum'},
  SOLUSDT:{s:'SOL',n:'Solana',cg:'solana'},
  BNBUSDT:{s:'BNB',n:'BNB Chain',cg:'binancecoin'}
};
const SSYMS = ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','JPM'];
const SM = {AAPL:'Apple',MSFT:'Microsoft',NVDA:'NVIDIA',TSLA:'Tesla',AMZN:'Amazon',META:'Meta',GOOGL:'Alphabet',JPM:'JPMorgan'};
const MAX_H = 120;

/* ═══════════════════════════════
   STATE
═══════════════════════════════ */
const S = {
  cP:{},cH:{},cC:{},cOpen:{},
  sP:{},sH:{},sC:{},sOpen:{},sHi:{},sLo:{},
  sel:'BTCUSDT', activeSport:'nba',
  updates:0, bucket:0, connAt:null,
  bWs:null, fWs:null,
  chart:null, chart2:null,
  cryptoMethod:'—', stocksMethod:'—'
};

/* ═══════════════════════════════
   UTILS
═══════════════════════════════ */
function fmtPrice(p) {
  if (p === undefined || p === null || isNaN(p)) return '—';
  if (p >= 10000) return p.toLocaleString('en-GB', {maximumFractionDigits:0});
  if (p >= 1000)  return p.toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (p >= 1)     return p.toFixed(2);
  return p.toFixed(4);
}
function fmtChg(pct) {
  if (pct === undefined || pct === null || isNaN(pct)) return '—';
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}
function now() { return new Date().toLocaleTimeString('en-GB', {hour12:false}); }
function addHistory(obj, sym, val) {
  if (!obj[sym]) obj[sym] = [];
  obj[sym].push(val);
  if (obj[sym].length > MAX_H) obj[sym].shift();
}
function setDot(id, state, label) {
  const d = document.getElementById('d-' + id);
  const l = document.getElementById('l-' + id);
  if (d) { d.className = 'sbar-dot ' + state; }
  if (l && label) l.textContent = label;
}
function setPill(id, cls, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'pill ' + cls;
  el.innerHTML = `<div class="dot${cls==='off'?' nodot':''}"></div>${label}`;
}

/* ═══════════════════════════════
   CLOCK + RATE
═══════════════════════════════ */
setInterval(() => {
  document.getElementById('clk').textContent = new Date().toLocaleTimeString('en-GB',{hour12:false});
}, 1000);
setInterval(() => {
  document.getElementById('stR').textContent = S.bucket;
  S.bucket = 0;
}, 1000);

/* ═══════════════════════════════
   TABS
═══════════════════════════════ */
function switchTab(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'sports') fetchSport(S.activeSport, null);
}
function showSport(sport, el) {
  S.activeSport = sport;
  document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  fetchSport(sport, null);
}

/* ═══════════════════════════════════════════
   BINANCE WEBSOCKET (with port 443 + fallback)
   Public stream — no key needed.
   wss://stream.binance.com/stream (port 443)
   Fallback: port 9443
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   BINANCE REST — every 2 seconds per coin.
   api.binance.com/api/v3/ticker/price — no key,
   open CORS, works from file:// in all browsers.
   Same approach as the simple btc-price.html snippet.
════════════════════════════════════════════════════ */
const BIN_TICKER = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';

async function fetchBinanceTicker(sym) {
  const r = await fetch(BIN_TICKER + sym);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function startBinanceREST() {
  if (!S.connAt) {
    S.connAt = new Date();
    document.getElementById('stT').textContent = S.connAt.toLocaleTimeString('en-GB',{hour12:false});
  }
  setPill('cPill', 'live', 'Crypto Live');
  setDot('binance', 'live', 'Binance REST 2s');
  document.getElementById('stM').textContent = 'REST 2s';
  ['cBadge','cBadge2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = 'Binance REST'; el.className = 'sb live'; }
  });
  pushFeed('<strong>Binance REST</strong> — <span class="gu">live</span>. Polling all pairs every 2s.');

  async function poll() {
    try {
      const results = await Promise.all(CSYMS.map(fetchBinanceTicker));
      results.forEach((d, i) => {
        const sym   = CSYMS[i];
        const price = parseFloat(d.lastPrice);
        const pct   = parseFloat(d.priceChangePercent);
        const prev  = S.cP[sym];
        S.cP[sym]   = price;
        S.cC[sym]   = pct;
        addHistory(S.cH, sym, price);
        renderCard(sym, price, pct, prev);
        renderCard2(sym, price, pct, prev);
        S.updates++; S.bucket++;
        document.getElementById('stU').textContent  = S.updates.toLocaleString();
        document.getElementById('stU2').textContent = S.updates.toLocaleString();
      });
      updateTape();
      refreshChart();
    } catch(err) {
      setDot('binance', 'error', 'fetch error — retrying');
    }
  }

  poll(); // immediate first fetch
  setInterval(poll, 2000);
}


// startCryptoREST is an alias kept for compatibility — routes to Binance REST
function startCryptoREST() { startBinanceREST(); }

/* ═══════════════════════════════════════
   FINNHUB WEBSOCKET — Real stock trades
   wss://ws.finnhub.io?token=KEY
   Falls back to REST quotes on failure.
═══════════════════════════════════════ */
function connectFinnhubWS() {
  let connected = false;
  const ws = new WebSocket(FINNHUB_WS);
  S.fWs = ws;

  const timer = setTimeout(() => {
    if (!connected) { ws.close(); startStocksREST(); }
  }, 6000);

  ws.onopen = () => {
    connected = true;
    clearTimeout(timer);
    SSYMS.forEach(sym => ws.send(JSON.stringify({type:'subscribe', symbol:sym})));
    setPill('sPill', 'live', 'Stocks Live');
    setDot('finnhub', 'live', 'WS — connected');
    ['sBadge','sBadge2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = 'WebSocket Live'; el.className = 'sb ws'; }
    });
    pushFeed(`<strong>Finnhub WS</strong> — <span class="gu">connected</span>. Subscribed ${SSYMS.join(' · ')}.`);
    if (!S.connAt) {
      S.connAt = new Date();
      document.getElementById('stT').textContent = S.connAt.toLocaleTimeString('en-GB',{hour12:false});
    }
    initStocksTable();
    addStockChartBtns();
    updateStreamCount();
  };

  ws.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type !== 'trade' || !msg.data) return;
      msg.data.forEach(tr => {
        const sym = tr.s, price = parseFloat(tr.p);
        if (!SSYMS.includes(sym) || !price) return;
        const prev = S.sP[sym];
        S.sP[sym] = price;
        if (!S.sOpen[sym]) S.sOpen[sym] = price;
        const pct = ((price - S.sOpen[sym]) / S.sOpen[sym]) * 100;
        S.sC[sym] = pct;
        addHistory(S.sH, sym, price);
        if (!S.sHi[sym] || price > S.sHi[sym]) S.sHi[sym] = price;
        if (!S.sLo[sym] || price < S.sLo[sym]) S.sLo[sym] = price;
        updateStockRow(sym, price, pct, prev);
        S.updates++; S.bucket++;
        document.getElementById('stU').textContent = S.updates.toLocaleString();
        document.getElementById('stU2').textContent = S.updates.toLocaleString();
        updateTape();
        if (S.sel === sym) refreshChart();
      });
    } catch(err) {}
  };

  ws.onerror = () => {};
  ws.onclose = () => {
    clearTimeout(timer);
    if (!connected) { startStocksREST(); return; }
    setPill('sPill', 'connecting', 'Stocks…');
    setDot('finnhub', 'connecting', 'reconnecting…');
    updateStreamCount();
    setTimeout(connectFinnhubWS, 4000);
  };
}

/* ═══════════════════════════════════════════════
   STOCKS REST FALLBACK
   Finnhub REST is CORS-blocked from file://.
   Instead: show market-hours info and keep
   retrying the WebSocket every 15s.
   US market hours: Mon–Fri 14:30–21:00 UTC.
═══════════════════════════════════════════════ */
function startStocksREST() {
  const now = new Date();
  const utcH = now.getUTCHours(), utcM = now.getUTCMinutes();
  const utcMins = utcH * 60 + utcM;
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const marketOpen   = 14 * 60 + 30;  // 14:30 UTC = 09:30 ET
  const marketClose  = 21 * 60;        // 21:00 UTC = 16:00 ET
  const isWeekend    = day === 0 || day === 6;
  const isMarketOpen = !isWeekend && utcMins >= marketOpen && utcMins < marketClose;

  initStocksTable();
  addStockChartBtns();

  let msg;
  if (!isMarketOpen) {
    const opens = isWeekend ? 'Monday 14:30 UTC' : (utcMins < marketOpen ? 'today at 14:30 UTC' : 'tomorrow at 14:30 UTC');
    msg = `<strong>Stocks WS</strong> — market closed. Opens ${opens}. Will auto-connect when open.`;
    setPill('sPill', 'off', 'Market Closed');
    setDot('finnhub', 'connecting', 'market closed');
    ['sBadge','sBadge2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = 'Market Closed'; el.className = 'sb off'; }
    });
  } else {
    msg = '<strong>Stocks WS</strong> — connection failed. Market is open — retrying…';
    setPill('sPill', 'connecting', 'Stocks…');
    setDot('finnhub', 'connecting', 'retrying WS…');
  }
  pushFeed(msg);
  // Keep retrying WebSocket — it will connect once market opens
  setTimeout(connectFinnhubWS, 15000);
}

function updateStreamCount() {
  let n = 0;
  if (S.bWs && S.bWs.readyState === 1) n++;
  if (S.fWs && S.fWs.readyState === 1) n++;
  document.getElementById('stS').textContent = n;
}

/* ═══════════════════════════════
   CRYPTO CARDS
═══════════════════════════════ */
function initGrids() {
  ['cgrid','cgrid2'].forEach((gid, gi) => {
    document.getElementById(gid).innerHTML = CSYMS.map(sym => {
      const m = CM[sym], sfx = gi ? '_2' : '';
      return `<div class="cc${sym===S.sel?' sel':''}" id="cc${sfx}_${sym}" onclick="selChart('${sym}')">
        <div class="cc-sym">${m.s}</div>
        <div class="cc-name">${m.n}</div>
        <div class="cc-price" id="ccp${sfx}_${sym}">—</div>
        <div class="cc-chg" id="ccc${sfx}_${sym}">—</div>
        <div class="spk"><canvas id="spk${sfx}_${sym}"></canvas></div>
      </div>`;
    }).join('');
  });
}

function renderCard(sym, price, pct, prev, sfx) {
  sfx = sfx || '';
  const pe = document.getElementById('ccp' + sfx + '_' + sym);
  const ce = document.getElementById('ccc' + sfx + '_' + sym);
  if (!pe) return;
  const dir = prev !== undefined ? (price > prev ? 'fu' : price < prev ? 'fd' : '') : '';
  pe.textContent = '£' + fmtPrice(price);
  if (dir) { pe.className = 'cc-price ' + dir; setTimeout(() => { if (pe) pe.className = 'cc-price'; }, 450); }
  else pe.className = 'cc-price';
  ce.className = 'cc-chg ' + (pct >= 0 ? 'u' : 'd');
  ce.textContent = fmtChg(pct);
  drawSparkline('spk' + sfx + '_' + sym, S.cH[sym] || [], pct >= 0);
}
function renderCard2(sym, price, pct, prev) { renderCard(sym, price, pct, prev, '_2'); }

function drawSparkline(id, data, up) {
  if (data.length < 2) return;
  const c = document.getElementById(id);
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const w = c.offsetWidth || 180, h = 34;
  c.width = w * dpr; c.height = h * dpr;
  c.style.width = w + 'px'; c.style.height = h + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / rng) * (h - 5) - 3;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = up ? '#0ec87a' : '#f04f5e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, up ? 'rgba(14,200,122,.2)' : 'rgba(240,79,94,.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
}

/* ═══════════════════════════════
   STOCKS TABLE
═══════════════════════════════ */
function initStocksTable() {
  const tbl = `<table class="stbl">
    <thead><tr><th>Symbol</th><th>Price</th><th>Change</th><th>Day High</th><th>Day Low</th></tr></thead>
    <tbody>${SSYMS.map(s => `<tr>
      <td><span class="ssym">${s}</span><span class="sname">${SM[s]}</span></td>
      <td class="pcell" id="sp_${s}">—</td>
      <td><span class="cpill n" id="sc_${s}">—</span></td>
      <td class="pcell" id="sh_${s}" style="color:var(--m1)">—</td>
      <td class="pcell" id="sl_${s}" style="color:var(--m1)">—</td>
    </tr>`).join('')}</tbody></table>`;
  document.getElementById('sArea').innerHTML = tbl;
  // duplicate for stocks tab (different IDs)
  document.getElementById('sArea2').innerHTML = tbl.replace(/id="s([pch])_/g, 'id="s$1b_');
}

function updateStockRow(sym, price, pct, prev) {
  [['sp_','sc_','sh_','sl_'], ['spb_','scb_','shb_','slb_']].forEach(([pId,cId,hId,lId]) => {
    const pe = document.getElementById(pId + sym);
    const ce = document.getElementById(cId + sym);
    const he = document.getElementById(hId + sym);
    const le = document.getElementById(lId + sym);
    if (!pe) return;
    const dir = prev !== undefined ? (price > prev ? 'fu' : price < prev ? 'fd' : '') : '';
    pe.textContent = '£' + fmtPrice(price);
    if (dir) { pe.className = 'pcell ' + dir; setTimeout(() => { if (pe) pe.className = 'pcell'; }, 450); }
    ce.textContent = fmtChg(pct);
    ce.className = 'cpill ' + (pct > 0 ? 'u' : pct < 0 ? 'd' : 'n');
    if (he && S.sHi[sym]) he.textContent = '£' + fmtPrice(S.sHi[sym]);
    if (le && S.sLo[sym]) le.textContent = '£' + fmtPrice(S.sLo[sym]);
  });
}

/* ═══════════════════════════════
   CHART
═══════════════════════════════ */
function initChartCtrls() {
  ['cctrl','cctrl2'].forEach(ctrlId => {
    document.getElementById(ctrlId).innerHTML =
      CSYMS.map(s => `<button class="cbtn${s===S.sel?' active':''}" id="btn_${ctrlId}_${s}" onclick="selChart('${s}')">${CM[s].s}</button>`).join('') +
      '<div class="csep"></div>';
  });
}

function addStockChartBtns() {
  ['cctrl','cctrl2'].forEach(ctrlId => {
    const bar = document.getElementById(ctrlId);
    if (!bar) return;
    SSYMS.forEach(s => {
      if (document.getElementById('btn_' + ctrlId + '_' + s)) return;
      const b = document.createElement('button');
      b.className = 'cbtn'; b.id = 'btn_' + ctrlId + '_' + s;
      b.textContent = s; b.onclick = () => selChart(s);
      bar.appendChild(b);
    });
  });
}

function selChart(sym) {
  S.sel = sym;
  ['cctrl','cctrl2'].forEach(ctrlId => {
    document.querySelectorAll('#' + ctrlId + ' .cbtn').forEach(b => b.classList.remove('active'));
    const b = document.getElementById('btn_' + ctrlId + '_' + sym);
    if (b) b.classList.add('active');
  });
  ['','_2'].forEach(sfx => {
    document.querySelectorAll(`[id^="cc${sfx}_"]`).forEach(c => c.classList.remove('sel'));
    const cc = document.getElementById('cc' + sfx + '_' + sym);
    if (cc) cc.classList.add('sel');
  });
  buildChart('pchart', c => S.chart = c);
  buildChart('pchart2', c => S.chart2 = c);
}

function buildChart(canvasId, setter) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const sym = S.sel;
  const hist = S.cH[sym] || S.sH[sym] || [];
  const pct = S.cC[sym] ?? S.sC[sym] ?? 0;
  const up = pct >= 0, col = up ? '#0ec87a' : '#f04f5e';
  const chartRef = canvasId === 'pchart' ? S.chart : S.chart2;
  if (chartRef) chartRef.destroy();
  const ctx = canvas.getContext('2d');
  const h = canvas.parentElement.offsetHeight || 155;
  const c = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hist.map((_, i) => i),
      datasets: [{
        data: [...hist], borderColor: col, borderWidth: 1.5,
        tension: 0.35, pointRadius: 0, fill: true,
        backgroundColor: ctx2 => {
          const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, up ? 'rgba(14,200,122,.2)' : 'rgba(240,79,94,.2)');
          g.addColorStop(1, 'rgba(0,0,0,0)'); return g;
        }
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c2 => ' £' + fmtPrice(c2.raw) } } },
      scales: {
        x: { display: false },
        y: { position: 'right', grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a6a85', font: { family: 'IBM Plex Mono', size: 10 }, callback: v => '£' + fmtPrice(v) } }
      }
    }
  });
  setter(c);
}

function refreshChart() {
  const sym = S.sel;
  const hist = S.cH[sym] || S.sH[sym] || [];
  [S.chart, S.chart2].forEach(c => {
    if (!c || !hist.length) return;
    c.data.labels = hist.map((_, i) => i);
    c.data.datasets[0].data = [...hist];
    c.update('none');
  });
}

/* ═══════════════════════════════
   TICKER TAPE
═══════════════════════════════ */
function updateTape() {
  const items = [
    ...CSYMS.map(s => ({sym: CM[s].s, p: S.cP[s], pct: S.cC[s]})),
    ...SSYMS.filter(s => S.sP[s]).map(s => ({sym: s, p: S.sP[s], pct: S.sC[s]}))
  ];
  const html = items.map(it => {
    const pr = it.p ? '£' + fmtPrice(it.p) : '…';
    const ch = it.pct !== undefined ? fmtChg(it.pct) : '—';
    const cls = it.pct > 0 ? 'u' : it.pct < 0 ? 'd' : 'neu';
    return `<span class="ti"><span class="tsym">${it.sym}</span><span style="color:var(--tx)">${pr}</span><span class="${cls}">${ch}</span></span>`;
  }).join('');
  document.getElementById('t1').innerHTML = html;
  document.getElementById('t2').innerHTML = html;
}

/* ═══════════════════════════════════
   SPORTS — ESPN unofficial API
   No key required. Polls every 30s.
═══════════════════════════════════ */
async function fetchSport(sport, btn) {
  const area = document.getElementById('gArea');
  area.innerHTML = '<div class="gmsg">Loading ' + sport.toUpperCase() + ' scores…</div>';
  try {
    const r = await fetch(ESPN[sport]);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const events = data.events || [];
    renderGames(events, area);
    renderSideGames(events);
    document.getElementById('spBadge').textContent = 'Updated ' + now();
    document.getElementById('spBadge').className = 'sb live';
    setPill('spPill', 'liveb', 'Sports ✓');
    setDot('espn', 'live', events.length + ' games found');
    pushFeed('<strong>ESPN</strong> — ' + sport.toUpperCase() + ': <span class="gu">' + events.length + ' games</span>.');
  } catch(err) {
    area.innerHTML = `<div class="gmsg"><span class="gd">ESPN API error.</span><br><span style="color:var(--m2);font-size:11px">The endpoint may be temporarily unavailable.<br>Try again or check the console.</span></div>`;
    setDot('espn', 'error', 'error');
    document.getElementById('spBadge').textContent = 'Error';
    document.getElementById('spBadge').className = 'sb off';
  }
}

function renderGames(events, container) {
  if (!events.length) {
    container.innerHTML = '<div class="gmsg">No games scheduled today.<br><span style="color:var(--m2);font-size:11px">Check back on game days.</span></div>';
    return;
  }
  container.innerHTML = '<div class="games-list">' + events.map(gameHTML).join('') + '</div>';
}

function gameHTML(ev) {
  const comp = (ev.competitions || [])[0];
  if (!comp) return '';
  const st = comp.status || {}, stt = st.type || {};
  const isLive = stt.id === '2', isFinal = stt.id === '3', isPre = stt.id === '1';
  const comps = comp.competitors || [];
  const home = comps.find(c => c.homeAway === 'home') || comps[0] || {};
  const away = comps.find(c => c.homeAway === 'away') || comps[1] || {};
  const hT = home.team || {}, aT = away.team || {};
  const hA = hT.abbreviation || 'HOM', aA = aT.abbreviation || 'AWY';
  const hN = hT.displayName || hA, aN = aT.displayName || aA;
  const hS = home.score || '', aS = away.score || '';
  const hasScore = !isPre && (hS !== '' || aS !== '');
  const stClass = isLive ? 'live' : isFinal ? 'final' : 'pre';
  const stText = isFinal ? 'Final' : isLive ? (stt.shortDetail || 'Live') : gameTime(ev);

  return `<div class="gcard">
    <div class="tb">
      <div class="tab-a">${aA}</div>
      <div class="tab-n" title="${aN}">${aN}</div>
      ${hasScore ? `<div style="font-family:var(--mo);font-size:18px;font-weight:700;color:var(--tx);margin-top:4px">${aS}</div>` : ''}
    </div>
    <div class="gc">
      <div class="gst ${stClass}">${stText}</div>
      ${hasScore
        ? `<div class="gscore"><span>${aS}</span><span class="gsep-txt">–</span><span>${hS}</span></div>`
        : `<div class="gscore" style="font-size:14px;color:var(--m2)">vs</div>`}
      ${isLive && stt.shortDetail ? `<div class="gdetail">${stt.shortDetail}</div>` : ''}
    </div>
    <div class="tb away">
      <div class="tab-a">${hA}</div>
      <div class="tab-n" style="text-align:right" title="${hN}">${hN}</div>
      ${hasScore ? `<div style="font-family:var(--mo);font-size:18px;font-weight:700;color:var(--tx);margin-top:4px;text-align:right">${hS}</div>` : ''}
    </div>
  </div>`;
}

function gameTime(ev) {
  try {
    return new Date(ev.date).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'America/New_York'}) + ' ET';
  } catch(e) { return 'TBD'; }
}

function renderSideGames(events) {
  const el = document.getElementById('sideGames');
  const badge = document.getElementById('spSideBadge');
  if (!events.length) {
    el.innerHTML = '<div class="gmsg" style="font-size:11px">No games today</div>';
    badge.textContent = '0 games'; badge.className = 'sb off';
    return;
  }
  badge.textContent = events.length + ' games'; badge.className = 'sb live';
  el.innerHTML = '<div class="games-list">' + events.slice(0, 5).map(ev => {
    const comp = (ev.competitions || [])[0] || {};
    const st = comp.status || {}, stt = st.type || {};
    const comps = comp.competitors || [];
    const home = comps.find(c => c.homeAway === 'home') || comps[0] || {};
    const away = comps.find(c => c.homeAway === 'away') || comps[1] || {};
    const hA = (home.team || {}).abbreviation || '—';
    const aA = (away.team || {}).abbreviation || '—';
    const hS = home.score || '', aS = away.score || '';
    const isLive = stt.id === '2', isFinal = stt.id === '3';
    const stClass = isLive ? 'live' : isFinal ? 'final' : 'pre';
    const stText = isFinal ? 'FT' : isLive ? (stt.shortDetail || 'Live') : gameTime(ev);
    const score = (hS || aS) ? `${aS} – ${hS}` : 'vs';
    return `<div class="gcard" style="padding:8px 14px">
      <div class="tb"><div class="tab-a" style="font-size:12px">${aA}</div></div>
      <div class="gc">
        <div class="gst ${stClass}" style="font-size:9px">${stText}</div>
        <div style="font-family:var(--mo);font-size:14px;font-weight:700;color:var(--tx);margin-top:2px">${score}</div>
      </div>
      <div class="tb away"><div class="tab-a" style="font-size:12px">${hA}</div></div>
    </div>`;
  }).join('') + '</div>';
}

/* ═══════════════════════════════════════
   WEATHER — Open-Meteo (free, no key)
═══════════════════════════════════════ */
const WX_CODES = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Heavy showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm'};
function wxIcon(code, day) {
  if (code === 0) return day ? '☀️' : '🌙';
  if (code <= 2)  return '🌤️';
  if (code <= 3)  return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 65) return '🌧️';
  if (code <= 75) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

async function fetchWeather() {
  try {
    const results = await Promise.all(WX_CITIES.map(async city => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,is_day&wind_speed_unit=mph`;
      const r = await fetch(url);
      const d = await r.json();
      return { city: city.name, data: d.current };
    }));
    const html = results.map(({city, data}) => {
      const temp = Math.round(data.temperature_2m);
      const desc = WX_CODES[data.weathercode] || 'Unknown';
      const icon = wxIcon(data.weathercode, data.is_day);
      const wind = Math.round(data.windspeed_10m);
      const hum  = Math.round(data.relative_humidity_2m);
      return `<div class="wc">
        <div class="wic">${icon}</div>
        <div class="wi"><div class="wcity">${city}</div><div class="wdesc">${desc}</div></div>
        <div style="text-align:right;flex-shrink:0">
          <div class="wtemp">${temp}°C</div>
          <div class="wext">${wind}mph · ${hum}%</div>
        </div>
      </div>`;
    }).join('');
    ['wxCards','wxCards2'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
    setPill('wPill', 'liveb', 'Weather ✓');
    setDot('wx', 'live', 'updated ' + now());
    pushFeed('<strong>Open-Meteo</strong> — <span class="gu">weather updated</span> for 6 cities.');
  } catch(err) {
    setDot('wx', 'error', 'error');
    pushFeed('<strong>Weather</strong> — <span class="gd">fetch failed</span>.');
  }
}

function pushFeed(msg) {} // feed removed

/* ═══════════════════════════════
   BOOT — Everything auto-starts
═══════════════════════════════ */
initGrids();
initChartCtrls();
buildChart('pchart', c => S.chart = c);
buildChart('pchart2', c => S.chart2 = c);
updateTape();

pushFeed('<strong>Nexus Terminal</strong> — booting all feeds…');

// 1. Crypto — Binance REST, 2s polling. Same method as btc-price.html, extended to all pairs.
startBinanceREST();

// 2. Stocks: Finnhub WS → REST fallback
connectFinnhubWS();

// 3. Sports: ESPN API
fetchSport('nba', null).then(() => {
  setPill('spPill', 'liveb', 'Sports ✓');
});

// 4. Weather: Open-Meteo
fetchWeather();

// Polling refresh intervals
setInterval(fetchWeather, 5 * 60 * 1000);
setInterval(() => {
  if (document.getElementById('panel-sports').classList.contains('active')) {
    fetchSport(S.activeSport, null);
  }
}, 30 * 1000);
setInterval(() => {
  fetch(ESPN.nba).then(r => r.json()).then(d => renderSideGames(d.events || [])).catch(() => {});
}, 60 * 1000);

// Binance REST handles reconnects internally via setInterval