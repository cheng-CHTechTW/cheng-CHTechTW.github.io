
(() => {
  const cfg = window.GOOGLE_SHEETS_CONFIG || {};
  const url = String(cfg.webAppUrl || '').trim();
  if (!url) return;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  const escapeHtml = (v='') => String(v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");

  const findContainer = () =>
    $('#newsList') ||
    $('#newsArchiveList') ||
    $('.news-list') ||
    $('.latest-news-list') ||
    $('[data-news-list]');

  const render = (items) => {
    const host = findContainer();
    if (!host) return;

    if (!Array.isArray(items) || items.length === 0) {
      host.innerHTML = '<div class="news-google-empty">目前沒有已發布的最新消息。</div>';
      return;
    }

    host.innerHTML = items.map((x, i) => `
      <article class="news-google-item" data-news-id="${escapeHtml(x.id || '')}">
        <button class="news-google-head" type="button" aria-expanded="false">
          <time>${escapeHtml((x.date || '').replace('.', ' | '))}</time>
          <strong>${escapeHtml(x.title || '')}</strong>
          <span class="news-google-arrow" aria-hidden="true">⌄</span>
        </button>
        <div class="news-google-body" hidden>
          <div>${escapeHtml(x.body || '').replace(/\n/g,'<br>')}</div>
          ${x.fullDate ? `<small>發布日期：${escapeHtml(x.fullDate)}</small>` : ''}
        </div>
      </article>
    `).join('');

    host.querySelectorAll('.news-google-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.news-google-item');
        const body = item.querySelector('.news-google-body');
        const opening = body.hidden;

        host.querySelectorAll('.news-google-item').forEach(other => {
          if (other === item) return;
          const ob = other.querySelector('.news-google-body');
          const oh = other.querySelector('.news-google-head');
          if (ob) ob.hidden = true;
          if (oh) oh.setAttribute('aria-expanded','false');
          other.classList.remove('is-open');
        });

        body.hidden = !opening;
        btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        item.classList.toggle('is-open', opening);
      });
    });
  };

  const load = async () => {
    const host = findContainer();
    if (host) host.innerHTML = '<div class="news-google-loading"><span></span>正在同步最新消息…</div>';

    try {
      const res = await fetch(`${url}?action=news&_=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json || json.ok !== true || !Array.isArray(json.data)) {
        throw new Error((json && json.error) || 'Google 最新消息讀取失敗');
      }
      // "news" endpoint already excludes disabled rows.
      render(json.data);
      document.documentElement.dataset.newsSource = 'google';
    } catch (err) {
      console.error('[news-google]', err);
      if (host) {
        host.innerHTML = `<div class="news-google-empty">最新消息同步失敗，請稍後重新整理。</div>`;
      }
      document.documentElement.dataset.newsSource = 'error';
    }
  };

  document.addEventListener('DOMContentLoaded', load, { once:true });
})();
