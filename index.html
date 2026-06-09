<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Janet's Tracker</title>
<style>
  :root {
    --cream: #FAF8F4;
    --white: #FFFFFF;
    --ink: #1C1A17;
    --ink-mid: #6B6760;
    --ink-light: #A8A5A0;
    --border: #E8E4DC;
    --teal: #1A7F6E;
    --teal-light: #E8F5F2;
    --teal-mid: #2FA899;
    --amber: #C8770A;
    --amber-light: #FEF4E5;
    --red: #C0392B;
    --red-light: #FDECEA;
    --gold: #E5A820;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
    font-size: 15px;
    line-height: 1.5;
  }

  header {
    background: var(--teal);
    padding: 1.5rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left h1 {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
  }

  .header-left p {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    margin-top: 2px;
  }

  .header-stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat {
    text-align: center;
    background: rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 8px 16px;
    min-width: 70px;
  }

  .stat-num {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  }

  .stat-label {
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tabs {
    background: var(--white);
    border-bottom: 1px solid var(--border);
    padding: 0 2rem;
    display: flex;
    gap: 0;
  }

  .tab {
    font-size: 14px;
    font-weight: 500;
    padding: 14px 20px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--ink-mid);
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tab:hover { color: var(--ink); }

  .tab.active {
    color: var(--teal);
    border-bottom-color: var(--teal);
  }

  .tab-count {
    background: var(--teal-light);
    color: var(--teal);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    min-width: 22px;
    text-align: center;
  }

  .tab.active .tab-count {
    background: var(--teal);
    color: #fff;
  }

  main { padding: 1.5rem 2rem; max-width: 820px; }

  .pane { display: none; }
  .pane.active { display: block; }

  .filters {
    display: flex;
    gap: 8px;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    font-size: 12px;
    font-weight: 500;
    padding: 5px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--white);
    cursor: pointer;
    color: var(--ink-mid);
    transition: all 0.15s;
  }

  .filter-btn:hover { border-color: var(--teal-mid); color: var(--teal); }
  .filter-btn.active { background: var(--teal); border-color: var(--teal); color: #fff; }

  .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 10px;
    box-shadow: var(--shadow);
    transition: box-shadow 0.15s;
    position: relative;
    overflow: hidden;
  }

  .card:hover { box-shadow: var(--shadow-md); }

  .card-accent {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 12px 0 0 12px;
  }

  .card-inner { padding-left: 8px; }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .card-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--ink);
  }

  .card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .card-detail {
    font-size: 14px;
    color: var(--ink-mid);
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .card-icon { font-size: 14px; margin-top: 1px; flex-shrink: 0; }

  .card-meta {
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--ink-light);
  }

  .card-meta span { display: flex; align-items: center; gap: 4px; }

  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 8px;
    letter-spacing: 0.2px;
  }

  .badge-High { background: var(--red-light); color: var(--red); }
  .badge-Medium { background: var(--amber-light); color: var(--amber); }
  .badge-Low { background: #F0F0EE; color: var(--ink-mid); }

  .accent-High { background: var(--red); }
  .accent-Medium { background: var(--gold); }
  .accent-Low { background: var(--ink-light); }
  .accent-overdue { background: var(--red); }

  .overdue-tag {
    font-size: 11px;
    font-weight: 600;
    color: var(--red);
    background: var(--red-light);
    padding: 2px 8px;
    border-radius: 8px;
  }

  .del-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-light);
    padding: 4px 8px;
    font-size: 13px;
    transition: all 0.15s;
    line-height: 1;
  }

  .del-btn:hover { background: var(--red-light); color: var(--red); border-color: var(--red); }

  .add-panel {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-top: 1.5rem;
    box-shadow: var(--shadow);
  }

  .add-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--teal);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 12px;
  }

  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .form-col { display: flex; flex-direction: column; gap: 4px; }
  .form-label { font-size: 11px; font-weight: 600; color: var(--ink-mid); text-transform: uppercase; letter-spacing: 0.5px; }

  input[type=text], input[type=date], select {
    font-size: 14px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--cream);
    color: var(--ink);
    width: 100%;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus, select:focus { border-color: var(--teal-mid); background: var(--white); }

  .add-btn {
    background: var(--teal);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 22px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 4px;
  }

  .add-btn:hover { background: var(--teal-mid); }

  .empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--ink-light);
  }

  .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .empty p { font-size: 14px; }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 1.25rem 0;
  }

  @media (max-width: 600px) {
    header { flex-direction: column; align-items: flex-start; gap: 1rem; }
    main { padding: 1rem; }
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
    .tabs { padding: 0 1rem; }
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --cream: #1A1917;
      --white: #242220;
      --ink: #F0EDE8;
      --ink-mid: #A8A5A0;
      --ink-light: #6B6760;
      --border: #333130;
      --teal-light: #0E2F2A;
      --amber-light: #2A1F0A;
      --red-light: #2A1212;
    }
    input[type=text], input[type=date], select { background: #1A1917; }
    input:focus, select:focus { background: var(--white); }
  }
