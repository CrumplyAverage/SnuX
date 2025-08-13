// ===== Config =====
const PRICE_PER_CAN_CENTS = 229; // $2.29
const CANS_PER_DAY = 2;
const DAILY_SPEND_CENTS = PRICE_PER_CAN_CENTS * CANS_PER_DAY;

// ===== State =====
let quitDateStr = null;
let resetCount = 0;
let resetHistory = []; // [{atISO, previousQuitDate}]

// ===== Elements =====
const splash = document.getElementById('splash');
const appEl = document.getElementById('app');
const landingEl = document.getElementById('landing');
const trackerEl = document.getElementById('tracker');

const quitDateInput = document.getElementById('quitDate');
const startBtn = document.getElementById('startBtn');
const resetJourneyBtn = document.getElementById('resetJourneyBtn');

const moneyVal = document.getElementById('moneyVal');
const cansVal = document.getElementById('cansVal');
const daysVal = document.getElementById('daysVal');
const resetsVal = document.getElementById('resetsVal');

const motivationEl = document.getElementById('motivation');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

const tiles = document.querySelectorAll('.tile');

// ===== Utils =====
const toDollars = cents => (cents/100).toFixed(2);
const dayMs = 24*60*60*1000;
const fmtDate = d => d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
const daysBetween = (start, end) => Math.max(0, Math.floor((end - start) / dayMs));

function getDaysFree() {
  if(!quitDateStr) return 0;
  const qd = new Date(quitDateStr + "T00:00:00");
  return daysBetween(qd, new Date());
}

function buildDailyRows() {
  const rows = [];
  if(!quitDateStr) return rows;
  const qd = new Date(quitDateStr + "T00:00:00");
  const today = new Date();
  for(let d = new Date(qd), i=1; d <= today; d = new Date(d.getTime() + dayMs), i++){
    const cansToday = CANS_PER_DAY;
    const moneyTodayCents = DAILY_SPEND_CENTS;
    rows.push({
      idx: i,
      date: new Date(d),
      cansToday,
      moneyTodayCents
    });
  }
  return rows;
}

// ===== Motivation =====
const QUOTES = [
  "Every hour is a win — stack them.",
  "Comfort is temporary. Pride lasts longer.",
  "Strong choices, stronger days.",
  "You already did the hardest part: starting.",
  "Money saved is momentum earned.",
  "Craving passes. Wins accumulate."
];
function setDailyMotivation(){
  const dayIndex = Math.floor(Date.now() / dayMs) % QUOTES.length;
  motivationEl.textContent = QUOTES[dayIndex];
}

// ===== Storage =====
function loadState(){
  quitDateStr = localStorage.getItem('quitDate') || null;
  resetCount = parseInt(localStorage.getItem('resetCount') || '0', 10);
  try{
    resetHistory = JSON.parse(localStorage.getItem('resetHistory') || '[]');
  }catch(e){ resetHistory = []; }
}
function saveQuitDate(dateStr){
  quitDateStr = dateStr;
  localStorage.setItem('quitDate', quitDateStr);
}
function logReset(){
  resetCount += 1;
  localStorage.setItem('resetCount', String(resetCount));
  const entry = { atISO: new Date().toISOString(), previousQuitDate: quitDateStr };
  resetHistory.push(entry);
  localStorage.setItem('resetHistory', JSON.stringify(resetHistory));
}

// ===== UI =====
function showLanding(){
  landingEl.classList.remove('hidden');
  trackerEl.classList.add('hidden');
}
function showTracker(){
  landingEl.classList.add('hidden');
  trackerEl.classList.remove('hidden');
  refreshStats();
}

function refreshStats(){
  const daysFree = getDaysFree();
  const cansAvoided = daysFree * CANS_PER_DAY;
  const moneySavedCents = cansAvoided * PRICE_PER_CAN_CENTS; // exact proportion

  moneyVal.textContent = `$${toDollars(moneySavedCents)}`;
  cansVal.textContent = `${cansAvoided}`;
  daysVal.textContent = `${daysFree}`;
  resetsVal.textContent = `${resetCount}`;

  setDailyMotivation();
}

// ===== Modal helpers =====
function openModal(title, bodyHtml){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modal.classList.remove('hidden');
}
function closeModal(){ modal.classList.add('hidden'); }
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

