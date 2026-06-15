// admin-cms.js — CMS V1 後台核心管理邏輯
import { db, auth, doc, getDoc, setDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';
import { initDefaultSites } from './init-default-sites.js';

let currentUser=null, currentSiteId='chtech', userProfile=null;

// Toast 通知
function toast(type,title,msg='',dur=4000){
  const icons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
  const c=document.getElementById('toast-container'); if(!c) return;
  const el=document.createElement('div');
  el.className='toast '+type;
  el.innerHTML=`<span class="toast-icon">${icons[type]||'📢'}</span><div class="toast-body"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div><button class="toast-close" onclick="this.closest('.toast').remove()">×</button>`;
  c.prepend(el); setTimeout(()=>{el.classList.add('removing');setTimeout(()=>el.remove(),300);},dur);
}

// 按鈕狀態
function btnState(btn,state,label){if(!btn)return;btn.disabled=state==='loading';btn.textContent=label;btn.style.opacity=state==='loading'?.7:1;}

// Firebase 工具
async function getD(path){const s=await getDoc(doc(db,...path.split('/')));return s.exists()?s.data():null;}
async function saveD(path,data){await setDoc(doc(db,...path.split('/')),{...data,_updatedAt:serverTimestamp()},{merge:true});}
async function getCol(sid,col,ord='sort'){try{const q=query(collection(db,'sites',sid,col),orderBy(ord));const s=await getDocs(q);return s.docs.map(d=>({_id:d.id,...d.data()}));}catch{const s=await getDocs(collection(db,'sites',sid,col));return s.docs.map(d=>({_id:d.id,...d.data()}));}}

// Auth
onAuthStateChanged(auth,async u=>{
  if(u){currentUser=u;const p=await getD('users/'+u.uid);userProfile=p||{displayName:u.email,role:'admin'};
    const n=userProfile.displayName||u.email;
    const el=document.getElementById('sidebar-user-name');if(el)el.textContent=n;
    const ri=document.getElementById('sidebar-user-initial');if(ri)ri.textContent=(n[0]||'A').toUpperCase();
    document.getElementById('login-page').style.display='none';
    document.getElementById('admin-layout').style.display='flex';
    initSiteSwitcher(); navigateTo('dashboard');
  }else{document.getElementById('login-page').style.display='flex';document.getElementById('admin-layout').style.display='none';}
});

document.getElementById('login-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('login-btn'),err=document.getElementById('login-error');
  btnState(btn,'loading','登入中...');err.classList.remove('show');
  try{await signInWithEmailAndPassword(auth,document.getElementById('login-email').value.trim(),document.getElementById('login-password').value);}
  catch(ex){err.textContent=ex.code==='auth/invalid-credential'?'帳號或密碼錯誤':ex.message;err.classList.add('show');btnState(btn,'idle','登入後台');}
});

document.getElementById('logout-btn')?.addEventListener('click',async()=>{await signOut(auth);toast('info','已登出');});

// Site Switcher
function initSiteSwitcher(){
  const sel=document.getElementById('site-select');if(!sel)return;
  sel.value=currentSiteId;
  sel.addEventListener('change',()=>{currentSiteId=sel.value;const cur=document.querySelector('.section-page.active');if(cur)loadSectionData(cur.id.replace('page-',''));
    const lbl=document.getElementById('topbar-site-label');if(lbl)lbl.textContent=currentSiteId==='chtech'?'誠創科技':'愛家居';
    toast('info','切換至：'+(currentSiteId==='chtech'?'誠創科技':'愛家居'));
  });
}