</style>
</head>
<body>

<header>
  <div class="header-left">
    <h1>Janet's Tracker</h1>
    <p>McLeod Real Estate Consulting</p>
  </div>
  <div class="header-stats">
    <div class="stat">
      <div class="stat-num" id="hdr-wthbf">0</div>
      <div class="stat-label">WTHBF</div>
    </div>
    <div class="stat">
      <div class="stat-num" id="hdr-tasks">0</div>
      <div class="stat-label">Tasks</div>
    </div>
    <div class="stat">
      <div class="stat-num" id="hdr-overdue">0</div>
      <div class="stat-label">Overdue</div>
    </div>
  </div>
</header>

<div class="tabs">
  <button class="tab active" onclick="switchTab('wthbf',this)">
    ⏳ WTHBF <span class="tab-count" id="w-tab-count">0</span>
  </button>
  <button class="tab" onclick="switchTab('tasks',this)">
    ✅ Tasks <span class="tab-count" id="t-tab-count">0</span>
  </button>
</div>

<main>
  <div class="pane active" id="pane-wthbf">
    <div class="filters">
      <button class="filter-btn active" onclick="setFilter('w','all',this)">All</button>
      <button class="filter-btn" onclick="setFilter('w','High',this)">High</button>
      <button class="filter-btn" onclick="setFilter('w','Medium',this)">Medium</button>
      <button class="filter-btn" onclick="setFilter('w','Low',this)">Low</button>
      <button class="filter-btn" onclick="setFilter('w','overdue',this)">Overdue</button>
    </div>
    <div id="wthbf-list"></div>
    <div class="add-panel">
      <div class="add-panel-title">＋ Add WTHBF item</div>
      <div class="form-grid-2">
        <div class="form-col"><label class="form-label">Contact name</label><input type="text" id="w-name" placeholder="e.g. Shari Griffin"></div>
        <div class="form-col"><label class="form-label">Priority</label><select id="w-pri"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
      </div>
      <div class="form-col" style="margin-bottom:10px"><label class="form-label">What I'm waiting on</label><input type="text" id="w-waiting" placeholder="e.g. Silverleaf website content"></div>
      <div class="form-grid-2">
        <div class="form-col"><label class="form-label">Follow-up date</label><input type="date" id="w-followup"></div>
        <div style="display:flex;align-items:flex-end"><button class="add-btn" onclick="addW()">Add item</button></div>
      </div>
    </div>
  </div>

  <div class="pane" id="pane-tasks">
    <div class="filters">
      <button class="filter-btn active" onclick="setFilter('t','all',this)">All</button>
      <button class="filter-btn" onclick="setFilter('t','High',this)">High</button>
      <button class="filter-btn" onclick="setFilter('t','Medium',this)">Medium</button>
      <button class="filter-btn" onclick="setFilter('t','Low',this)">Low</button>
      <button class="filter-btn" onclick="setFilter('t','overdue',this)">Overdue</button>
    </div>
    <div id="tasks-list"></div>
    <div class="add-panel">
      <div class="add-panel-title">＋ Add task</div>
      <div class="form-grid-2">
        <div class="form-col"><label class="form-label">Task</label><input type="text" id="t-name" placeholder="e.g. Add opt-in to Randy's site"></div>
        <div class="form-col"><label class="form-label">Priority</label><select id="t-pri"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
      </div>
      <div class="form-col" style="margin-bottom:10px"><label class="form-label">Notes (optional)</label><input type="text" id="t-notes" placeholder="Any context"></div>
      <div class="form-grid-2">
        <div class="form-col"><label class="form-label">Due date</label><input type="date" id="t-due"></div>
        <div style="display:flex;align-items:flex-end"><button class="add-btn" onclick="addT()">Add task</button></div>
      </div>
    </div>
  </div>
