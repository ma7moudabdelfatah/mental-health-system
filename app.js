/* نظام الأمانة العامة - المترددين */
const LS_USERS='gss_users_v1', LS_ENTRIES='gss_entries_v1', LS_PERM='gss_perm_v1', LS_SESSION='gss_session_v1';

const defaultUsers=[
  {id:'u1', username:'admin', password:'admin123', role:'admin', hospital:'الأمانة العامة - الحساب الرئيسي', active:true},
  {id:'u2', username:'abbasiya', password:'123', role:'hospital', hospital:'مستشفى العباسية للصحة النفسية', active:true},
  {id:'u3', username:'helwan', password:'123', role:'hospital', hospital:'مستشفى حلوان للصحة النفسية', active:true},
  {id:'u4', username:'khanka', password:'123', role:'hospital', hospital:'مستشفى الخانكة للصحة النفسية', active:true},
];
const defaultPerm={
  dashboard:{label:'لوحة التحكم', admin:true, hospital:true},
  entry:{label:'تسجيل المترددين', admin:true, hospital:true},
  reports:{label:'التقارير والرسوم البيانية', admin:true, hospital:true},
  users:{label:'إنشاء حساب', admin:true, hospital:false},
  permissions:{label:'الصلاحيات', admin:true, hospital:false},
};
const pagesMap={
  dashboard:'page-dashboard',
  entry:'page-entry',
  reports:'page-reports',
  users:'page-users',
  permissions:'page-permissions'
};
const navLabels={
  dashboard:'لوحة التحكم',
  entry:'تسجيل المترددين',
  reports:'التقارير',
  users:'إنشاء حساب',
  permissions:'الصلاحيات'
};

function load(k,fallback){ try{ const v=localStorage.getItem(k); return v? JSON.parse(v): fallback }catch(e){return fallback}}
function save(k,v){ localStorage.setItem(k, JSON.stringify(v))}

let users=load(LS_USERS, null) || defaultUsers;
if(!load(LS_USERS,null)) save(LS_USERS, users);
let entries=load(LS_ENTRIES, []) ;
let perm=load(LS_PERM, null) || defaultPerm;
if(!load(LS_PERM,null)) save(LS_PERM, perm);
function getSession(){ return load(LS_SESSION,null)}
function setSession(s){ save(LS_SESSION,s)}

let chartMonthly=null, chartHospital=null;

// init
document.addEventListener('DOMContentLoaded', ()=>{
  // set default month to current
  const now=new Date(); const ym= now.toISOString().slice(0,7);
  document.getElementById('entryMonth').value=ym;
  document.getElementById('reportFrom').value= ym.slice(0,4)+'-01';
  document.getElementById('reportTo').value= ym;

  bindEvents();
  restoreSession();
});

function bindEvents(){
  document.getElementById('loginForm').addEventListener('submit', onLogin);
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('entryForm').addEventListener('submit', onEntry);
  document.getElementById('userForm').addEventListener('submit', onCreateUser);
  document.getElementById('btnGenerateReport').addEventListener('click', renderReports);
  document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
  document.getElementById('btnSavePerm').addEventListener('click', savePerm);
  document.getElementById('btnResetPerm').addEventListener('click', resetPerm);
}

function onLogin(e){
  e.preventDefault();
  const u=document.getElementById('loginUsername').value.trim();
  const p=document.getElementById('loginPassword').value.trim();
  const found= users.find(x=>x.username===u && x.password===p);
  const err=document.getElementById('loginError');
  if(!found){ err.textContent='اسم المستخدم أو كلمة المرور غير صحيحة'; return }
  if(!found.active){ err.textContent='هذا الحساب موقوف'; return }
  err.textContent='';
  setSession(found);
  restoreSession();
}

function restoreSession(){
  const s=getSession();
  if(!s){
    showPage('page-login');
    document.getElementById('topHeader').style.display='none';
    return;
  }
  // refresh user object from list (in case updated)
  const fresh= users.find(u=>u.id===s.id) || s;
  document.getElementById('topHeader').style.display='block';
  document.getElementById('userInfo').innerHTML=`<b>${fresh.hospital}</b> — ${fresh.username} <span class="badge ${fresh.role==='admin'?'badge-admin':'badge-hospital'}">${fresh.role==='admin'?'رئيسي':'مستشفى'}</span>`;
  buildNav(fresh);
  // show default page per role
  const firstAllowed= Object.keys(perm).find(k=> perm[k][fresh.role]);
  showPage( pagesMap[firstAllowed] || 'page-dashboard');
  refreshAll();
}

