
(() => {
  const cfg = window.GOOGLE_SHEETS_CONFIG || {};
  const url = String(cfg.webAppUrl || '').trim();

  const $ = (s, root=document) => root.querySelector(s);
  const esc = (v='') => String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");

  const host = () => $('#newsPageList');
  const meta = () => $('#newsSyncMeta');
  const dot = () => $('#newsSyncDot');
  const text = () => $('#newsSyncText');
  const time = () => $('#newsSyncTime');

  const setSync = (state, message, showTime=false) => {
    const m = meta();
    if(m) m.dataset.state = state;
    if(text()) text().textContent = message;
    if(dot()) dot().classList.toggle('is-spinning', state === 'loading');

    if(showTime && time()){
      const now = new Date();
      time().textContent =
        `最後更新 ${now.toLocaleTimeString('zh-TW',{
          hour:'2-digit',
          minute:'2-digit',
          second:'2-digit',
          hour12:false
        })}`;
    }
  };

  // 優先使用 fullDate，避免 Google Sheets 把 08.20 轉成 8.2。
  const displayDate = (x) => {
    const full = String(x.fullDate || '').trim();
    const m = full.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){
      return `${String(m[2]).padStart(2,'0')} | ${String(m[3]).padStart(2,'0')}`;
    }

    const raw = String(x.date || '').trim();
    const d = raw.split(/[.\-\/|]/).map(v => v.trim()).filter(Boolean);
    if(d.length >= 2){
      return `${String(Number(d[0]) || d[0]).padStart(2,'0')} | ${String(Number(d[1]) || d[1]).padStart(2,'0')}`;
    }
    return raw;
  };

  const render = (items) => {
    const el = host();
    if(!el) return;

    if(!Array.isArray(items) || items.length === 0){
      el.innerHTML = '<div class="news-google-empty">目前沒有已發布的最新消息。</div>';
      return;
    }

    el.innerHTML = items.map((x, i) => `
      <article class="news-page-card">
        <button class="news-page-title" type="button" aria-expanded="false">
          <span class="news-page-date">${esc(displayDate(x))}</span>
          <span class="news-page-heading">${esc(x.title || '')}</span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="news-page-body">
          <div class="news-page-full-date">發布日期：${esc(x.fullDate || '')}</div>
          <p>${esc(x.body || '').replace(/\n/g,'<br>')}</p>
        </div>
      </article>
    `).join('');

    el.querySelectorAll('.news-page-title').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.news-page-card');

        el.querySelectorAll('.news-page-card.open').forEach(other => {
          if(other !== card){
            other.classList.remove('open');
            const otherBtn = other.querySelector('.news-page-title');
            if(otherBtn) otherBtn.setAttribute('aria-expanded','false');
          }
        });

        card.classList.toggle('open');
        btn.setAttribute(
          'aria-expanded',
          card.classList.contains('open') ? 'true' : 'false'
        );
      });
    });

    if(window.lucide) lucide.createIcons();
  };

  const load = async () => {
    const el = host();

    if(!el){
      console.error('[news-google] #newsPageList not found');
      return;
    }

    if(!url){
      el.innerHTML = '<div class="news-google-empty">尚未設定 Google 試算表連線。</div>';
      setSync('error','尚未設定 Google 試算表連線');
      return;
    }

    setSync('loading','同步中…');
    el.innerHTML = '<div class="news-google-loading"><span></span>正在同步最新消息…</div>';

    try{
      const response = await fetch(`${url}?action=news&_=${Date.now()}`, {
        method:'GET',
        cache:'no-store',
        redirect:'follow'
      });

      const result = await response.json();

      if(!result || result.ok !== true || !Array.isArray(result.data)){
        throw new Error((result && result.error) || 'invalid_response');
      }

      // Apps Script 的 action=news 本身只回傳 enabled=true 的資料。
      render(result.data);
      setSync('success', `已同步 ${result.data.length} 則`, true);
      document.documentElement.dataset.newsSource = 'google';
    }catch(err){
      console.error('[news-google]', err);
      el.innerHTML =
        '<div class="news-google-empty">最新消息同步失敗，請稍後重新整理。</div>';
      setSync('error','同步失敗',true);
      document.documentElement.dataset.newsSource = 'error';
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', load, { once:true });
  }else{
    load();
  }

  window.reloadGoogleNews = load;
})();