</main>

<script>
const WK='wthbf-v1', TK='tasks-v1';
let wFilter='all', tFilter='all';

const defaultW=[
  {id:1,name:'Shari Griffin',waiting:'Resend Silverleaf website content',followup:'2026-06-16',priority:'High',added:'2026-06-09'},
  {id:2,name:'Tina Tamboer',waiting:'June Market Report by June 15',followup:'2026-06-15',priority:'High',added:'2026-06-09'},
  {id:3,name:'Georgianna',waiting:'Hear back from William re: Mailchimp scheduling',followup:'2026-06-13',priority:'High',added:'2026-06-09'},
  {id:4,name:'Shari Griffin',waiting:'Confirmed price for 2511 W Queen Creek blast',followup:'2026-06-11',priority:'Medium',added:'2026-06-09'},
];

const defaultT=[
  {id:1,name:'Add opt-in language to Randy Flora website',notes:'Promised by weekend June 5 — still pending',due:'2026-06-11',priority:'High',added:'2026-06-09'},
  {id:2,name:'Pay Tina Tamboer Invoice 2686',notes:'She delivered the June Market Report',due:'2026-06-11',priority:'Medium',added:'2026-06-09'},
  {id:3,name:'Issue Tom Wood $150 refund in Wave',notes:'Write off invoice after refund',due:'2026-06-10',priority:'High',added:'2026-06-09'},
  {id:4,name:'Build Silverleaf website for Shari',notes:'Waiting on content from Shari first',due:'',priority:'Medium',added:'2026-06-09'},
  {id:5,name:'Respond to website update request — Maral Jorjani',notes:'Detailed brief received May 25',due:'2026-06-13',priority:'Medium',added:'2026-06-09'},
  {id:6,name:'Resolve Wave payroll stuck at 93%',notes:'Needs business verification doc uploaded',due:'2026-06-10',priority:'High',added:'2026-06-09'},
];

function load(k,def){try{const d=localStorage.getItem(k);return d?JSON.parse(d):def;}catch(e){return def;}}
function save(k,d){try{localStorage.setItem(k,JSON.stringify(d));}catch(e){}}

let wItems=load(WK,defaultW);
let tItems=load(TK,defaultT);

function isOD(item){const d=item.followup||item.due;if(!d)return false;return new Date(d)<new Date(new Date().toDateString());}
function fmt(d){if(!d)return'';const[y,m,day]=d.split('-');return`${m}/${day}/${y}`;}

function updateHeader(){
  document.getElementById('hdr-wthbf').textContent=wItems.length;
  document.getElementById('hdr-tasks').textContent=tItems.length;
  const od=[...wItems,...tItems].filter(isOD).length;
  document.getElementById('hdr-overdue').textContent=od;
  document.getElementById('w-tab-count').textContent=wItems.length;
  document.getElementById('t-tab-count').textContent=tItems.length;
}

function switchTab(tab,btn){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-'+tab).classList.add('active');
}

function setFilter(type,f,btn){
  if(type==='w') wFilter=f; else tFilter=f;
  const pane=document.getElementById('pane-'+(type==='w'?'wthbf':'tasks'));
  pane.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(type==='w') renderW(); else renderT();
}

