(() => {
  const CFG = window.INVOICE_QA_GOOGLE_SHEETS_CONFIG || {};
  const URL = String(CFG.webAppUrl || '').trim();
  const mount = document.getElementById('invoiceQaDynamic');
  const fallback = document.getElementById('invoiceQaStatic');
  const status = document.getElementById('invoiceQaSyncStatus');

  const esc = (s='') => String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");

  const nl2br = s => esc(s).replace(/\n/g,'<br>');

  function render(items){
    if(!mount || !Array.isArray(items) || !items.length) return false;
    const active = items
      .filter(x => String(x.enabled ?? x['啟用'] ?? 'Y').toUpperCase() !== 'N')
      .sort((a,b)=>(Number(a.sort ?? a['排序'] ?? 9999)-Number(b.sort ?? b['排序'] ?? 9999)));

    if(!active.length) return false;

    const cats=[...new Set(active.map(x=>String(x.category ?? x['分類'] ?? '其他').trim()||'其他'))];
    mount.innerHTML = `
      <div class="qa-live-toolbar">
        <div class="qa-live-cats">
          <button type="button" class="qa-cat-btn active" data-cat="all">全部</button>
          ${cats.map(c=>`<button type="button" class="qa-cat-btn" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
        <div class="qa-live-search">
          <input id="qaLiveSearch" type="search" placeholder="搜尋問題或答案">
          <button id="qaLiveSearchBtn" type="button">搜尋</button>
        </div>
      </div>
      <div id="qaLiveList" class="qa-live-list">
        ${active.map((x,i)=>{
          const cat=String(x.category ?? x['分類'] ?? '其他').trim()||'其他';
          const q=String(x.question ?? x['問題'] ?? '');
          const a=String(x.answer ?? x['回答'] ?? '');
          return `<details class="faq-item qa-live-item" data-cat="${esc(cat)}" data-search="${esc((q+' '+a).toLowerCase())}">
            <summary><span class="qmark">Q</span><span>${esc(q)}</span><span class="chev">⌄</span></summary>
            <div class="answer"><span class="amark">A</span><div>${nl2br(a)}</div></div>
          </details>`;
        }).join('')}
      </div>
      <div id="qaLiveEmpty" class="qa-live-empty" hidden>找不到符合的相關問題。</div>
    `;

    if(fallback) fallback.hidden=true;
    mount.hidden=false;

    let currentCat='all';
    const input=mount.querySelector('#qaLiveSearch');
    const empty=mount.querySelector('#qaLiveEmpty');
    const itemsEls=[...mount.querySelectorAll('.qa-live-item')];

    function apply(){
      const keyword=(input?.value||'').trim().toLowerCase();
      let shown=0;
      itemsEls.forEach(el=>{
        const okCat=currentCat==='all'||el.dataset.cat===currentCat;
        const okKey=!keyword||String(el.dataset.search||'').includes(keyword);
        const show=okCat&&okKey;
        el.hidden=!show;
        if(show) shown++;
      });
      if(empty) empty.hidden=shown!==0;
    }

    mount.querySelectorAll('.qa-cat-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentCat=btn.dataset.cat||'all';
        mount.querySelectorAll('.qa-cat-btn').forEach(x=>x.classList.toggle('active',x===btn));
        apply();
      });
    });
    mount.querySelector('#qaLiveSearchBtn')?.addEventListener('click',apply);
    input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
    input?.addEventListener('input',()=>{if(!input.value) apply();});

    if(status){
      status.textContent='已同步電子發票專用 Google 試算表';
      status.classList.add('ok');
    }
    return true;
  }

  async function load(){
    if(!URL){
      if(status) status.textContent='目前使用網站內建 QA；設定電子發票專用試算表後會自動同步。';
      return;
    }
    try{
      const endpoint=`${URL}?action=getInvoiceFaqs&_=${Date.now()}`;
      const res=await fetch(endpoint,{method:'GET',redirect:'follow',cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const items=Array.isArray(data)?data:(data.items||data.data||[]);
      if(!render(items)) throw new Error('EMPTY');
    }catch(err){
      console.warn('Invoice QA Google Sheet sync failed:',err);
      if(status){
        status.textContent='Google 試算表暫時無法讀取，已切換為網站內建 QA。';
        status.classList.add('warn');
      }
    }
  }
  load();
})();