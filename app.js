// ===== Defaults =====
const DEFAULTS = {
  pricePerCanCents: 229, // $2.29
  cansPerDay: 2,
  quitDate: null,
  bgColor: '#e9edf0'
};
const dayMs = 86400000;

// ===== Elements =====
const splash = document.getElementById('splash');
const appEl = document.getElementById('app');
const authEl = document.getElementById('auth');
const trackerEl = document.getElementById('tracker');
const motivationEl = document.getElementById('motivation');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');

// Settings inputs
const bgColorInput = document.getElementById('bgColor');
const sQuitDateInput = document.getElementById('sQuitDate');
const sPriceInput = document.getElementById('sPrice');
const sCansPerDayInput = document.getElementById('sCansPerDay');
const saveTrackingBtn = document.getElementById('saveTracking');
const accountView = document.getElementById('accountView');
const logoutBtn = document.getElementById('logoutBtn');

// Auth inputs
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Tiles & values
const moneyVal = document.getElementById('moneyVal');
const cansVal = document.getElementById('cansVal');
const daysVal = document.getElementById('daysVal');
const resetsVal = document.getElementById('resetsVal');
const resetJourneyBtn = document.getElementById('resetJourneyBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

// ===== State (per-user) =====
let currentUser = null;
let state = null; // { pricePerCanCents, cansPerDay, quitDate, bgColor, resetCount, resetHistory[] }

// ===== Utilities =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const toDollars = cents => (cents/100).toFixed(2);
const fmtDate = d => d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
const daysBetween = (a,b) => Math.max(0, Math.floor((b - a)/dayMs));

function loadUser(username){
  const raw = localStorage.getItem(`snux:user:${username}`);
  return raw ? JSON.parse(raw) : null;
}
function saveUser(username, obj){
  localStorage.setItem(`snux:user:${username}`, JSON.stringify(obj));
}
function hash(s){
  // simple, not secure—demo only
  let h = 0; for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))|0; } return String(h);
}

// ===== Auth flow =====
loginBtn.addEventListener('click', () => {
  const u = usernameInput.value.trim(); const p = passwordInput.value;
  if(!u || !p){ alert('Enter username and password'); return; }
  const rec = loadUser(u);
  if(!rec){ alert('No account found. Click Create Account.'); return; }
  if(rec.passwordHash !== hash(p)){ alert('Incorrect password.'); return; }
  currentUser = u; state = rec.data;
  enterApp();
});
signupBtn.addEventListener('click', () => {
  const u = usernameInput.value.trim(); const p = passwordInput.value;
  if(!u || !p){ alert('Enter username and password'); return; }
  if(loadUser(u)){ alert('Username already exists.'); return; }
  currentUser = u;
  state = { ...DEFAULTS, resetCount:0, resetHistory:[] };
  saveUser(currentUser, { passwordHash: hash(p), data: state });
  enterApp();
});
logoutBtn.addEventListener('click', () => {
  currentUser = null; state = null;
  showAuth();
  settingsModal.classList.add('hidden');
});

function enterApp(){
  authEl.classList.add('hidden');
  trackerEl.classList.remove('hidden');
  applyTheme();
  renderAccount();
  refreshStats();
  settingsSyncInputs();
}

function showAuth(){
  authEl.classList.remove('hidden');
  trackerEl.classList.add('hidden');
}

// ===== Settings modal =====
settingsBtn.addEventListener('click', ()=> {
  if(!currentUser){ alert('Please log in first.'); return; }
  settingsSyncInputs();
  settingsModal.classList.remove('hidden');
});
settingsClose.addEventListener('click', ()=> settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e)=>{ if(e.target === settingsModal) settingsModal.classList.add('hidden') });

function settingsSyncInputs(){
  if(!state) return;
  bgColorInput.value = state.bgColor || DEFAULTS.bgColor;
  sQuitDateInput.value = state.quitDate || "";
  sPriceInput.value = (state.pricePerCanCents || DEFAULTS.pricePerCanCents) / 100;
  sCansPerDayInput.value = state.cansPerDay || DEFAULTS.cansPerDay;
  accountView.innerHTML = `<div class="muted">Logged in as <b>${currentUser}</b></div>`;
}

bgColorInput.addEventListener('input', ()=> {
  state.bgColor = bgColorInput.value;
  persist(); applyTheme();
});

