(() => {
  const CFG=window.INVOICE_QA_GOOGLE_SHEETS_CONFIG||{};
  const URL=String(CFG.webAppUrl||'').trim();
  const $=id=>document.getElementById(id);
  let key=sessionStorage.getItem('invoiceQaAdminKey')||'';
  let rows=[];
  let editingId='';

  const setStatus=(t,ok=false)=>{ $('status').textContent=t; $('status').style.color=ok?'#416344':'#7b736b'; };
  const esc=(s='')=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  async function get(action){
    if(!URL) throw new Error('尚未設定電子發票專用 Apps Script Web App URL');
    const u=`${URL}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(key)}&_=${Date.now()}`;
    const r=await fetch(u,{cache:'no-store',redirect:'follow'});
    const data=await r.json();
    if(!r.ok||data.ok===false) throw new Error(data.message||`HTTP ${r.status}`);
    return data;
  }
  async function post(action,data){
    if(!URL) throw new Error('尚未設定電子發票專用 Apps Script Web App URL');
    const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,key,data}),redirect:'follow'});
    const out=await r.json();
    if(!r.ok||out.ok===false) throw new Error(out.message||`HTTP ${r.status}`);
    return out;
  }

  function render(){
    const kw=$('search').value.trim().toLowerCase();
    const cat=$('catFilter').value;
    const list=rows.filter(x=>{
      const q=String(x.question||'').toLowerCase(),a=String(x.answer||'').toLowerCase();
      return (!kw||(q+' '+a).includes(kw))&&(!cat||x.category===cat);
    });
    $('tbody').innerHTML=list.length?list.map(x=>`<tr>
      <td>${esc(x.sort)}</td><td>${esc(x.category)}</td><td class="qcell">${esc(x.question)}</td>
      <td class="acell">${esc(x.answer)}</td><td>${x.enabled==='N'?'停用':'啟用'}</td>
      <td><button class="btn light" data-edit="${esc(x.id)}">編輯</button> <button class="btn danger" data-del="${esc(x.id)}">刪除</button></td>
    </tr>`).join(''):`<tr><td colspan="6" class="empty">沒有符合的資料。</td></tr>`;
    $('tbody').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(rows.find(x=>x.id===b.dataset.edit)));
    $('tbody').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeRow(b.dataset.del));

    const cats=[...new Set(rows.map(x=>x.category).filter(Boolean))].sort();
    const old=$('catFilter').value;
    $('catFilter').innerHTML='<option value="">全部分類</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');
    $('catFilter').value=cats.includes(old)?old:'';
  }

  async function load(){
    try{
      setStatus('同步中…');
      const out=await get('listInvoiceFaqs');
      rows=(out.items||out.data||[]).map(x=>({
        id:String(x.id||x['ID']||''),category:String(x.category||x['分類']||''),
        question:String(x.question||x['問題']||''),answer:String(x.answer||x['回答']||''),
        sort:Number(x.sort??x['排序']??9999),enabled:String(x.enabled??x['啟用']??'Y')
      }));
      rows.sort((a,b)=>a.sort-b.sort);
      render(); setStatus(`已同步 ${rows.length} 筆`,true);
    }catch(e){ setStatus(e.message); alert(e.message); }
  }

  function openEditor(x=null){
    editingId=x?.id||'';
    $('editorTitle').textContent=x?'編輯 QA':'新增 QA';
    $('fCategory').value=x?.category||'';
    $('fSort').value=x?.sort??100;
    $('fEnabled').value=x?.enabled||'Y';
    $('fQuestion').value=x?.question||'';
    $('fAnswer').value=x?.answer||'';
    $('editor').classList.add('open');
    $('fQuestion').focus();
  }
  function closeEditor(){ $('editor').classList.remove('open'); editingId=''; }

  async function save(){
    const data={
      id:editingId,category:$('fCategory').value.trim(),question:$('fQuestion').value.trim(),
      answer:$('fAnswer').value.trim(),sort:Number($('fSort').value||100),enabled:$('fEnabled').value
    };
    if(!data.question||!data.answer){alert('問題與回答不可空白');return;}
    try{
      $('saveBtn').disabled=true; setStatus('儲存中…');
      await post('saveInvoiceFaq',data);
      closeEditor(); await load();
    }catch(e){alert(e.message);setStatus(e.message);}finally{$('saveBtn').disabled=false;}
  }

  async function removeRow(id){
    if(!confirm('確定刪除這筆 QA？')) return;
    try{setStatus('刪除中…');await post('deleteInvoiceFaq',{id});await load();}
    catch(e){alert(e.message);setStatus(e.message);}
  }

  $('connectBtn').onclick=()=>{
    key=$('adminKey').value.trim();
    if(!key){alert('請輸入管理金鑰');return;}
    sessionStorage.setItem('invoiceQaAdminKey',key); load();
  };
  $('newBtn').onclick=()=>openEditor();
  $('cancelBtn').onclick=closeEditor;
  $('saveBtn').onclick=save;
  $('reloadBtn').onclick=load;
  $('seedBtn').onclick=async()=>{
    if(!confirm('將網站目前的 23 題 QA 帶入電子發票專用 Google 試算表？已存在的問題不會重複新增。')) return;
    try{
      setStatus('帶入中…');
      const out=await post('importCurrentInvoiceFaqs',{});
      alert(out.message||'已完成帶入');
      await load();
    }catch(e){alert(e.message);setStatus(e.message);}
  };
  $('search').oninput=render;
  $('catFilter').onchange=render;

  if(key){$('adminKey').value=key;load();}
})();