// ===== Chart drawing (no external libs) =====
function renderLineChart(canvas, labels, values){
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const pad = 22; const innerW = canvas.clientWidth - pad*2; const innerH = canvas.clientHeight - pad*2;
  const minVal = 0;
  const maxVal = Math.max(...values, 1);

  // axes
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.clientHeight - pad);
  ctx.lineTo(canvas.clientWidth - pad, canvas.clientHeight - pad);
  ctx.stroke();

  // line
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f6ad55';
  ctx.beginPath();
  values.forEach((v, i)=>{
    const x = pad + (i/(values.length-1 || 1)) * innerW;
    const y = pad + innerH - (v / maxVal) * innerH;
    if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // fill
  const grad = ctx.createLinearGradient(0, pad, 0, canvas.clientHeight - pad);
  grad.addColorStop(0, 'rgba(246,173,85,.25)');
  grad.addColorStop(1, 'rgba(246,173,85,0)');
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

// ===== Tile click handlers =====
function openMoneyBreakdown(){
  const rows = buildDailyRows();
  let total = 0;
  const trs = rows.map(r=>{
    total += r.moneyTodayCents;
    return `<tr>
      <td>${r.idx}</td>
      <td>${fmtDate(r.date)}</td>
      <td>${CANS_PER_DAY}</td>
      <td>$${toDollars(r.moneyTodayCents)}</td>
      <td>$${toDollars(total)}</td>
    </tr>`;
  }).join('');
  const html = `<table class="table">
    <thead><tr><th>Day</th><th>Date</th><th>Cans</th><th>$ Today</th><th>$ Cumulative</th></tr></thead>
    <tbody>${trs || '<tr><td colspan="5">No data yet.</td></tr>'}</tbody>
  </table>`;
  openModal('Money Saved — Daily Breakdown', html);
}

function openCansBreakdown(){
  const rows = buildDailyRows();
  let total = 0;
  const trs = rows.map(r=>{
    total += r.cansToday;
    return `<tr>
      <td>${r.idx}</td>
      <td>${fmtDate(r.date)}</td>
      <td>${r.cansToday}</td>
      <td>${total}</td>
    </tr>`;
  }).join('');
  const html = `<table class="table">
    <thead><tr><th>Day</th><th>Date</th><th>Cans Today</th><th>Cans Cumulative</th></tr></thead>
    <tbody>${trs || '<tr><td colspan="4">No data yet.</td></tr>'}</tbody>
  </table>`;
  openModal('Cans Avoided — Daily Breakdown', html);
}

function openDaysBreakdown(){
  const rows = buildDailyRows();
  const trs = rows.map(r=> `<tr><td>${r.idx}</td><td>${fmtDate(r.date)}</td></tr>`).join('');
  const html = `<table class="table">
    <thead><tr><th>Day #</th><th>Date</th></tr></thead>
    <tbody>${trs || '<tr><td colspan="2">No data yet.</td></tr>'}</tbody>
  </table>`;
  openModal('Days Free — Daily List', html);
}

function openChart(){
  const rows = buildDailyRows();
  // reduce to monthly points for readability
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
      last.value = cum; // overwrite to end-of-month cumulative
    }
  }
  const labels = points.map(p=>p.label);
  const values = points.map(p=>p.value/100);

  const html = `<div style="margin-bottom:10px; color:var(--muted)">Cumulative savings by month</div>
  <canvas id="chart" class="chart"></canvas>`;
  openModal('Money Saved Over Time', html);
  const canvas = document.getElementById('chart');
  renderLineChart(canvas, labels, values);
}

function openHealth(){
  const days = getDaysFree();
  const milestones = [
    {d:1, text:"Nicotine levels drop. First clean day logged."},
    {d:3, text:"Cravings begin to taper for some users."},
    {d:7, text:"One week — huge momentum."},
    {d:14, text:"Taste/smell may sharpen."},
    {d:30, text:"One month — habit pathways weakening."},
    {d:90, text:"Three months — major routine reset."},
    {d:180, text:"Six months — long-term groove."},
    {d:365, text:"One year — legendary."}
  ];
  const items = milestones.map(m=>`<tr>
    <td>${m.d}</td>
    <td>${m.text}</td>
    <td>${days >= m.d ? "✅" : "—"}</td>
  </tr>`).join('');
  const html = `<table class="table">
    <thead><tr><th>Day</th><th>Milestone</th><th>Status</th></tr></thead>
    <tbody>${items}</tbody>
  </table>`;
  openModal('Health Progress', html);
}

function openResets(){
  const rows = resetHistory.map((r,i)=>{
    const when = new Date(r.atISO);
    return `<tr><td>${i+1}</td><td>${fmtDate(when)}</td><td>${r.previousQuitDate || '—'}</td></tr>`;
  }).join('');
  const html = `<table class="table">
    <thead><tr><th>#</th><th>Reset At</th><th>Previous Quit Date</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">No resets logged.</td></tr>'}</tbody>
  </table>`;
  openModal('Reset Count — History', html);
}

// ===== Event bindings =====
startBtn.addEventListener('click', () => {
  const d = quitDateInput.value;
  if(!d){ alert('Please select your quit date.'); return; }
  saveQuitDate(d);
  showTracker();
});

resetJourneyBtn.addEventListener('click', () => {
  if(!quitDateStr){ return; }
  if(confirm('Restart Journey? This logs a reset and returns you to the date picker.')){
    logReset();
    localStorage.removeItem('quitDate');
    quitDateStr = null;
    showLanding();
    refreshStats();
  }
});

tiles.forEach(tile => {
  tile.addEventListener('click', () => {
    const type = tile.dataset.type;
    if(type === 'money') openMoneyBreakdown();
    else if(type === 'cans') openCansBreakdown();
    else if(type === 'days') openDaysBreakdown();
    else if(type === 'chart') openChart();
    else if(type === 'health') openHealth();
    else if(type === 'resets') openResets();
  });
});

// ===== Init on load =====
window.addEventListener('load', () => {
  loadState();
  // Splash fade-out
  setTimeout(() => {
    splash.classList.add('hidden');
    appEl.classList.remove('hidden');
    if(quitDateStr) showTracker(); else showLanding();
  }, 900);
  // Live refresh
  setInterval(refreshStats, 60*1000);
});