function buildNav(session){
  const nav=document.getElementById('mainNav');
  nav.innerHTML='';
  Object.keys(perm).forEach(key=>{
    if(!perm[key][session.role]) return;
    const btn=document.createElement('button');
    btn.textContent=navLabels[key];
    btn.dataset.page=pagesMap[key];
    btn.addEventListener('click', ()=> showPage(pagesMap[key]));
    nav.appendChild(btn);
  });
  updateNavActive();
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
  if(id==='page-login'){
    document.getElementById('topHeader').style.display='none';
  } else {
    // if not logged, redirect to login
    const s=getSession();
    if(!s){ showPage('page-login'); return }
    document.getElementById('topHeader').style.display='block';
    updateNavActive();
    if(id==='page-dashboard') renderDashboard();
    if(id==='page-entry') renderEntryPage();
    if(id==='page-reports') renderReports();
    if(id==='page-users') renderUsers();
    if(id==='page-permissions') renderPerm();
  }
  updateNavActive();
}

function updateNavActive(){
  const activeId=document.querySelector('.page.active')?.id;
  document.querySelectorAll('#mainNav button').forEach(b=>{
    b.classList.toggle('active', b.dataset.page===activeId);
  });
}

function logout(){
  localStorage.removeItem(LS_SESSION);
  showPage('page-login');
  document.getElementById('loginUsername').value='';
  document.getElementById('loginPassword').value='';
}

function refreshAll(){
  renderDashboard();
  renderEntryPage();
  renderReports();
  renderUsers();
  renderPerm();
}