saveTrackingBtn.addEventListener('click', ()=> {
  const price = Math.max(0, Math.round(parseFloat(sPriceInput.value || "0") * 100));
  const cpd = Math.max(1, parseInt(sCansPerDayInput.value || "1", 10));
  const qd = sQuitDateInput.value || null;
  state.pricePerCanCents = price;
  state.cansPerDay = cpd;
  state.quitDate = qd;
  persist();
  refreshStats();
  alert('Tracking settings saved.');
});

function renderAccount(){
  accountView.innerHTML = `<div class="muted">Logged in as <b>${currentUser}</b></div>`;
}

function applyTheme(){
  document.documentElement.style.setProperty('--bg', state.bgColor || DEFAULTS.bgColor);
}

// ===== Motivation =====
const QUOTES = [
  "Every hour is a win — stack them.",
  "Strong choices, stronger days.",
  "You already did the hardest part: starting.",
  "Money saved is momentum earned.",
  "Craving passes. Wins accumulate."
];
function setDailyMotivation(){
  const idx = Math.floor(Date.now()/dayMs) % QUOTES.length;
  motivationEl.textContent = QUOTES[idx];
}

// ===== Tracker =====
function getDaysFree(){
  if(!state || !state.quitDate) return 0;
  const start = new Date(state.quitDate + "T00:00:00");
  return daysBetween(start, new Date());
}
function buildDailyRows(){
  const rows = [];
  if(!state || !state.quitDate) return rows;
  const start = new Date(state.quitDate + "T00:00:00");
  const today = new Date();
  for(let d=new Date(start), i=1; d<=today; d=new Date(d.getTime()+dayMs), i++){
    rows.push({
      idx:i,
      date:new Date(d),
      cansToday: state.cansPerDay,
      moneyTodayCents: state.cansPerDay * state.pricePerCanCents
    });
  }
  return rows;
}
function refreshStats(){
  if(!state){ return; }
  const days = getDaysFree();
  const cans = days * state.cansPerDay;
  const money = cans * state.pricePerCanCents;

  $('#daysVal').textContent = String(days);
  $('#cansVal').textContent = String(cans);
  $('#moneyVal').textContent = `$${toDollars(money)}`;
  $('#resetsVal').textContent = String(state.resetCount || 0);

  setDailyMotivation();
}

// ===== Reset Journey =====
resetJourneyBtn.addEventListener('click', () => {
  if(!state) return;
  if(!state.quitDate){ alert('No quit date set in Settings.'); return; }
  if(confirm('Restart Journey? This logs a reset and clears your quit date.')){
    state.resetCount = (state.resetCount || 0) + 1;
    if(!state.resetHistory) state.resetHistory = [];
    state.resetHistory.push({ atISO:new Date().toISOString(), previousQuitDate: state.quitDate });
    state.quitDate = null;
    persist();
    refreshStats();
    alert('Reset logged. Set a new quit date in Settings when you are ready.');
  }
});

// ===== Modal helpers =====
function openModal(title, bodyHtml){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }
modalClose.addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

