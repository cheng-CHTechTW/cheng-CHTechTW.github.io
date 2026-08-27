(() => {
  const C = window.SITE_CONTENT;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const icon = n => `<i data-lucide="${n}"></i>`;

  $('#serviceGrid').innerHTML = C.services.map(x=>`<article class="service-card reveal"><div class="icon-box">${icon(x.icon)}</div><h3>${x.title}</h3><p>${x.text}</p><a href="#contactFormModal" data-contact-modal>了解更多 →</a></article>`).join('');
  $('#advantageGrid').innerHTML = C.advantages.map(x=>{
    const m = String(x.stat || '').match(/^(\d+)(.*)$/);
    const statHtml = x.stat
      ? (m ? `<strong class="count-up" data-count="${m[1]}" data-suffix="${m[2] || ''}">0${m[2] || ''}</strong>` : `<strong>${x.stat}</strong>`)
      : '';
    return `<article class="adv-card reveal"><div class="round-icon">${icon(x.icon)}</div>${statHtml}<b>${x.title}</b><p>${x.text}</p></article>`;
  }).join('');
  $('#industryGrid').innerHTML = C.industries.map(x=>`<article class="industry-card reveal"><div class="industry-image">${x.image ? `<img src="${x.image}" alt="${x.title}" loading="lazy">` : ''}</div><div class="round-icon">${icon(x.icon)}</div><h3>${x.title}</h3><p>${x.text}</p></article>`).join('');
  $('#processGrid').innerHTML = C.process.map((x,i)=>`<article class="process-card reveal"><span class="num">${String(i+1).padStart(2,'0')}</span>${icon(x.icon)}<b>${x.title}</b><small>${x.text}</small></article>`).join('');
  const ABOUT_MAP={
    pos:{title:'POS 系統規劃',text:'提供餐飲、零售、小吃、美食街與多店管理 POS 規劃，從需求訪談、流程設定、設備搭配、電子發票到交機教學，協助店家快速導入。'},
    web:{title:'網站設計與品牌形象',text:'規劃形象網站、活動頁、產品頁與表單導流頁，重視 RWD、資訊清楚度與品牌整體視覺，讓店家更容易被看見。'},
    service:{title:'售後支援與教育教學',text:'交機後提供遠端協助、操作教學、問題排除、耗材建議與後續調整，讓系統真正持續穩定使用。'},
    system:{title:'系統整合與流程優化',text:'整合電子發票、金流、雲端備份、設備串接與客製流程，降低人工錯誤，讓營運與管理更有效率。'}
  };
  const aboutTitle=$('#aboutDetailTitle');
  const aboutText=$('#aboutDetailText');
  const setAbout=(key)=>{
    const data=ABOUT_MAP[key]||ABOUT_MAP.pos;
    aboutTitle.textContent=data.title;
    aboutText.textContent=data.text;
    $$('[data-about-key]').forEach(btn=>{
      const active=btn.dataset.aboutKey===key;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  };
  $$('[data-about-key]').forEach(btn=>btn.addEventListener('click',()=>setAbout(btn.dataset.aboutKey)));
  $('#faqList').innerHTML = C.faqs.map((x,i)=>`<div class="faq-item" data-search="${(x.q+x.a).toLowerCase()}"><button class="faq-q" aria-expanded="false"><span>Q${i+1}. ${x.q}</span>${icon('chevron-down')}</button><div class="faq-a">${x.a}</div></div>`).join('');
  const renderNewsFeature = (x) => {
    $('#newsFeature').innerHTML=`<div class="year">${x.fullDate.slice(0,4)}</div><h3>【網站公告】${x.title}</h3><b>${x.date}</b><p>${x.body}</p>`;
    lucide.createIcons();
  };
  $('#newsList').innerHTML = C.announcements.slice(0,6).map((x,i)=>`<div class="news-item reveal"><span class="news-date">${x.date}</span><button class="news-title-btn" type="button" data-news-index="${i}">${x.title}</button></div>`).join('');
  renderNewsFeature(C.announcements[0]);
  const tickerAnnouncement=C.announcements[0];
  const [tickerMonth,tickerDay]=String(tickerAnnouncement.date).split('.');
  $('#tickerDate').textContent=`${tickerMonth} | ${tickerDay}`;
  $('#tickerText').textContent=tickerAnnouncement.title;
  
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-news-index]');
    if(!btn)return;
    renderNewsFeature(C.announcements[Number(btn.dataset.newsIndex)]);
    $$('.news-title-btn').forEach(x=>x.classList.toggle('active',x===btn));
  });
  $$('.footer-news-btn').forEach(btn=>btn.addEventListener('click',()=>$('#news').scrollIntoView({behavior:'smooth',block:'start'})));


  const newsModal=$('#newsModal');
  const newsModalDate=$('#newsModalDate');
  const newsModalTitle=$('#newsModalTitle');
  const newsModalBody=$('#newsModalBody');
  let lastNewsTrigger=null;

  const openNewsModal=(announcement,trigger)=>{
    if(!announcement)return;
    lastNewsTrigger=trigger||document.activeElement;
    const parts=String(announcement.date||'').split('.');
    newsModalDate.textContent=`${parts[0]||''} | ${parts[1]||''}`;
    newsModalTitle.textContent=announcement.title||'最新公告';
    newsModalBody.textContent=announcement.body||'';
    newsModal.classList.add('open');
    newsModal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    setTimeout(()=>newsModal.querySelector('.news-modal-close')?.focus(),70);
    lucide.createIcons();
  };
  const closeNewsModal=()=>{
    newsModal.classList.remove('open');
    newsModal.setAttribute('aria-hidden','true');
    if(!document.querySelector('.contact-modal.open')) document.body.classList.remove('modal-open');
    lastNewsTrigger?.focus?.();
  };

  $('#tickerMoreBtn').addEventListener('click',e=>openNewsModal(C.announcements[0],e.currentTarget));

  document.addEventListener('click',e=>{
    const closeBtn=e.target.closest('[data-news-close]');
    if(closeBtn && newsModal.classList.contains('open')){
      e.preventDefault();
      closeNewsModal();
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&newsModal.classList.contains('open')) closeNewsModal();
  });

  function renderProducts(type='hardware'){$('#productGrid').innerHTML=C.products[type].map(x=>`<article class="product-card reveal visible"><div class="product-visual">${x.image ? `<img src="${x.image}" alt="${x.title}" loading="lazy" />` : icon(x.icon)}</div><div class="copy"><h3>${x.title}</h3><p>${x.text}</p></div></article>`).join(''); lucide.createIcons();}
  renderProducts();
  $$('[data-product-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-product-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderProducts(b.dataset.productTab)}));

  $('.nav-toggle').addEventListener('click',e=>{const n=$('.main-nav');n.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',n.classList.contains('open'))});
  $$('.main-nav a').forEach(a=>a.addEventListener('click',()=>$('.main-nav').classList.remove('open')));
  const contactModal=$('#contactFormModal');
  let lastContactTrigger=null;
  const openContactModal=(trigger)=>{lastContactTrigger=trigger||document.activeElement;contactModal.classList.add('open');contactModal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');setTimeout(()=>contactModal.querySelector('input,select,textarea,button')?.focus(),80);};
  const closeContactModal=()=>{contactModal.classList.remove('open');contactModal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');lastContactTrigger?.focus?.();};
  document.addEventListener('click',e=>{const openBtn=e.target.closest('[data-contact-modal]');if(openBtn){e.preventDefault();openContactModal(openBtn);return;}if(e.target.closest('[data-contact-close]')){e.preventDefault();closeContactModal();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&contactModal.classList.contains('open'))closeContactModal();});
  $('#scrollTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  document.addEventListener('click',e=>{const q=e.target.closest('.faq-q');if(!q)return;const item=q.closest('.faq-item');$$('.faq-item.open').filter(x=>x!==item).forEach(x=>{x.classList.remove('open');x.querySelector('.faq-q').setAttribute('aria-expanded','false')});item.classList.toggle('open');q.setAttribute('aria-expanded',item.classList.contains('open'))});
  $('#faqSearch').addEventListener('input',e=>{const v=e.target.value.trim().toLowerCase();$$('.faq-item').forEach(x=>x.style.display=!v||x.dataset.search.includes(v)?'':'none')});
  $('#contactForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const sub=encodeURIComponent(`網站諮詢｜${fd.get('service')}｜${fd.get('name')}`);const body=encodeURIComponent(`姓名 / 店名：${fd.get('name')}
電話：${fd.get('phone')}
Email：${fd.get('email')}
LINE ID：${fd.get('line')||''}
需求項目：${fd.get('service')}

需求內容：
${fd.get('message')}`);location.href=`mailto:service@chuang-c.com?subject=${sub}&body=${body}`;$('#formNote').textContent='已準備 Email 內容，請在郵件軟體確認後寄出。'});


  const frontAdminModal=$('#frontAdminLogin');
  const frontAdminTrigger=$('#adminLoginTrigger');
  const frontAdminUser=$('#frontAdminUser');
  const frontAdminPass=$('#frontAdminPass');
  const frontAdminError=$('#frontAdminError');

  const openFrontAdminLogin=()=>{
    frontAdminModal.classList.add('open');
    frontAdminModal.setAttribute('aria-hidden','false');
    document.body.classList.add('front-admin-open');
    frontAdminError.textContent='';
    setTimeout(()=>frontAdminUser.focus(),60);
    lucide.createIcons();
  };
  const closeFrontAdminLogin=()=>{
    frontAdminModal.classList.remove('open');
    frontAdminModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('front-admin-open');
    frontAdminTrigger?.focus();
  };

  frontAdminTrigger?.addEventListener('click',openFrontAdminLogin);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-admin-login-close]')&&frontAdminModal.classList.contains('open')){
      e.preventDefault();
      closeFrontAdminLogin();
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&frontAdminModal.classList.contains('open')) closeFrontAdminLogin();
  });

  $('#frontAdminTogglePass')?.addEventListener('click',()=>{
    frontAdminPass.type=frontAdminPass.type==='password'?'text':'password';
  });

  $('#frontAdminLoginForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const user=frontAdminUser.value.trim();
    const pass=frontAdminPass.value;
    if(user==='admin'&&pass==='1234'){
      sessionStorage.setItem('cc_admin_preview','1');
      location.href='admin/index.html#dashboard';
      return;
    }
    frontAdminError.textContent='帳號或密碼不正確。';
  });

  const animateCount = el => {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || '';
    const duration = 850;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const frame = now => {
      const p = Math.min((now - start) / duration, 1);
      const value = Math.round(target * easeOut(p));
      el.textContent = `${value}${suffix}`;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const countObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.45});
  $$('.count-up').forEach(el=>countObserver.observe(el));

  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');io.unobserve(x.target)}}),{threshold:.12}); $$('.reveal').forEach(x=>io.observe(x));
  window.addEventListener('load',()=>lucide.createIcons());
})();