// Nav
export function navigateTo(page){
  document.querySelectorAll('.section-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('page-'+page);if(pg)pg.classList.add('active');
  const nv=document.querySelector('.nav-item[data-page="'+page+'"]');if(nv)nv.classList.add('active');
  const names={dashboard:'儀表板',siteInfo:'公司資料',hero:'形象網站',images:'圖片管理',news:'最新消息',faq:'FAQ管理',form:'表單設定',submissions:'表單紀錄',accounts:'帳號權限',billing:'帳務到期',settings:'系統設定',init:'初始化'};
  const bc=document.querySelector('.topbar-breadcrumb .current');if(bc)bc.textContent=names[page]||page;
  loadSectionData(page);
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.remove();
}

function loadSectionData(p){
  if(p==='dashboard') loadDashboard();
  else if(p==='siteInfo') loadSiteInfo();
  else if(p==='news') loadNewsAdmin();
  else if(p==='faq') loadFaqAdmin();
  else if(p==='form') loadFormConfig();
  else if(p==='submissions') loadSubmissions();
  else if(p==='billing') loadBilling();
}

document.querySelectorAll('.nav-item[data-page]').forEach(el=>{if(el.classList.contains('locked'))return;el.addEventListener('click',()=>navigateTo(el.dataset.page));});

// Mobile menu
document.getElementById('topbar-menu-btn')?.addEventListener('click',()=>{
  const sb=document.getElementById('admin-sidebar'); sb.classList.toggle('open');
  if(sb.classList.contains('open')){const ov=document.createElement('div');ov.className='sidebar-overlay';ov.onclick=()=>{sb.classList.remove('open');ov.remove();};document.body.appendChild(ov);}
});

// Dashboard
async function loadDashboard(){
  const dn=document.getElementById('dash-site-name');if(dn)dn.textContent=currentSiteId==='chtech'?'誠創科技':'愛家居';
  try{
    const[news,faq,subs]=await Promise.all([getCol(currentSiteId,'news'),getCol(currentSiteId,'faq'),getCol(currentSiteId,'formSubmissions','_createdAt')]);
    const sn=document.getElementById('stat-news');if(sn)sn.textContent=news.length;
    const sf=document.getElementById('stat-faq');if(sf)sf.textContent=faq.length;
    const ss=document.getElementById('stat-subs');if(ss)ss.textContent=subs.length;
    const tb=document.getElementById('latest-submissions');
    if(tb)tb.innerHTML=subs.length?subs.slice(-5).reverse().map(s=>`<tr><td>${s.name||s['姓名']||'-'}</td><td>${s.phone||s['電話']||'-'}</td><td>${s.submittedAt?.toDate?.().toLocaleString?.()||'-'}</td><td><span class="badge badge-success">已收到</span></td></tr>`).join(''):'<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">尚無表單紀錄</td></tr>';
  }catch(e){console.error(e);}
}

// 公司資料
async function loadSiteInfo(){
  const d=await getD('sites/'+currentSiteId+'/siteInfo/main');if(!d)return;
  ['companyName','companyNameEn','phone','email','address','taxId','about','footerCopy','lineUrl','fbUrl','igUrl','seoTitle','seoDescription'].forEach(k=>{const el=document.getElementById('si-'+k);if(el)el.value=d[k]||'';});
}

document.getElementById('save-siteinfo-btn')?.addEventListener('click',async()=>{
  const b=document.getElementById('save-siteinfo-btn'); btnState(b,'loading','儲存中...');
  try{
    const data={};['companyName','companyNameEn','phone','email','address','taxId','about','footerCopy','lineUrl','fbUrl','igUrl','seoTitle','seoDescription'].forEach(k=>{const el=document.getElementById('si-'+k);if(el)data[k]=el.value;});
    await saveD('sites/'+currentSiteId+'/siteInfo/main',data);
    btnState(b,'done','✓ 已儲存'); toast('success','公司資料儲存成功');
    setTimeout(()=>btnState(b,'idle','儲存'),2500);
  }catch(e){btnState(b,'idle','儲存');toast('error','儲存失敗',e.message);}
});

// 最新消息
async function loadNewsAdmin(){
  const tb=document.getElementById('news-table-body');if(!tb)return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try{
    const items=await getCol(currentSiteId,'news','date');
    tb.innerHTML=items.length?items.reverse().map(i=>`<tr><td>${i.date||'-'}</td><td><span class="badge badge-info">${i.category||'一般'}</span></td><td>${i.title||''}</td><td><span class="badge ${i.visible!==false?'badge-success':'badge-gray'}">${i.visible!==false?'顯示':'隱藏'}</span></td><td><button class="btn btn-sm btn-outline" onclick="window.editNews('${i._id}');`+ '">編輯</button></td></tr>').join(''):'<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">尚無資料</td></tr>';
  }catch(e){toast('error','載入失敗',e.message);}
}

document.getElementById('add-news-btn')?.addEventListener('click',()=>window.editNews('new-'+Date.now()));

// FAQ
async function loadFaqAdmin(){
  const list=document.getElementById('faq-list-admin');if(!list)return;
  list.innerHTML='<div class="page-loading"><div class="spinner"></div></div>';
  try{
    const items=await getCol(currentSiteId,'faq');
    list.innerHTML=items.length?`<ul class="drag-list">${items.map(i=>`<li class="drag-item"><span class="drag-handle">⠿</span><span class="drag-item-title">${i.question||i.title||''}</span><div class="drag-item-actions"><span class="badge ${i.visible!==false?'badge-success':'badge-gray'}">${i.visible!==false?'顯示':'隱藏'}</span><button class="btn btn-sm btn-outline" onclick="window.editFaq('${i._id}')">編輯</button></div></li>`).join('')}</ul>`:'<p class="text-muted">尚無 FAQ</p>';
  }catch(e){toast('error','載入失敗',e.message);}
}

document.getElementById('add-faq-btn')?.addEventListener('click',()=>window.editFaq('new-'+Date.now()));

// 表單設定
async function loadFormConfig(){
  const list=document.getElementById('form-fields-list');if(!list)return;
  list.innerHTML='<div class="page-loading"><div class="spinner"></div></div>';
  try{const items=await getCol(currentSiteId,'formConfig');renderFormFields(items);}catch(e){toast('error','載入失敗',e.message);}
}

function renderFormFields(items){
  const list=document.getElementById('form-fields-list');if(!list)return;
  const tl={text:'文字',phone:'電話',email:'Email',address:'地址',date:'日期',time:'時間',select:'下拉選單',radio:'單選',checkbox:'多選',textarea:'多行備註'};
  list.innerHTML=items.length?`<ul class="drag-list">${items.map(f=>`<li class="drag-item"><span class="drag-handle">⠿</span><span class="drag-item-title">${f.name} <span class="badge badge-info">${tl[f.type]||f.type}</span></span><div class="drag-item-actions"><span class="badge ${f.required?'badge-danger':'badge-gray'}">${f.required?'必填':'選填'}</span><button class="btn btn-sm btn-outline" onclick="window.editField('${f._id}')">編輯</button></div></li>`).join('')}</ul>`:'<p class="text-muted">尚未設定表單欄位</p>';
}

document.getElementById('add-field-btn')?.addEventListener('click',()=>window.editField('new-'+Date.now()));

// 表單紀錄
async function loadSubmissions(){
  const tb=document.getElementById('subs-table-body');if(!tb)return;
  tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try{
    const items=await getCol(currentSiteId,'formSubmissions','_createdAt');
    window._submissions=items.reverse();
    tb.innerHTML=items.length?items.map((s,i)=>`<tr><td>${s.submittedAt?.toDate?.().toLocaleString?.()||'-'}</td><td>${s.name||s['姓名']||'-'}</td><td>${s.phone||s['電話']||'-'}</td><td>${s.email||s['Email']||'-'}</td><td><button class="btn btn-sm btn-outline" onclick="window.viewSub(${i})">查看</button></td></tr>`).join(''):'<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">尚無表單紀錄</td></tr>';
  }catch(e){toast('error','載入失敗',e.message);}
}

// 帳務
async function loadBilling(){
  const d=await getD('sites/'+currentSiteId+'/billing/main');if(!d)return;
  ['createdAt','activatedAt','expiredAt','nextBillingAt','reminderDays','bufferDays','status'].forEach(k=>{const el=document.getElementById('billing-'+k);if(!el)return;if(d[k]?.toDate)el.value=d[k].toDate().toISOString().split('T')[0];else el.value=d[k]||'';});
  const b=document.getElementById('billing-status-badge');
  if(b){const m={active:'badge-success',expiring:'badge-warning',overdue:'badge-danger',suspended:'badge-gray'};const l={active:'正常',expiring:'即將到期',overdue:'已逾期',suspended:'已停用'};b.className='badge '+(m[d.status]||'badge-gray');b.textContent=l[d.status]||d.status;}
}

document.getElementById('save-billing-btn')?.addEventListener('click',async()=>{
  const b=document.getElementById('save-billing-btn');btnState(b,'loading','儲存中...');
  try{const data={};['expiredAt','nextBillingAt','reminderDays','bufferDays','status'].forEach(k=>{const el=document.getElementById('billing-'+k);if(el)data[k]=el.value;});await saveD('sites/'+currentSiteId+'/billing/main',data);btnState(b,'done','✓ 已儲存');toast('success','帳務資料已更新');setTimeout(()=>btnState(b,'idle','儲存'),2500);}
  catch(e){btnState(b,'idle','儲存');toast('error','儲存失敗',e.message);}
});

// 初始化
document.getElementById('init-cms-btn')?.addEventListener('click',async()=>{
  if(!confirm('確定要初始化 CMS 預設資料？（已存在的資料不會被覆蓋）'))return;
  const btn=document.getElementById('init-cms-btn'),log=document.getElementById('init-log');
  btnState(btn,'loading','初始化中...');log.innerHTML='';log.style.display='block';
  const onLog=m=>{log.innerHTML+=`<div>${m}</div>`;log.scrollTop=log.scrollHeight;};
  try{await initDefaultSites(onLog);btnState(btn,'done','✓ 初始化完成');toast('success','CMS 初始化完成');}
  catch(e){btnState(btn,'idle','重試');toast('error','初始化失敗',e.message);onLog('❌ 錯誤：'+e.message);}
});

// Modal
function modal(title,body,onOk){
  document.getElementById('global-modal')?.remove();
  const ov=document.createElement('div');ov.className='modal-overlay';ov.id='global-modal';
  ov.innerHTML=`<div class="modal"><div class="modal-header"><span class="modal-title">${title}</span><button class="modal-close" onclick="document.getElementById('global-modal').remove()">×</button></div><div class="modal-body">${body}</div>${onOk?`<div class="modal-footer"><button class="btn btn-outline" onclick="document.getElementById('global-modal').remove()">取消</button><button class="btn btn-primary" id="modal-ok">確認儲存</button></div>`:''}</div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  if(onOk){const ok=document.getElementById('modal-ok');ok.addEventListener('click',async()=>{btnState(ok,'loading','儲存中...');try{await onOk();ov.remove();}catch(e){btnState(ok,'idle','確認儲存');toast('error','操作失敗',e.message);}});}
  return ov;
}

// Window methods
window.editNews=async id=>{
  const isNew=id.startsWith('new-');
  const ref=isNew?doc(collection(db,'sites',currentSiteId,'news')):doc(db,'sites',currentSiteId,'news',id);
  const d=isNew?{}:(await getDoc(ref)).data()||{};
  modal(isNew?'新增消息':'編輯消息',`<div class="form-group"><label class="form-label">標題</label><input class="form-control" id="m-title" value="${d.title||''}"></div><div class="form-row col-2"><div class="form-group"><label class="form-label">日期</label><input class="form-control" type="date" id="m-date" value="${d.date||''}"></div><div class="form-group"><label class="form-label">分類</label><input class="form-control" id="m-cat" value="${d.category||'公告'}"></div></div><div class="form-group"><label class="form-label">摘要</label><textarea class="form-control" id="m-sum" rows="3">${d.summary||''}</textarea></div><div class="form-group toggle-wrap"><label class="toggle"><input type="checkbox" id="m-vis" ${d.visible!==false?'checked':''}><span class="toggle-slider"></span></label><span>顯示此消息</span></div>`,async()=>{
    const data={title:document.getElementById('m-title').value,date:document.getElementById('m-date').value,category:document.getElementById('m-cat').value,summary:document.getElementById('m-sum').value,visible:document.getElementById('m-vis').checked,_updatedAt:serverTimestamp()};
    if(isNew)await addDoc(collection(db,'sites',currentSiteId,'news'),data);else await setDoc(ref,data,{merge:true});
    toast('success','消息已儲存');loadNewsAdmin();
  });
};

window.editFaq=async id=>{
  const isNew=id.startsWith('new-');
  const ref=isNew?doc(collection(db,'sites',currentSiteId,'faq')):doc(db,'sites',currentSiteId,'faq',id);
  const d=isNew?{}:(await getDoc(ref)).data()||{};
  modal(isNew?'新增 FAQ':'編輯 FAQ',`<div class="form-group"><label class="form-label">問題</label><input class="form-control" id="m-q" value="${d.question||''}"></div><div class="form-group"><label class="form-label">回答</label><textarea class="form-control" id="m-a" rows="4">${d.answer||''}</textarea></div><div class="form-group toggle-wrap"><label class="toggle"><input type="checkbox" id="m-vis" ${d.visible!==false?'checked':''}><span class="toggle-slider"></span></label><span>顯示</span></div>`,async()=>{
    const data={question:document.getElementById('m-q').value,answer:document.getElementById('m-a').value,visible:document.getElementById('m-vis').checked,_updatedAt:serverTimestamp()};
    if(isNew)await addDoc(collection(db,'sites',currentSiteId,'faq'),data);else await setDoc(ref,data,{merge:true});
    toast('success','FAQ 已儲存');loadFaqAdmin();
  });
};

window.editField=async id=>{
  const isNew=id.startsWith('new-');
  const ref=isNew?doc(collection(db,'sites',currentSiteId,'formConfig')):doc(db,'sites',currentSiteId,'formConfig',id);
  const d=isNew?{sort:99,visible:true,required:false}:(await getDoc(ref)).data()||{};
  const types=['text','phone','email','address','date','time','select','radio','checkbox','textarea'];
  modal(isNew?'新增欄位':'編輯欄位',`<div class="form-row col-2"><div class="form-group"><label class="form-label">欄位名稱</label><input class="form-control" id="m-name" value="${d.name||''}"></div><div class="form-group"><label class="form-label">欄位類型</label><select class="form-control" id="m-type">${types.map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).join('')}</select></div></div><div class="form-group"><label class="form-label">Placeholder</label><input class="form-control" id="m-ph" value="${d.placeholder||''}"></div><div class="form-group"><label class="form-label">選項（逗號分隔）</label><input class="form-control" id="m-opts" value="${(d.options||[]).join(',')}"></div><div class="form-row col-2"><div class="form-group toggle-wrap"><label class="toggle"><input type="checkbox" id="m-req" ${d.required?'checked':''}><span class="toggle-slider"></span></label><span>必填</span></div><div class="form-group toggle-wrap"><label class="toggle"><input type="checkbox" id="m-vis" ${d.visible!==false?'checked':''}><span class="toggle-slider"></span></label><span>顯示</span></div></div>`,async()=>{
    const data={name:document.getElementById('m-name').value,type:document.getElementById('m-type').value,placeholder:document.getElementById('m-ph').value,options:document.getElementById('m-opts').value.split(',').map(s=>s.trim()).filter(Boolean),required:document.getElementById('m-req').checked,visible:document.getElementById('m-vis').checked,sort:d.sort||99,_updatedAt:serverTimestamp()};
    if(isNew)await addDoc(collection(db,'sites',currentSiteId,'formConfig'),data);else await setDoc(ref,data,{merge:true});
    toast('success','欄位已儲存');loadFormConfig();
  });
};

window.viewSub=i=>{const s=window._submissions?.[i];if(!s)return;const skip=['_id','siteId','_createdAt','_updatedAt','submittedAt'];modal('表單詳情',`<table style="width:100%;border-collapse:collapse">${Object.entries(s).filter(([k])=>!skip.includes(k)).map(([k,v])=>`<tr><td style="font-weight:600;width:120px">${k}</td><td>${v}</td></tr>`).join('')}</table>`,null);};
