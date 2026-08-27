
(() => {
  const cfg = window.GOOGLE_SHEETS_CONFIG || {};
  const url = String(cfg.webAppUrl || '').trim();

  const $ = (s, root=document) => root.querySelector(s);
  const esc = (v='') => String(v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");

  const boolish = (v) => {
    if (v === true) return true;
    if (v === false || v == null) return false;
    const s = String(v).trim().toLowerCase();
    return !['false','0','否','停用','關閉','disabled','off',''].includes(s);
  };

  const host = () => $('#newsList');
  const meta = () => $('#newsSyncMeta');
  const dot = () => $('#newsSyncDot');
  const text = () => $('#newsSyncText');
  const time = () => $('#newsSyncTime');

  const setSync = (state, message, withTime=false) => {
    if(meta()) meta().dataset.state = state;
    if(text()) text().textContent = message;
    if(dot()) dot().classList.toggle('is-spinning', state === 'loading');
    if(withTime && time()){
      const now = new Date();
      time().textContent = `最後更新 ${now.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}`;
    }
  };

  const render = (items) => {
    const el = host();
    if (!el) return;

    const rows = Array.isArray(items)
      ? items.filter(x => boolish(x.enabled))
      : [];

    if (!rows.length) {
      el.innerHTML = '<div class="news-google-empty">目前沒有已發布的最新消息。</div>';
      return;
    }

    el.innerHTML = rows.map(x => `
      <article class="news-google-item" data-news-id="${esc(x.id || '')}">
        <button class="news-google-head" type="button" aria-expanded="false">
          <time>${esc(String(x.date || '').replace('.', ' | '))}</time>
          <strong>${esc(x.title || '')}</strong>
          <span class="news-google-arrow" aria-hidden="true">⌄</span>
        </button>
        <div class="news-google-body" hidden>
          <div>${esc(x.body || '').replace(/\n/g,'<br>')}</div>
          ${x.fullDate ? `<small>發布日期：${esc(x.fullDate)}</small>` : ''}
        </div>
      </article>
    `).join('');

    el.querySelectorAll('.news-google-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = btn.closest('.news-google-item');
        const body = current.querySelector('.news-google-body');
        const willOpen = body.hidden;

        el.querySelectorAll('.news-google-item').forEach(item => {
          const b = item.querySelector('.news-google-body');
          const h = item.querySelector('.news-google-head');
          if (item !== current) {
            if (b) b.hidden = true;
            if (h) h.setAttribute('aria-expanded','false');
            item.classList.remove('is-open');
          }
        });

        body.hidden = !willOpen;
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        current.classList.toggle('is-open', willOpen);
      });
    });
  };

  const load = async () => {
    if (!url) {
      setSync('error','尚未設定 Google 試算表連線');
      return;
    }

    const el = host();
    if (!el) {
      console.error('[news-google] #newsList not found');
      return;
    }

    setSync('loading','同步中…');
    el.innerHTML = '<div class="news-google-loading"><span></span>正在同步最新消息…</div>';

    try {
      // Public page intentionally requests "news", so disabled rows are excluded server-side.
      const res = await fetch(`${url}?action=news&_=${Date.now()}`, {
        method:'GET',
        cache:'no-store',
        redirect:'follow'
      });
      const data = await res.json();

      if (!data || data.ok !== true || !Array.isArray(data.data)) {
        throw new Error((data && data.error) || 'invalid_response');
      }

      render(data.data);
      setSync('success',`已同步 ${data.data.length} 則`,true);
      document.documentElement.dataset.newsSource='google';
    } catch (err) {
      console.error('[news-google]', err);
      el.innerHTML = '<div class="news-google-empty">最新消息同步失敗，請稍後重新整理。</div>';
      setSync('error','同步失敗',true);
      document.documentElement.dataset.newsSource='error';
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', load, {once:true});
  }else{
    load();
  }

  // expose for manual refresh/debug
  window.reloadGoogleNews = load;
})();