// Dashboard
function renderDashboard(){
  const s=getSession(); if(!s) return;
  const total= entries.reduce((a,b)=>a+b.count,0);
  const thisMonth=new Date().toISOString().slice(0,7);
  const thisMonthTotal= entries.filter(e=>e.month===thisMonth).reduce((a,b)=>a+b.count,0);
  const hospitals= [...new Set(users.filter(u=>u.role==='hospital').map(u=>u.hospital))];
  const countHospitals=hospitals.length;
  const myCount= s.role==='admin'? total : entries.filter(e=>e.hospital===s.hospital).reduce((a,b)=>a+b.count,0);

  document.getElementById('statsGrid').innerHTML=`
    <div class="stat"><div class="label">إجمالي المترددين (كل الشهور)</div><div class="value">${total.toLocaleString('ar-EG')}</div><div class="sub">مجمع من كل المستشفيات</div></div>
    <div class="stat"><div class="label">الشهر الحالي (${thisMonth})</div><div class="value">${thisMonthTotal.toLocaleString('ar-EG')}</div><div class="sub">إجمالي الشهر الحالي</div></div>
    <div class="stat"><div class="label">${s.role==='admin'?'عدد المستشفيات المسجلة':'إجمالي المترددين الخاص بي'}</div><div class="value">${s.role==='admin'? countHospitals : myCount.toLocaleString('ar-EG')}</div><div class="sub">${s.role==='admin'?'حساب مستشفى':'كل الشهور'}</div></div>
    <div class="stat"><div class="label">عدد التسجيلات</div><div class="value">${entries.length}</div><div class="sub">سجل شهري</div></div>
  `;
  const recent= [...entries].sort((a,b)=> b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  document.getElementById('recentEntries').innerHTML= recent.length? `<table class="tbl" style="min-width:0"><thead><tr><th>المستشفى</th><th>الشهر</th><th>العدد</th></tr></thead><tbody>${recent.map(r=>`<tr><td>${r.hospital}</td><td>${r.month}</td><td>${r.count}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">لا يوجد تسجيلات بعد</p>';
  // alerts: hospitals missing current month
  const missing= hospitals.filter(h=> !entries.some(e=> e.hospital===h && e.month===thisMonth));
  document.getElementById('alertsBox').innerHTML= s.role==='admin'
    ? (missing.length? `<div class="alert info">لم تسجل بعد لهذا الشهر (${thisMonth}):<br><b>${missing.join('، ')}</b></div>` : '<p class="muted">كل المستشفيات سجلت هذا الشهر ✔</p>')
    : (!entries.some(e=> e.hospital===s.hospital && e.month===thisMonth) ? `<div class="alert info">لم تسجل بيانات شهر ${thisMonth} بعد — بادر بالتسجيل.</div>` : '<p class="muted">تم تسجيل هذا الشهر ✔</p>')
}

// Entry
function renderEntryPage(){
  const s=getSession(); if(!s) return;
  const sel=document.getElementById('entryHospital');
  const group=document.getElementById('hospitalSelectGroup');
  const hospitals= [...new Set(users.filter(u=>u.role==='hospital').map(u=>u.hospital))];
  // also include admin hospital if needed
  sel.innerHTML='';
  if(s.role==='admin'){
    group.style.display='flex';
    hospitals.forEach(h=>{
      const o=document.createElement('option'); o.value=h; o.textContent=h; sel.appendChild(o);
    });
    if(!hospitals.length){ const o=document.createElement('option'); o.textContent='لا يوجد مستشفيات - أنشئ حساب مستشفى أولا'; sel.appendChild(o)}
  } else {
    group.style.display='none';
    sel.innerHTML=`<option value="${s.hospital}">${s.hospital}</option>`;
  }
  renderMyEntries();
}

function onEntry(e){
  e.preventDefault();
  const s=getSession();
  const hospital=document.getElementById('entryHospital').value.trim();
  const month=document.getElementById('entryMonth').value;
  const count= parseInt(document.getElementById('entryCount').value,10);
  const notes=document.getElementById('entryNotes').value.trim();
  const msg=document.getElementById('entryMsg');
  if(!month || isNaN(count) || count<0){ msg.textContent='تأكد من البيانات'; msg.className='error-msg'; return }
  // upsert: if same hospital+month exists, update
  const existing= entries.find(en=> en.hospital===hospital && en.month===month);
  if(existing){
    existing.count=count; existing.notes=notes; existing.updatedAt=new Date().toISOString(); existing.by=s.username;
  } else {
    entries.push({id:Date.now().toString(), hospital, month, count, notes, by:s.username, createdAt:new Date().toISOString()});
  }
  save(LS_ENTRIES, entries);
  msg.textContent=`تم حفظ ${count} متردد لمستشفى ${hospital} عن شهر ${month} بنجاح ✔`;
  msg.className='success-msg';
  document.getElementById('entryCount').value='';
  document.getElementById('entryNotes').value='';
  renderMyEntries(); renderDashboard();
}

function renderMyEntries(){
  const s=getSession();
  const tbody=document.querySelector('#myEntriesTable tbody');
  let list= entries;
  if(s.role==='hospital') list= entries.filter(e=> e.hospital===s.hospital);
  list= [...list].sort((a,b)=> b.month.localeCompare(a.month));
  tbody.innerHTML= list.map(e=>`<tr><td>${e.hospital}</td><td>${e.month}</td><td><b>${e.count.toLocaleString('ar-EG')}</b></td><td>${(e.createdAt||'').slice(0,10)}</td><td><button class="btn btn-outline btn-sm" onclick="deleteEntry('${e.id}')">حذف</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">لا يوجد بيانات</td></tr>';
}
window.deleteEntry=(id)=>{
  if(!confirm('حذف هذا السجل؟')) return;
  entries= entries.filter(e=> e.id!==id);
  save(LS_ENTRIES, entries);
  renderMyEntries(); renderDashboard(); renderReports();
};

// Reports
function renderReports(){
  const s=getSession(); if(!s) return;
  // populate hospital filter
  const sel=document.getElementById('reportHospital');
  const hospitals=[...new Set(entries.map(e=>e.hospital))];
  // also include all hospital users even without entries
  users.filter(u=>u.role==='hospital').forEach(u=>{ if(!hospitals.includes(u.hospital)) hospitals.push(u.hospital)});
  const curVal=sel.value;
  sel.innerHTML='<option value="all">الكل</option>'+ hospitals.map(h=>`<option value="${h}">${h}</option>`).join('');
  if(curVal) sel.value=curVal;

  const from=document.getElementById('reportFrom').value;
  const to=document.getElementById('reportTo').value;
  const filterHosp= sel.value;

  let filtered=[...entries];
  if(from) filtered= filtered.filter(e=> e.month >= from);
  if(to) filtered= filtered.filter(e=> e.month <= to);
  if(filterHosp!=='all') filtered= filtered.filter(e=> e.hospital===filterHosp);
  // if hospital user, force own only
  if(s.role==='hospital') filtered= filtered.filter(e=> e.hospital===s.hospital);

  // stats
  const total= filtered.reduce((a,b)=>a+b.count,0);
  const avg= filtered.length? Math.round(total/filtered.length):0;
  const max= filtered.length? Math.max(...filtered.map(e=>e.count)):0;
  document.getElementById('reportStats').innerHTML=`
    <div class="stat"><div class="label">الإجمالي المفلتر</div><div class="value">${total.toLocaleString('ar-EG')}</div></div>
    <div class="stat"><div class="label">متوسط الشهر</div><div class="value">${avg.toLocaleString('ar-EG')}</div></div>
    <div class="stat"><div class="label">أعلى شهر</div><div class="value">${max.toLocaleString('ar-EG')}</div></div>
    <div class="stat"><div class="label">عدد السجلات</div><div class="value">${filtered.length}</div></div>
  `;

  // aggregate table: months columns
  const months=[...new Set(filtered.map(e=>e.month))].sort();
  const hosps=[...new Set(filtered.map(e=>e.hospital))].sort();
  // if no filter and admin, show all hospital users even with zero
  let displayHosps= hosps;
  if(filterHosp==='all' && s.role==='admin'){
    const allHosps=[...new Set(users.filter(u=>u.role==='hospital').map(u=>u.hospital))].sort();
    displayHosps=allHosps;
    allHosps.forEach(h=>{ if(!hosps.includes(h)) hosps.push(h)});
  }

  let html='<div class="table-wrap"><table class="tbl"><thead><tr><th>المستشفى</th>';
  months.forEach(m=> html+=`<th>${m}</th>`);
  html+='<th style="background:#c1272d">الإجمالي</th></tr></thead><tbody>';
  let colTotals={};
  months.forEach(m=> colTotals[m]=0);
  let grand=0;
  displayHosps.forEach(h=>{
    html+=`<tr><td><b>${h}</b></td>`;
    let rowTotal=0;
    months.forEach(m=>{
      const rec= filtered.find(e=> e.hospital===h && e.month===m);
      const val= rec? rec.count:0;
      rowTotal+=val; colTotals[m]+=val;
      html+=`<td>${val? val.toLocaleString('ar-EG'):'—'}</td>`;
    });
    grand+=rowTotal;
    html+=`<td style="background:#fff1f2;font-weight:800">${rowTotal.toLocaleString('ar-EG')}</td></tr>`;
  });
  html+='<tr style="background:#f1f5f9;font-weight:800"><td>الإجمالي الشهري</td>';
  months.forEach(m=> html+=`<td>${colTotals[m].toLocaleString('ar-EG')}</td>`);
  html+=`<td style="background:#fee2e2">${grand.toLocaleString('ar-EG')}</td></tr>`;
  html+='</tbody></table></div>';
  if(!filtered.length) html='<p class="muted">لا يوجد بيانات في الفترة المحددة</p>';
  document.getElementById('aggregateTableWrap').innerHTML=html;

  // details table
  const detailsTbody=document.querySelector('#detailsTable tbody');
  detailsTbody.innerHTML= [...filtered].sort((a,b)=> a.month.localeCompare(b.month)).map(e=>`<tr><td>${e.hospital}</td><td>${e.month}</td><td>${e.count.toLocaleString('ar-EG')}</td><td>${e.by}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">لا يوجد بيانات</td></tr>';

  // charts
  drawCharts(filtered, months);
}

function drawCharts(filtered, months){
  const ctx1=document.getElementById('chartMonthly');
  const ctx2=document.getElementById('chartHospital');
  if(!ctx1 || !ctx2) return;
  const monthlyTotals= months.map(m=> filtered.filter(e=>e.month===m).reduce((a,b)=>a+b.count,0));
  const hosps=[...new Set(filtered.map(e=>e.hospital))];
  const hospTotals= hosps.map(h=> filtered.filter(e=>e.hospital===h).reduce((a,b)=>a+b.count,0));

  if(chartMonthly) chartMonthly.destroy();
  if(chartHospital) chartHospital.destroy();

  chartMonthly= new Chart(ctx1, {
    type:'bar',
    data:{labels:months, datasets:[{label:'إجمالي المترددين', data:monthlyTotals, backgroundColor:'#0a4ea3', borderRadius:6}]},
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
  chartHospital= new Chart(ctx2, {
    type:'doughnut',
    data:{labels:hosps, datasets:[{data:hospTotals, backgroundColor:['#0a4ea3','#c1272d','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1']}]},
    options:{responsive:true, plugins:{legend:{position:'bottom', labels:{font:{family:'Tajawal'}}}}}
  });
}

function exportCSV(){
  const rows= [...document.querySelectorAll('#detailsTable tbody tr')].map(tr=> [...tr.children].map(td=> td.textContent));
  if(!rows.length) return alert('لا يوجد بيانات للتصدير');
  const header=['المستشفى','الشهر','العدد','بواسطة'];
  const csv=[header, ...rows].map(r=> r.map(c=> `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='تقرير_المترددين_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Users
function renderUsers(){
  const tbody=document.querySelector('#usersTable tbody');
  tbody.innerHTML= users.map(u=>`<tr><td>${u.username}</td><td>${u.hospital}</td><td><span class="badge ${u.role==='admin'?'badge-admin':'badge-hospital'}">${u.role==='admin'?'رئيسي':'مستشفى'}</span></td><td><span class="badge ${u.active?'badge-active':'badge-inactive'}">${u.active?'نشط':'موقوف'}</span></td><td class="actions"><button class="btn btn-outline btn-sm" onclick="toggleActive('${u.id}')">${u.active?'إيقاف':'تفعيل'}</button> <button class="btn btn-outline btn-sm" onclick="deleteUser('${u.id}')">حذف</button></td></tr>`).join('');
}

function onCreateUser(e){
  e.preventDefault();
  const username=document.getElementById('uUsername').value.trim();
  const password=document.getElementById('uPassword').value.trim();
  const role=document.getElementById('uRole').value;
  const hospital=document.getElementById('uHospital').value.trim() || (role==='admin'?'الأمانة العامة':'مستشفى');
  const msg=document.getElementById('userMsg');
  if(users.some(u=>u.username===username)){ msg.textContent='اسم المستخدم موجود بالفعل'; msg.className='error-msg'; return }
  if(!username || !password){ msg.textContent='أكمل البيانات'; msg.className='error-msg'; return }
  users.push({id:Date.now().toString(), username, password, role, hospital, active:true});
  save(LS_USERS, users);
  msg.textContent='تم إنشاء الحساب بنجاح ✔'; msg.className='success-msg';
  e.target.reset();
  renderUsers(); renderEntryPage(); renderDashboard();
}
window.toggleActive=(id)=>{
  const u=users.find(x=>x.id===id); if(!u) return;
  u.active=!u.active; save(LS_USERS, users); renderUsers();
};
window.deleteUser=(id)=>{
  if(users.length<=1) return alert('لا يمكن حذف كل المستخدمين');
  if(!confirm('حذف الحساب؟')) return;
  users=users.filter(u=>u.id!==id); save(LS_USERS, users); renderUsers(); renderEntryPage();
};

// Permissions
function renderPerm(){
  const tbody=document.querySelector('#permTable tbody');
  tbody.innerHTML= Object.keys(perm).map(key=>{
    const p=perm[key];
    return `<tr><td>${p.label}</td><td><input type="checkbox" data-key="${key}" data-role="admin" ${p.admin?'checked':''}></td><td><input type="checkbox" data-key="${key}" data-role="hospital" ${p.hospital?'checked':''}></td></tr>`;
  }).join('');
}

function savePerm(){
  document.querySelectorAll('#permTable input[type="checkbox"]').forEach(ch=>{
    const key=ch.dataset.key, role=ch.dataset.role;
    perm[key][role]=ch.checked;
  });
  // prevent locking admin out completely? ensure at least one page for admin
  save(LS_PERM, perm);
  document.getElementById('permMsg').textContent='تم حفظ الصلاحيات ✔';
  setTimeout(()=> document.getElementById('permMsg').textContent='',2000);
  const s=getSession(); if(s) buildNav(s);
}

function resetPerm(){
  perm=JSON.parse(JSON.stringify(defaultPerm));
  save(LS_PERM, perm);
  renderPerm();
  const s=getSession(); if(s) buildNav(s);
  document.getElementById('permMsg').textContent='تمت الاستعادة';
}