// ===== Chart (inline canvas) =====
function renderLineChart(canvas, labels, values){
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const pad = 22; const innerW = canvas.clientWidth - pad*2; const innerH = canvas.clientHeight - pad*2;
  const maxVal = Math.max(...values, 1);

  // x-axis
  ctx.strokeStyle = 'rgba(0,0,0,.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.clientHeight - pad);
  ctx.lineTo(canvas.clientWidth - pad, canvas.clientHeight - pad);
  ctx.stroke();

  // line
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f59e0b';
  ctx.beginPath();
  values.forEach((v, i)=>{
    const x = pad + (i/(values.length-1 || 1)) * innerW;
    const y = pad + innerH - (v / maxVal) * innerH;
    if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // fill
  const grad = ctx.createLinearGradient(0, pad, 0, canvas.clientHeight - pad);
  grad.addColorStop(0, 'rgba(245,158,11,.25)');
  grad.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  values.forEach((v, i)=>{
    const x = pad + (i/(values.length-1 || 1)) * innerW;
    const y = pad + innerH - (v / maxVal) * innerH;
    if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad + innerW, canvas.clientHeight - pad);
  ctx.lineTo(pad, canvas.clientHeight - pad);
  ctx.closePath();
  ctx.fill();
}

// ===== Tile clicks =====
$$('.tile').forEach(tile => {
  tile.addEventListener('click', () => {
    if(!state){ return; }
    const type = tile.dataset.type;
    if(type === 'money'){
      const rows = buildDailyRows();
      let total = 0;
      const trs = rows.map(r=>{
        total += r.moneyTodayCents;
        return `<tr><td>${r.idx}</td><td>${fmtDate(r.date)}</td><td>${r.cansToday}</td><td>$${toDollars(r.moneyTodayCents)}</td><td>$${toDollars(total)}</td></tr>`;
      }).join('');
      openModal('Money Saved — Daily Breakdown', `<table class="table"><thead><tr><th>Day</th><th>Date</th><th>Cans</th><th>$ Today</th><th>$ Cumulative</th></tr></thead><tbody>${trs || '<tr><td colspan="5">No data yet.</td></tr>'}</tbody></table>`);
    }
    if(type === 'cans'){
      const rows = buildDailyRows();
      let total = 0;
      const trs = rows.map(r=>{ total += r.cansToday; return `<tr><td>${r.idx}</td><td>${fmtDate(r.date)}</td><td>${r.cansToday}</td><td>${total}</td></tr>`;}).join('');
      openModal('Cans Avoided — Daily Breakdown', `<table class="table"><thead><tr><th>Day</th><th>Date</th><th>Cans Today</th><th>Cans Cumulative</th></tr></thead><tbody>${trs || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody></table>`);
    }
    if(type === 'days'){
      const rows = buildDailyRows();
      const trs = rows.map(r=> `<tr><td>${r.idx}</td><td>${fmtDate(r.date)}</td></tr>`).join('');
      openModal('Days Free — Daily List', `<table class="table"><thead><tr><th>Day #</th><th>Date</th></tr></thead><tbody>${trs || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody></table>`);
    }
    if(type === 'chart'){
      const rows = buildDailyRows();
      const points = [];
      let cum = 0;
      for(const r of rows){
        cum += r.moneyTodayCents;
        const d = r.date;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const last = points[points.length-1];
        if(!last || last.key !== key){
          points.push({ key, label: d.toLocaleString(undefined,{month:'short', year:'2-digit'}), value: cum });
        }else{
          last.value = cum;
        }
      }
      const labels = points.map(p=>p.label);
      const values = points.map(p=>p.value/100);
      openModal('Money Saved Over Time', `<div class="muted" style="margin-bottom:8px">Cumulative by month</div><canvas id="chart" class="chart"></canvas>`);
      renderLineChart(document.getElementById('chart'), labels, values);
    }
    if(type === 'health'){
      const days = getDaysFree();
      const milestones = [
        {d:1, text:"Nicotine levels start dropping."},
        {d:3, text:"Cravings may start to ease for some."},
        {d:7, text:"One-week milestone."},
        {d:14, text:"Taste/smell often sharpen."},
        {d:30, text:"One month strong."},
        {d:90, text:"Three months — new normal building."},
        {d:180, text:"Six months — long-term groove."},
        {d:365, text:"One year — elite status."}
      ];
      const items = milestones.map(m=>`<tr><td>${m.d}</td><td>${m.text}</td><td>${days >= m.d ? "✅" : "—"}</td></tr>`).join('');
      openModal('Health Progress', `<table class="table"><thead><tr><th>Day</th><th>Milestone</th><th>Status</th></tr></thead><tbody>${items}</tbody></table>`);
    }
    if(type === 'resets'){
      const hist = (state.resetHistory || []).map((r,i)=> `<tr><td>${i+1}</td><td>${fmtDate(new Date(r.atISO))}</td><td>${r.previousQuitDate || '—'}</td></tr>`).join('');
      openModal('Reset Count — History', `<table class="table"><thead><tr><th>#</th><th>Reset At</th><th>Previous Quit Date</th></tr></thead><tbody>${hist || '<tr><td colspan="3">No resets logged.</td></tr>'}</tbody></table>`);
    }
  });
});

// ===== Persistence =====
function persist(){
  if(!currentUser || !state) return;
  saveUser(currentUser, { passwordHash: loadUser(currentUser)?.passwordHash || '', data: state });
}

// ===== Init =====
window.addEventListener('load', () => {
  setTimeout(()=>{
    splash.classList.add('hidden');
    appEl.classList.remove('hidden');
    showAuth();
  }, 600);
  // refresh stats periodically
  setInterval(()=>{ if(state) refreshStats(); }, 60000);
});