function renderW(){
  let f=wItems;
  if(wFilter==='overdue')f=wItems.filter(isOD);
  else if(wFilter!=='all')f=wItems.filter(i=>i.priority===wFilter);
  f=[...f].sort((a,b)=>({High:0,Medium:1,Low:2}[a.priority])-({High:0,Medium:1,Low:2}[b.priority]));
  const el=document.getElementById('wthbf-list');
  if(!f.length){el.innerHTML='<div class="empty"><div class="empty-icon">✓</div><p>Nothing waiting — you\'re all caught up!</p></div>';return;}
  el.innerHTML=f.map(i=>`
    <div class="card">
      <div class="card-accent ${isOD(i)?'accent-overdue':'accent-'+i.priority}"></div>
      <div class="card-inner">
        <div class="card-top">
          <div class="card-name">${i.name}</div>
          <div class="card-actions">
            ${isOD(i)?'<span class="overdue-tag">Overdue</span>':''}
            <span class="badge badge-${i.priority}">${i.priority}</span>
            <button class="del-btn" onclick="delW(${i.id})" title="Mark done">✕</button>
          </div>
        </div>
        <div class="card-detail"><span class="card-icon">⏳</span>${i.waiting}</div>
        <div class="card-meta">
          <span>📅 Added ${fmt(i.added)}</span>
          ${i.followup?`<span>🔔 Follow up ${fmt(i.followup)}</span>`:''}
        </div>
      </div>
    </div>`).join('');
}

function renderT(){
  let f=tItems;
  if(tFilter==='overdue')f=tItems.filter(isOD);
  else if(tFilter!=='all')f=tItems.filter(i=>i.priority===tFilter);
  f=[...f].sort((a,b)=>({High:0,Medium:1,Low:2}[a.priority])-({High:0,Medium:1,Low:2}[b.priority]));
  const el=document.getElementById('tasks-list');
  if(!f.length){el.innerHTML='<div class="empty"><div class="empty-icon">🎉</div><p>All tasks done!</p></div>';return;}
  el.innerHTML=f.map(i=>`
    <div class="card">
      <div class="card-accent ${isOD(i)?'accent-overdue':'accent-'+i.priority}"></div>
      <div class="card-inner">
        <div class="card-top">
          <div class="card-name">${i.name}</div>
          <div class="card-actions">
            ${isOD(i)?'<span class="overdue-tag">Overdue</span>':''}
            <span class="badge badge-${i.priority}">${i.priority}</span>
            <button class="del-btn" onclick="delT(${i.id})" title="Mark done">✕</button>
          </div>
        </div>
        ${i.notes?`<div class="card-detail"><span class="card-icon">📝</span>${i.notes}</div>`:''}
        <div class="card-meta">
          <span>📅 Added ${fmt(i.added)}</span>
          ${i.due?`<span>⚑ Due ${fmt(i.due)}</span>`:''}
        </div>
      </div>
    </div>`).join('');
}

function delW(id){wItems=wItems.filter(i=>i.id!==id);save(WK,wItems);renderW();updateHeader();}
function delT(id){tItems=tItems.filter(i=>i.id!==id);save(TK,tItems);renderT();updateHeader();}

function addW(){
  const name=document.getElementById('w-name').value.trim();
  const waiting=document.getElementById('w-waiting').value.trim();
  if(!name||!waiting)return;
  wItems.push({id:Date.now(),name,waiting,priority:document.getElementById('w-pri').value,followup:document.getElementById('w-followup').value,added:new Date().toISOString().split('T')[0]});
  save(WK,wItems);renderW();updateHeader();
  document.getElementById('w-name').value='';document.getElementById('w-waiting').value='';document.getElementById('w-followup').value='';
}

function addT(){
  const name=document.getElementById('t-name').value.trim();
  if(!name)return;
  tItems.push({id:Date.now(),name,notes:document.getElementById('t-notes').value.trim(),priority:document.getElementById('t-pri').value,due:document.getElementById('t-due').value,added:new Date().toISOString().split('T')[0]});
  save(TK,tItems);renderT();updateHeader();
  document.getElementById('t-name').value='';document.getElementById('t-notes').value='';document.getElementById('t-due').value='';
}

renderW();renderT();updateHeader();
</script>
</body>
</html>
