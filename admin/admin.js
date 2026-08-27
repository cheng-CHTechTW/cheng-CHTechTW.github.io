(() => {
  const C = window.SITE_CONTENT || {announcements:[],services:[],products:{hardware:[],consumables:[]},industries:[]};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const icon = n => `<i data-lucide="${n}"></i>`;

  const UI_USER = 'admin';
  const UI_PASS = '1234';

  const GOOGLE_SHEETS_ADMIN_CONFIG = window.GOOGLE_SHEETS_CONFIG || {};

  const FRONT_SETTINGS = {
    heroTitle:'讓營運更簡單，讓成長更有力量',
    heroSubtitle:'整合 POS、電子發票、雲端服務、網站設計與客製系統。',
    heroImage:'converted.svg',
    logo:'chlogo.svg',
    favicon:'chlogo.svg / favicon.svg',
    solutionImage:'assets/img/one-stop-pos.svg',
    newsPage:'news/index.html',
    ticker:'月 | 日固定 + 公告標題跑馬 + > 詳情',
    contact:'Modal 視窗跳出',
    adminEntry:'版權列左側菱形 ICON',
    company:{
      name:'誠創科技工作室',
      phone:'(02) 8623-7091',
      phoneHref:'tel:+886286237091',
      email:'service@chuang-c.com',
      emailHref:'mailto:service@chuang-c.com',
      line:'@905dqqgw',
      lineHref:'https://lin.ee/N8TErfC',
      address:'新北市淡水區水源街二段177巷104號6樓',
      hours:'週一～週五 09:00～18:00'
    }
  };

  const INQUIRIES = [
    {id:'Q20260827001',name:'晨光餐飲',phone:'0912-345-678',email:'morning@example.com',line:'morningpos',service:'POS 系統',date:'2026-08-27 07:18',message:'新店預計 9 月開幕，需要一套 POS、出單機與錢箱，希望可以支援電子發票與後續雲端看帳。',unread:true},
    {id:'Q20260827002',name:'好食商行',phone:'0922-168-520',email:'goodfood@example.com',line:'goodfood520',service:'電子發票',date:'2026-08-27 06:52',message:'目前已有 POS，希望詢問電子發票申請、字軌設定與出單設備整合方式。',unread:true},
    {id:'Q20260826001',name:'樂品生活',phone:'0988-320-611',email:'life@example.com',line:'life.shop',service:'網站設計',date:'2026-08-26 18:40',message:'需要製作品牌形象網站，包含產品介紹、最新公告、聯絡表單與手機版 RWD。',unread:false},
    {id:'Q20260825003',name:'拾味小館',phone:'0935-620-199',email:'taste@example.com',line:'taste88',service:'多元支付',date:'2026-08-25 15:12',message:'想了解店內 POS 可否串接多元支付與電子發票，並希望操作流程簡單。',unread:false},
    {id:'Q20260824001',name:'方圓百貨',phone:'0975-881-232',email:'square@example.com',line:'squaremart',service:'設備與耗材',date:'2026-08-24 11:06',message:'需要追加熱感紙捲、標籤貼紙與一台標籤機，請協助確認規格。',unread:false},
    {id:'Q20260823002',name:'雲食餐飲集團',phone:'0908-555-210',email:'cloudfood@example.com',line:'cloudfood',service:'雲端服務',date:'2026-08-23 14:22',message:'目前有三間分店，希望整合遠端看帳、每日營收與雲端備份。',unread:false},
    {id:'Q20260822001',name:'創意選物',phone:'0966-140-330',email:'select@example.com',line:'select.tw',service:'客製化開發',date:'2026-08-22 09:35',message:'希望開發內部商品、客戶、銷售與庫存管理介面，並可輸出報表。',unread:false}
  ];

  const ADMIN_USERS = [
    {
      name:'系統管理員',
      username:'admin',
      email:'service@chuang-c.com',
      role:'超級管理員',
      enabled:true,
      password:'1234',
      permissions:['dashboard','news','faq-admin','home','services','products','industries','forms','company','links','appearance','admins','system'],
      lastLogin:'2026-08-27 07:41'
    },
    {
      name:'內容管理',
      username:'content',
      email:'content@chuang-c.com',
      role:'內容管理員',
      enabled:true,
      password:'1234',
      permissions:['dashboard','news','faq-admin','home','services','products','industries','appearance'],
      lastLogin:'尚未登入'
    }
  ];

  const loginView = $('#loginView');
  const adminView = $('#adminView');

  const showAdmin = () => {
    loginView.hidden = true;
    adminView.hidden = false;
    renderAll();
    setTimeout(loadGoogleAdminData,0);
    const currentUsername=sessionStorage.getItem('cc_admin_user')||'admin';
    const currentAdmin=ADMIN_USERS.find(x=>x.username===currentUsername)||ADMIN_USERS[0];
    $$('.nav-item[data-page]').forEach(btn=>{
      const allowed=currentAdmin.permissions.includes(btn.dataset.page);
      btn.style.display=allowed?'':'none';
    });
    let initialPage=getHashPage();
    if(!currentAdmin.permissions.includes(initialPage)) initialPage=currentAdmin.permissions[0]||'dashboard';
    openPage(initialPage, !location.hash);
    lucide.createIcons();
  };
  const showLogin = () => {
    adminView.hidden = true;
    loginView.hidden = false;
    lucide.createIcons();
  };

  $('#togglePass').addEventListener('click', () => {
    const p = $('#loginPass');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const u = $('#loginUser').value.trim();
    const p = $('#loginPass').value;
    const matched = ADMIN_USERS.find(x=>x.username===u && x.password===p && x.enabled);
    if (matched) {
      sessionStorage.setItem('cc_admin_preview','1');
      sessionStorage.setItem('cc_admin_user',matched.username);
      $('#loginError').textContent = '';
      history.replaceState(null,'','#dashboard');
      showAdmin();
    } else {
      $('#loginError').textContent = '帳號、密碼不正確，或此管理員已停用。';
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('cc_admin_preview');
    sessionStorage.removeItem('cc_admin_user');
    history.replaceState(null,'',location.pathname);
    showLogin();
  });

  const pageNames = {
    dashboard:'儀表板', news:'最新消息','faq-admin':'常見問題', home:'首頁內容', services:'服務項目',
    products:'產品設備', industries:'適用產業', forms:'表單洽詢', company:'公司資訊',
    links:'連結 / 快捷', appearance:'版面與色彩', admins:'管理員管理', system:'系統設定'
  };

  const validPages = Object.keys(pageNames);
  const getHashPage = () => {
    const page = location.hash.replace('#','').trim();
    return validPages.includes(page) ? page : 'dashboard';
  };

  const openPage = (page, syncHash=true) => {
    if(!validPages.includes(page)) page = 'dashboard';
    const currentUsername=sessionStorage.getItem('cc_admin_user')||'admin';
    const currentAdmin=ADMIN_USERS.find(x=>x.username===currentUsername)||ADMIN_USERS[0];
    if(!currentAdmin.permissions.includes(page)) page=currentAdmin.permissions[0]||'dashboard';
    $$('.admin-page').forEach(x => x.classList.toggle('active', x.dataset.adminPage === page));
    $$('.nav-item').forEach(x => {
      const active = x.dataset.page === page;
      x.classList.toggle('active', active);
      x.setAttribute('aria-current', active ? 'page' : 'false');
    });
    $('#pageTitle').textContent = pageNames[page] || '後台管理';
    document.title = `${pageNames[page] || '後台管理'}｜誠創科技後台`;
    adminView.classList.remove('menu-open');
    if(syncHash && location.hash !== `#${page}`){
      history.replaceState(null,'',`#${page}`);
    }

    // V51：進入 Google 資料頁時立即重新同步。
    if(['news','faq-admin','forms'].includes(page)){
      setTimeout(()=>{
        if(typeof v48SyncAll === 'function'){
          v48SyncAll();
        }else{
          if(page==='news' && typeof loadGsNews === 'function') loadGsNews();
          if(page==='faq-admin' && typeof loadGsFaq === 'function') loadGsFaq();
          if(page==='forms' && typeof loadGsInquiries === 'function') loadGsInquiries();
        }
      },60);
    }

    window.scrollTo({top:0,behavior:'smooth'});
  };

  $('#adminNav').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (b) openPage(b.dataset.page);
  });
  window.addEventListener('hashchange', () => {
    if(!adminView.hidden) openPage(getHashPage(), false);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open-page]');
    if (b) openPage(b.dataset.openPage);
  });

  $('#mobileMenu').addEventListener('click', () => adminView.classList.toggle('menu-open'));
  $('#drawerOverlay').addEventListener('click', () => adminView.classList.remove('menu-open'));
  $('#previewBtn').addEventListener('click', () => location.href = '../index.html');

  const exportContent = () => {
    const blob = new Blob(['window.SITE_CONTENT = ' + JSON.stringify(C,null,2) + ';\n'], {type:'text/javascript'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.js';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  };
  $('#exportBtn').addEventListener('click', exportContent);
  $('#exportBtn2').addEventListener('click', exportContent);

  const fmtDate = d => {
    const [m,day] = String(d || '').split('.');
    return `${m || ''} | ${day || ''}`;
  };

  const renderDashboard = () => {
    const customerCount = INQUIRIES.length;
    const unreadCount = INQUIRIES.filter(x => x.unread).length;
    if($('#dashCustomers')) $('#dashCustomers').textContent = customerCount;
    if($('#dashUnread')) $('#dashUnread').textContent = unreadCount;
    if($('#dashNews')) $('#dashNews').textContent = C.announcements.length;
    if($('#dashIndustries')) $('#dashIndustries').textContent = C.industries.length;
    if($('#newsCount')) $('#newsCount').textContent = C.announcements.length;
    if($('#formUnreadBadge')) $('#formUnreadBadge').textContent = unreadCount;
    if($('#formUnreadBadge')) $('#formUnreadBadge').classList.toggle('has-unread', unreadCount > 0);
    const dashNewsList=$('#dashNewsList');
    if(dashNewsList){
      dashNewsList.innerHTML = C.announcements.slice(0,5).map(x => `
        <div class="mini-item"><time>${fmtDate(x.date)}</time><div><b>${x.title}</b><span>${x.fullDate || ''}</span></div><span>已發布</span></div>
      `).join('');
    }
  };

  const renderNews = (query='') => {
    const list=$('#newsAdminList');
    if(!list) return;
    const q = query.trim().toLowerCase();
    list.innerHTML = C.announcements.map((x,i)=>({x,i}))
      .filter(({x}) => !q || (x.title + x.body).toLowerCase().includes(q))
      .map(({x,i}) => `
        <div class="admin-row">
          <time>${fmtDate(x.date)}</time>
          <div class="row-copy"><b>${x.title}</b><small>${x.body}</small></div>
          <div class="row-actions">
            <button class="icon-btn" data-edit="news" data-index="${i}" title="編輯">${icon('pencil')}</button>
            <button class="icon-btn danger" data-delete-news="${i}" title="刪除">${icon('trash-2')}</button>
          </div>
        </div>
      `).join('');
    lucide.createIcons();
  };

  const renderServices = () => {
    $('#serviceAdminGrid').innerHTML = C.services.map((x,i)=>`
      <article class="edit-card">
        <div class="edit-media">${icon(x.icon || 'briefcase')}</div>
        <div class="edit-card-body"><h3>${x.title}</h3><p>${x.text}</p>
          <div class="edit-card-foot"><code>${x.icon || ''}</code><button class="ghost" data-edit="service" data-index="${i}">編輯</button></div>
        </div>
      </article>`).join('');
    lucide.createIcons();
  };

  let productType = 'hardware';
  const renderProducts = () => {
    const arr = C.products[productType] || [];
    $('#productAdminGrid').innerHTML = arr.map((x,i)=>`
      <article class="edit-card">
        <div class="edit-media">${x.image ? `<img src="../${x.image}" alt="${x.title}">` : icon(x.icon || 'package')}</div>
        <div class="edit-card-body"><h3>${x.title}</h3><p>${x.text}</p>
          <div class="edit-card-foot"><code>${x.image || x.icon || ''}</code><button class="ghost" data-edit="product" data-index="${i}">編輯</button></div>
        </div>
      </article>`).join('');
    lucide.createIcons();
  };

  const renderIndustries = () => {
    $('#industryAdminGrid').innerHTML = C.industries.map((x,i)=>`
      <article class="edit-card">
        <div class="edit-media">${x.image ? `<img src="../${x.image}" alt="${x.title}">` : icon(x.icon || 'store')}</div>
        <div class="edit-card-body"><h3>${x.title}</h3><p>${x.text}</p>
          <div class="edit-card-foot"><code>${x.image || ''}</code><button class="ghost" data-edit="industry" data-index="${i}">編輯</button></div>
        </div>
      </article>`).join('');
    lucide.createIcons();
  };

  const setValue = (selector,value) => {
    const el=$(selector);
    if(el) el.value=value;
  };
  const setText = (selector,value) => {
    const el=$(selector);
    if(el) el.textContent=value;
  };

  const syncFrontSettingsToAdmin = () => {
    setValue('#frontHeroTitle',FRONT_SETTINGS.heroTitle);
    setValue('#frontHeroSubtitle',FRONT_SETTINGS.heroSubtitle);
    setValue('#frontHeroImage',FRONT_SETTINGS.heroImage);

    setText('#frontLogoSetting',FRONT_SETTINGS.logo);
    setText('#frontFaviconSetting',FRONT_SETTINGS.favicon);
    setText('#frontHeroSetting',FRONT_SETTINGS.heroImage);
    setText('#frontSolutionSetting',FRONT_SETTINGS.solutionImage);
    setText('#frontTickerSetting',FRONT_SETTINGS.ticker);
    setText('#frontContactSetting',FRONT_SETTINGS.contact);
    setText('#frontNewsPageSetting',FRONT_SETTINGS.newsPage);
    setText('#frontAdminEntrySetting',FRONT_SETTINGS.adminEntry);

    setValue('#companyName',FRONT_SETTINGS.company.name);
    setValue('#companyPhone',FRONT_SETTINGS.company.phone);
    setValue('#companyEmail',FRONT_SETTINGS.company.email);
    setValue('#companyLine',FRONT_SETTINGS.company.line);
    setValue('#companyAddress',FRONT_SETTINGS.company.address);
    setValue('#companyHours',FRONT_SETTINGS.company.hours);
    setValue('#companyLogo',FRONT_SETTINGS.logo);

    setText('#linkLineLabel',FRONT_SETTINGS.company.line);
    setValue('#linkLineUrl',FRONT_SETTINGS.company.lineHref);
    setText('#linkPhoneLabel',FRONT_SETTINGS.company.phone);
    setValue('#linkPhoneUrl',FRONT_SETTINGS.company.phoneHref);
    setText('#linkEmailLabel',FRONT_SETTINGS.company.email);
    setValue('#linkEmailUrl',FRONT_SETTINGS.company.emailHref);
    setText('#linkFormLabel','諮詢表單');
    setValue('#linkFormUrl','#contactFormModal');
  };

  const inquiryFilters = {
    start:'',
    end:'',
    category:'',
    status:'',
    keyword:''
  };
  let currentInquiryIndex = null;

  const getFilteredInquiries = () => {
    const kw = inquiryFilters.keyword.trim().toLowerCase();
    return INQUIRIES.map((x,i)=>({x,i})).filter(({x})=>{
      const dateOnly = x.date.slice(0,10);
      if(inquiryFilters.start && dateOnly < inquiryFilters.start) return false;
      if(inquiryFilters.end && dateOnly > inquiryFilters.end) return false;
      if(inquiryFilters.category && x.service !== inquiryFilters.category) return false;
      if(inquiryFilters.status === 'unread' && !x.unread) return false;
      if(inquiryFilters.status === 'read' && x.unread) return false;
      if(kw){
        const hay = [x.name,x.phone,x.email,x.line,x.service,x.message,x.id,x.date].join(' ').toLowerCase();
        if(!hay.includes(kw)) return false;
      }
      return true;
    });
  };

  const renderInquiries = () => {
    const unreadCount = INQUIRIES.filter(x => x.unread).length;
    const filtered = getFilteredInquiries();
    setText('#formsCustomerCount', INQUIRIES.length);
    setText('#formsUnreadCount', unreadCount);
    setText('#formsFilteredCount', filtered.length);

    const list = $('#inquiryAdminList');
    if(!list) return;
    if(!filtered.length){
      list.innerHTML = `<div class="inquiry-empty"><i data-lucide="search-x"></i><b>沒有符合條件的洽詢資料</b><span>請調整日期、類別或關鍵字篩選。</span></div>`;
      lucide.createIcons();
      return;
    }

    list.innerHTML = filtered.map(({x,i})=>`
      <button class="admin-row inquiry-row ${x.unread ? 'is-unread' : ''}" type="button" data-inquiry-index="${i}">
        <time>${x.date.slice(5,10).replace('-','/')}</time>
        <div class="row-copy">
          <b>${x.name} ${x.unread ? '<span class="unread-dot">未讀</span>' : ''}</b>
          <small>${x.service}｜${x.phone}｜${x.email}</small>
        </div>
        <div class="row-actions">
          <span class="inquiry-open-hint">查看詳情 <i data-lucide="chevron-right"></i></span>
        </div>
      </button>
    `).join('');
    lucide.createIcons();
  };

  const permissionNames = {
    dashboard:'儀表板',news:'最新公告',home:'首頁內容',services:'服務項目',
    products:'產品設備',industries:'適用產業',forms:'表單洽詢',company:'公司資訊',
    links:'連結 / 快捷',appearance:'版面與色彩',admins:'管理員管理',system:'系統設定'
  };

  const renderAdminUsers = () => {
    const total=ADMIN_USERS.length;
    const enabled=ADMIN_USERS.filter(x=>x.enabled).length;
    const disabled=total-enabled;
    setText('#adminTotalCount',total);
    setText('#adminEnabledCount',enabled);
    setText('#adminDisabledCount',disabled);
    setText('#adminCountBadge',total);

    const list=$('#adminUserList');
    if(!list) return;
    list.innerHTML=ADMIN_USERS.map((x,i)=>{
      const all=x.permissions.length>=Object.keys(permissionNames).length;
      const summary=all?'全部權限':x.permissions.slice(0,3).map(p=>permissionNames[p]).join('、')+(x.permissions.length>3?` +${x.permissions.length-3}`:'');
      return `
        <div class="admin-user-row">
          <span><i class="admin-state ${x.enabled?'on':'off'}"></i>${x.enabled?'啟用':'停用'}</span>
          <div class="admin-person"><b>${x.name}</b><small>${x.username} · ${x.email||'-'}</small></div>
          <span class="role-pill">${x.role}</span>
          <span class="permission-summary">${summary}</span>
          <span class="last-login">${x.lastLogin||'尚未登入'}</span>
          <div class="admin-user-actions">
            <button class="icon-btn" data-edit-admin="${i}" title="編輯">${icon('pencil')}</button>
            <button class="icon-btn" data-toggle-admin="${i}" title="${x.enabled?'停用':'啟用'}">${icon(x.enabled?'user-round-x':'user-round-check')}</button>
            ${i===0?'':`<button class="icon-btn danger" data-delete-admin="${i}" title="刪除">${icon('trash-2')}</button>`}
          </div>
        </div>`;
    }).join('');
    lucide.createIcons();
  };

  const renderGoogleSheetsStatus = () => {
    const el=$('#gsAdminStatus');
    if(!el) return;
    const ready=Boolean(String(GOOGLE_SHEETS_ADMIN_CONFIG.webAppUrl||'').trim());
    el.className=ready?'status-on':'status-off';
    el.innerHTML=`<i></i> ${ready?'已設定':'尚未設定'}`;
  };

  const renderAll = () => {
    renderGoogleSheetsStatus();
    syncFrontSettingsToAdmin();
    const now = new Date();
    if($('#todayText')) $('#todayText').textContent = new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).format(now);
    renderDashboard();
    // 最新消息 / 客戶表單 / 常見問題由 Google Sheets CMS 載入。
    renderServices();
    renderProducts();
    renderIndustries();
    renderAdminUsers();
  };

  $('#inquiryStartDate')?.addEventListener('change',e=>{inquiryFilters.start=e.target.value;renderInquiries();});
  $('#inquiryEndDate')?.addEventListener('change',e=>{inquiryFilters.end=e.target.value;renderInquiries();});
  $('#inquiryCategory')?.addEventListener('change',e=>{inquiryFilters.category=e.target.value;renderInquiries();});
  $('#inquiryReadStatus')?.addEventListener('change',e=>{inquiryFilters.status=e.target.value;renderInquiries();});
  $('#inquiryKeyword')?.addEventListener('input',e=>{inquiryFilters.keyword=e.target.value;renderInquiries();});
  $('#clearInquiryFilters')?.addEventListener('click',()=>{
    inquiryFilters.start=''; inquiryFilters.end=''; inquiryFilters.category=''; inquiryFilters.status=''; inquiryFilters.keyword='';
    if($('#inquiryStartDate')) $('#inquiryStartDate').value='';
    if($('#inquiryEndDate')) $('#inquiryEndDate').value='';
    if($('#inquiryCategory')) $('#inquiryCategory').value='';
    if($('#inquiryReadStatus')) $('#inquiryReadStatus').value='';
    if($('#inquiryKeyword')) $('#inquiryKeyword').value='';
    renderInquiries();
  });

  $('#newsSearch')?.addEventListener('input', e => renderNews(e.target.value));

  $$('[data-product-admin-tab]').forEach(b => b.addEventListener('click', () => {
    $$('[data-product-admin-tab]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    productType = b.dataset.productAdminTab;
    renderProducts();
  }));

  const adminUserModal=$('#adminUserModal');
  let currentAdminIndex=null;

  const getPermissionChecks=()=>[...document.querySelectorAll('#permissionGrid input[type="checkbox"]')];

  const applyRoleDefaults = role => {
    const defaults = {
      '超級管理員':Object.keys(permissionNames),
      '內容管理員':['dashboard','news','home','services','products','industries','appearance'],
      '客服管理員':['dashboard','forms','company'],
      '一般管理員':['dashboard']
    };
    const allowed=defaults[role]||['dashboard'];
    getPermissionChecks().forEach(cb=>cb.checked=allowed.includes(cb.value));
  };

  const openAdminUserModal=(index=null)=>{
    currentAdminIndex=index;
    const x=index===null?null:ADMIN_USERS[index];
    $('#adminUserModalTitle').textContent=index===null?'新增管理員':'編輯管理員';
    $('#adminEditIndex').value=index===null?'':index;
    $('#adminName').value=x?.name||'';
    $('#adminUsername').value=x?.username||'';
    $('#adminEmail').value=x?.email||'';
    $('#adminRole').value=x?.role||'一般管理員';
    $('#adminPassword').value='';
    $('#adminEnabled').value=String(x?.enabled ?? true);
    if(x){
      getPermissionChecks().forEach(cb=>cb.checked=x.permissions.includes(cb.value));
    }else{
      applyRoleDefaults('一般管理員');
    }
    adminUserModal.classList.add('open');
    adminUserModal.setAttribute('aria-hidden','false');
    setTimeout(()=>$('#adminName').focus(),50);
    lucide.createIcons();
  };

  const closeAdminUserModal=()=>{
    adminUserModal.classList.remove('open');
    adminUserModal.setAttribute('aria-hidden','true');
    currentAdminIndex=null;
  };

  $('#addAdminBtn')?.addEventListener('click',()=>openAdminUserModal());
  $('#adminRole')?.addEventListener('change',e=>{
    if(currentAdminIndex===null) applyRoleDefaults(e.target.value);
  });
  $('#selectAllPerms')?.addEventListener('click',()=>getPermissionChecks().forEach(cb=>cb.checked=true));
  $('#clearAllPerms')?.addEventListener('click',()=>getPermissionChecks().forEach(cb=>cb.checked=false));

  $('#adminUserForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const idx=$('#adminEditIndex').value===''?null:Number($('#adminEditIndex').value);
    const permissions=getPermissionChecks().filter(cb=>cb.checked).map(cb=>cb.value);
    const data={
      name:$('#adminName').value.trim(),
      username:$('#adminUsername').value.trim(),
      email:$('#adminEmail').value.trim(),
      role:$('#adminRole').value,
      enabled:$('#adminEnabled').value==='true',
      permissions,
      lastLogin:idx===null?'尚未登入':ADMIN_USERS[idx].lastLogin
    };
    const password=$('#adminPassword').value;
    if(idx===null){
      if(!password){alert('新增管理員時請輸入登入密碼。');return;}
      data.password=password;
      if(ADMIN_USERS.some(x=>x.username===data.username)){alert('此帳號已存在。');return;}
      ADMIN_USERS.push(data);
    }else{
      data.password=password||ADMIN_USERS[idx].password;
      if(ADMIN_USERS.some((x,i)=>i!==idx&&x.username===data.username)){alert('此帳號已存在。');return;}
      ADMIN_USERS[idx]=data;
    }
    renderAdminUsers();
    closeAdminUserModal();
  });

  const inquiryDetailModal = $('#inquiryDetailModal');

  const openInquiryDetail = index => {
    const x = INQUIRIES[index];
    if(!x) return;
    currentInquiryIndex = index;
    setText('#detailName',x.name);
    setText('#detailPhone',x.phone);
    setText('#detailEmail',x.email || '-');
    setText('#detailLine',x.line || '-');
    setText('#detailService',x.service);
    setText('#detailSubmittedAt',x.date);
    setText('#detailDate',x.date.slice(0,10));
    setText('#detailId',x.id);
    setText('#detailMessage',x.message || '-');

    const status = $('#detailStatus');
    status.textContent = x.unread ? '未讀' : '已讀';
    status.classList.toggle('is-read',!x.unread);

    const btn = $('#detailMarkRead');
    btn.disabled = !x.unread;
    btn.textContent = x.unread ? '標記已讀' : '已讀';

    inquiryDetailModal.classList.add('open');
    inquiryDetailModal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    lucide.createIcons();
  };

  const closeInquiryDetail = () => {
    inquiryDetailModal.classList.remove('open');
    inquiryDetailModal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    currentInquiryIndex=null;
  };

  const modal = $('#editModal');
  const openModal = (type,index,create=false) => {
    $('#editType').value = type;
    $('#editIndex').value = index ?? '';
    $('#editDateWrap').style.display = type === 'news' ? '' : 'none';

    let item = null;
    if (!create) {
      if(type === 'news') item = C.announcements[index];
      if(type === 'service') item = C.services[index];
      if(type === 'product') item = C.products[productType][index];
      if(type === 'industry') item = C.industries[index];
    }
    $('#editTitle').textContent = create ? '新增公告' : `編輯${type==='news'?'公告':'內容'}`;
    $('#editName').value = item?.title || '';
    $('#editText').value = item?.text || item?.body || '';
    $('#editDate').value = item?.date || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>$('#editName').focus(),50);
  };
  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  };
  document.addEventListener('click', e => {
    const editAdmin=e.target.closest('[data-edit-admin]');
    if(editAdmin){
      openAdminUserModal(Number(editAdmin.dataset.editAdmin));
      return;
    }
    const toggleAdmin=e.target.closest('[data-toggle-admin]');
    if(toggleAdmin){
      const i=Number(toggleAdmin.dataset.toggleAdmin);
      if(i===0 && ADMIN_USERS[i].enabled){alert('主要系統管理員不可停用。');return;}
      ADMIN_USERS[i].enabled=!ADMIN_USERS[i].enabled;
      renderAdminUsers();
      return;
    }
    const deleteAdmin=e.target.closest('[data-delete-admin]');
    if(deleteAdmin){
      const i=Number(deleteAdmin.dataset.deleteAdmin);
      if(i===0) return;
      if(confirm('確定刪除此管理員？')){
        ADMIN_USERS.splice(i,1);
        renderAdminUsers();
      }
      return;
    }
    if(e.target.closest('[data-admin-user-close]')){
      closeAdminUserModal();
      return;
    }

    const inquiryRow = e.target.closest('[data-inquiry-index]');
    if(inquiryRow){
      openInquiryDetail(Number(inquiryRow.dataset.inquiryIndex));
      return;
    }
    if(e.target.closest('[data-inquiry-close]')){
      closeInquiryDetail();
      return;
    }

    const eb = e.target.closest('[data-edit]');
    if (eb) openModal(eb.dataset.edit, Number(eb.dataset.index));
    if (e.target.closest('[data-modal-close]')) closeModal();

    const readBtn = e.target.closest('[data-mark-read]');
    if(readBtn){
      const i = Number(readBtn.dataset.markRead);
      if(INQUIRIES[i]){
        INQUIRIES[i].unread = false;
        renderDashboard();
        renderInquiries();
      }
      return;
    }

    const del = e.target.closest('[data-delete-news]');
    if(del){
      const i = Number(del.dataset.deleteNews);
      if(confirm('確定刪除此公告？')){
        C.announcements.splice(i,1);
        renderDashboard(); renderNews($('#newsSearch')?.value||'');
      }
    }
  });
  $('#addNewsBtn')?.addEventListener('click', () => openModal('news','',true));

  $('#detailMarkRead')?.addEventListener('click',()=>{
    if(currentInquiryIndex===null) return;
    const x=INQUIRIES[currentInquiryIndex];
    if(x && x.unread){
      x.unread=false;
      renderDashboard();
      renderInquiries();
      openInquiryDetail(currentInquiryIndex);
    }
  });

  $('#editForm').addEventListener('submit', e => {
    e.preventDefault();
    const type = $('#editType').value;
    const idx = $('#editIndex').value === '' ? null : Number($('#editIndex').value);
    const title = $('#editName').value.trim();
    const text = $('#editText').value.trim();
    const date = $('#editDate').value.trim();

    if(type === 'news'){
      if(idx === null){
        const fullDate = new Date().toISOString().slice(0,10);
        C.announcements.unshift({date:date || '08.27',fullDate,title,body:text});
      }else{
        Object.assign(C.announcements[idx],{date,title,body:text});
      }
      renderDashboard(); renderNews($('#newsSearch')?.value||'');
    }
    if(type === 'service'){ C.services[idx].title=title; C.services[idx].text=text; renderServices(); }
    if(type === 'product'){ C.products[productType][idx].title=title; C.products[productType][idx].text=text; renderProducts(); }
    if(type === 'industry'){ C.industries[idx].title=title; C.industries[idx].text=text; renderIndustries(); }
    closeModal();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if(inquiryDetailModal?.classList.contains('open')) closeInquiryDetail();
      else closeModal();
    }
  });


  // ==========================================================
  // Google Sheets direct administration
  // ==========================================================
  const GS_ADMIN = window.GOOGLE_SHEETS_CONFIG || {};
  const GS_ADMIN_URL = String(GS_ADMIN.webAppUrl || '').trim();

  let gsNews = [];
  let gsFaq = [];
  let gsInquiries = [];
  let gsCurrentInquiry = null;

  const gsGet = async action => {
    if(!GS_ADMIN_URL) throw new Error('尚未設定 Google Apps Script Web App URL');
    const res = await fetch(`${GS_ADMIN_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}`,{
      method:'GET',
      redirect:'follow'
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'API error');
    return data.data||[];
  };

  const gsPost = async(action,data={})=>{
    if(!GS_ADMIN_URL) throw new Error('尚未設定 Google Apps Script Web App URL');
    const res=await fetch(GS_ADMIN_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,data}),
      redirect:'follow'
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const result=await res.json();
    if(!result.ok) throw new Error(result.error||'API error');
    return result;
  };

  const gsSafe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const gsApiMissing = target => {
    const el=$(target);
    if(el) el.innerHTML=`<div class="gs-empty"><i data-lucide="triangle-alert"></i><b>尚未設定 Google 試算表 API</b><span>請先完成 google-apps-script/README.md 的部署步驟，再把 Web App URL 貼到 assets/js/google-sheets-config.js。</span></div>`;
    lucide.createIcons();
  };

  const loadGsNews=async()=>{
    if(!$('#gsNewsList')) return;
    if(!GS_ADMIN_URL){gsApiMissing('#gsNewsList');return;}
    $('#gsNewsList').innerHTML='<div class="gs-loading"><span class="inline-sync-spinner"></span>正在同步 Google 試算表最新消息...</div>';
    try{
      gsNews=await gsGet('adminNews');
      $('#gsNewsList').innerHTML=gsNews.length?gsNews.map((x,i)=>`
        <div class="admin-row gs-data-row">
          <time>${gsSafe(x.date||'')}</time>
          <div class="row-copy"><b>${gsSafe(x.title)}</b><small>${gsSafe(x.fullDate)} · ${x.enabled?'啟用':'停用'}</small></div>
          <span class="gs-state ${x.enabled?'on':'off'}">${x.enabled?'前台顯示':'已停用'}</span>
          <div class="row-actions">
            <button class="icon-btn" data-gs-edit-news="${i}" title="編輯">${icon('pencil')}</button>
            <button class="icon-btn danger" data-gs-delete-news="${i}" title="刪除">${icon('trash-2')}</button>
          </div>
        </div>`).join(''):`<div class="gs-empty"><i data-lucide="newspaper"></i><b>目前沒有最新消息</b><span>按「新增最新消息」建立第一筆資料。</span></div>`;
      lucide.createIcons();
    }catch(err){
      $('#gsNewsList').innerHTML=`<div class="gs-empty"><b>讀取失敗</b><span>${gsSafe(err.message)}</span></div>`;
    }
  };

  const loadGsFaq=async()=>{
    if(!$('#gsFaqList')) return;
    if(!GS_ADMIN_URL){gsApiMissing('#gsFaqList');return;}
    $('#gsFaqList').innerHTML='<div class="gs-loading"><span class="inline-sync-spinner"></span>正在同步 Google 試算表常見問題...</div>';
    try{
      gsFaq=await gsGet('adminFaq');
      setText('#gsFaqBadge',gsFaq.length);
      $('#gsFaqList').innerHTML=gsFaq.length?gsFaq.map((x,i)=>`
        <div class="admin-row gs-data-row">
          <time>${x.order}</time>
          <div class="row-copy"><b>${gsSafe(x.q)}</b><small>${gsSafe(x.a).slice(0,90)}${String(x.a).length>90?'…':''}</small></div>
          <span class="gs-state ${x.enabled?'on':'off'}">${x.enabled?'啟用':'停用'}</span>
          <div class="row-actions">
            <button class="icon-btn" data-gs-edit-faq="${i}" title="編輯">${icon('pencil')}</button>
            <button class="icon-btn danger" data-gs-delete-faq="${i}" title="刪除">${icon('trash-2')}</button>
          </div>
        </div>`).join(''):`<div class="gs-empty"><i data-lucide="circle-help"></i><b>目前沒有常見問題</b></div>`;
      lucide.createIcons();
    }catch(err){
      $('#gsFaqList').innerHTML=`<div class="gs-empty"><b>讀取失敗</b><span>${gsSafe(err.message)}</span></div>`;
    }
  };

  const filteredGsInquiries=()=>{
    const start=$('#gsInquiryStart')?.value||'';
    const end=$('#gsInquiryEnd')?.value||'';
    const cat=$('#gsInquiryCategory')?.value||'';
    const status=$('#gsInquiryStatus')?.value||'';
    const kw=($('#gsInquiryKeyword')?.value||'').trim().toLowerCase();
    return gsInquiries.filter(x=>{
      const d=String(x.submittedAt||'').slice(0,10);
      if(start&&d<start)return false;
      if(end&&d>end)return false;
      if(cat&&x.service!==cat)return false;
      if(status&&x.processStatus!==status)return false;
      if(kw){
        const hay=[x.id,x.storeName,x.contactName,x.phone,x.email,x.line,x.businessStatus,x.service,x.note,x.readStatus,x.processStatus].join(' ').toLowerCase();
        if(!hay.includes(kw))return false;
      }
      return true;
    });
  };


  const syncGoogleInquiryDashboard = () => {
    const total = Array.isArray(gsInquiries) ? gsInquiries.length : 0;
    const unread = Array.isArray(gsInquiries)
      ? gsInquiries.filter(x => String(x.readStatus || '').trim() !== '已讀').length
      : 0;

    [
      '#dashCustomers',
      '#dashboardCustomers',
      '#customerCount',
      '[data-dashboard-customer-count]'
    ].forEach(sel => {
      const el = $(sel);
      if(el) el.textContent = total;
    });

    [
      '#dashUnread',
      '#dashboardUnread',
      '#unreadCount',
      '[data-dashboard-unread-count]'
    ].forEach(sel => {
      const el = $(sel);
      if(el) el.textContent = unread;
    });

    const navBadge=$('#formUnreadBadge');
    if(navBadge){
      navBadge.textContent=unread;
      navBadge.classList.toggle('has-unread',unread>0);
      navBadge.hidden=unread===0;
      navBadge.style.display=unread>0?'inline-flex':'none';
    }
  };

  const renderGsInquiries=()=>{
    syncGoogleInquiryDashboard();
    const list=$('#gsInquiryList');
    if(!list)return;
    const rows=filteredGsInquiries();
    setText('#gsInquiryTotal',gsInquiries.length);
    setText('#gsInquiryUnread',gsInquiries.filter(x=>x.readStatus!=='已讀').length);
    setText('#gsInquiryPending',gsInquiries.filter(x=>x.processStatus!=='已完成').length);
    setText('#gsInquirySyncText',`顯示 ${rows.length} / ${gsInquiries.length} 筆`);

    const cat=$('#gsInquiryCategory');
    if(cat){
      const current=cat.value;
      const cats=[...new Set(gsInquiries.map(x=>x.service).filter(Boolean))];
      cat.innerHTML='<option value="">全部類別</option>'+cats.map(x=>`<option ${x===current?'selected':''}>${gsSafe(x)}</option>`).join('');
    }

    list.innerHTML=rows.length?rows.map((x,i)=>{
      const originalIndex=gsInquiries.indexOf(x);
      return `<button class="admin-row inquiry-row ${x.readStatus!=='已讀'?'is-unread':''}" type="button" data-gs-inquiry="${originalIndex}">
        <time>${gsSafe(String(x.submittedAt||'').slice(5,16))}</time>
        <div class="row-copy"><b>${gsSafe(x.storeName)} / ${gsSafe(x.contactName)} ${x.readStatus!=='已讀'?'<span class="unread-dot">未讀</span>':''}</b><small>${gsSafe(x.businessStatus||'-')}｜${gsSafe(x.phone)}｜${gsSafe(x.processStatus)}</small></div>
        <span class="gs-state ${x.processStatus==='已完成'?'on':'pending'}">${gsSafe(x.processStatus)}</span>
        <div class="row-actions"><span class="inquiry-open-hint">查看詳情 ${icon('chevron-right')}</span></div>
      </button>`;
    }).join(''):`<div class="gs-empty"><i data-lucide="search-x"></i><b>沒有符合條件的表單</b></div>`;
    lucide.createIcons();
  };

  const loadGsInquiries=async()=>{
    if(!$('#gsInquiryList'))return;
    if(!GS_ADMIN_URL){gsApiMissing('#gsInquiryList');return;}
    $('#gsInquiryList').innerHTML='<div class="gs-loading">正在同步 Google 試算表...</div>';
    try{
      gsInquiries=await gsGet('inquiries');
      syncGoogleInquiryDashboard();
      renderGsInquiries();
      syncGoogleInquiryDashboard();
    }catch(err){
      $('#gsInquiryList').innerHTML=`<div class="gs-empty"><b>讀取失敗</b><span>${gsSafe(err.message)}</span></div>`;
    }
  };

  const gsEditModal=$('#gsEditModal');
  const openGsEdit=(type,item=null)=>{
    $('#gsEditType').value=type;
    $('#gsEditId').value=item?.id||'';
    if(type==='news'){
      $('#gsEditTitle').textContent=item?'編輯最新消息':'新增最新消息';
      $('#gsEditFields').innerHTML=`
        <div class="two-col">
          <label>發布日期<input id="gsNewsFullDate" type="date" required value="${gsSafe(item?.fullDate||new Date().toISOString().slice(0,10))}"></label>
          <label>月日<input id="gsNewsDate" required placeholder="08.27" value="${gsSafe(item?.date||'')}"></label>
          <label class="wide">標題<input id="gsNewsTitle" required value="${gsSafe(item?.title||'')}"></label>
          <label class="wide">內容<textarea id="gsNewsBody" rows="6" required>${gsSafe(item?.body||'')}</textarea></label>
          <label>前台顯示<select id="gsNewsEnabled"><option value="true" ${item?.enabled!==false?'selected':''}>啟用</option><option value="false" ${item?.enabled===false?'selected':''}>停用</option></select></label>
        </div>`;
    }else{
      $('#gsEditTitle').textContent=item?'編輯常見問題':'新增常見問題';
      $('#gsEditFields').innerHTML=`
        <div class="two-col">
          <label>排序<input id="gsFaqOrder" type="number" min="0" value="${Number(item?.order||gsFaq.length+1)}"></label>
          <label>前台顯示<select id="gsFaqEnabled"><option value="true" ${item?.enabled!==false?'selected':''}>啟用</option><option value="false" ${item?.enabled===false?'selected':''}>停用</option></select></label>
          <label class="wide">問題<input id="gsFaqQ" required value="${gsSafe(item?.q||'')}"></label>
          <label class="wide">答案<textarea id="gsFaqA" rows="6" required>${gsSafe(item?.a||'')}</textarea></label>
        </div>`;
    }
    gsEditModal.classList.add('open');
    gsEditModal.setAttribute('aria-hidden','false');
  };
  const closeGsEdit=()=>{gsEditModal?.classList.remove('open');gsEditModal?.setAttribute('aria-hidden','true');};

  $('#gsEditForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const type=$('#gsEditType').value;
    const id=$('#gsEditId').value;
    const submit=e.currentTarget.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      if(type==='news'){
        const full=$('#gsNewsFullDate').value;
        const p=full.split('-');
        const payload={
          id,
          fullDate:full,
          date:$('#gsNewsDate').value.trim()||(p.length===3?`${p[1]}.${p[2]}`:''),
          title:$('#gsNewsTitle').value.trim(),
          body:$('#gsNewsBody').value.trim(),
          enabled:$('#gsNewsEnabled').value==='true'
        };
        await gsPost('saveNews',payload);
        closeGsEdit(); await v48SyncAll();
      }else{
        await gsPost('saveFaq',{
          id,
          order:Number($('#gsFaqOrder').value)||0,
          q:$('#gsFaqQ').value.trim(),
          a:$('#gsFaqA').value.trim(),
          enabled:$('#gsFaqEnabled').value==='true'
        });
        closeGsEdit(); await v48SyncAll();
      }
    }catch(err){alert(`儲存失敗：${err.message}`)}
    finally{submit.disabled=false;}
  });

  const gsInquiryModal=$('#gsInquiryModal');
  const openGsInquiry=async i=>{
    const x=gsInquiries[i]; if(!x)return;
    gsCurrentInquiry=x;
    if(x.readStatus!=='已讀'&&GS_ADMIN_URL){
      try{
        await gsPost('updateInquiry',{id:x.id,readStatus:'已讀'});
        x.readStatus='已讀';
        syncGoogleInquiryDashboard();
        renderGsInquiries();
      }catch(err){console.warn('Auto mark read failed',err);}
    }
    $('#gsProcessStatus').value=x.processStatus||'未處理';
    $('#gsInquiryDetail').innerHTML=`
      <div class="inquiry-detail-meta">
        <span class="detail-status ${x.readStatus==='已讀'?'is-read':''}">${gsSafe(x.readStatus)}</span>
        <span>${gsSafe(x.submittedAt)}</span><code>${gsSafe(x.id)}</code>
      </div>
      <div class="inquiry-detail-grid">
        <div><span>店名</span><b>${gsSafe(x.storeName||'-')}</b></div>
        <div><span>聯絡人</span><b>${gsSafe(x.contactName||'-')}</b></div>
        <div><span>聯絡電話</span><b>${gsSafe(x.phone||'-')}</b></div>
        <div><span>LINE ID</span><b>${gsSafe(x.line||'-')}</b></div>
        <div><span>Email</span><b>${gsSafe(x.email||'-')}</b></div>
        <div><span>營業狀態</span><b>${gsSafe(x.businessStatus||'-')}</b></div>
        <div><span>需求</span><b>${gsSafe(x.service||'-')}</b></div>
        <div><span>處理狀態</span><b>${gsSafe(x.processStatus||'未處理')}</b></div>
      </div>
      <div class="inquiry-detail-message"><span>備註</span><p>${gsSafe(x.note||'-')}</p></div>`;
    $('#gsMarkRead').disabled=x.readStatus==='已讀';
    gsInquiryModal.classList.add('open');
    gsInquiryModal.setAttribute('aria-hidden','false');
  };
  const closeGsInquiry=()=>{gsInquiryModal?.classList.remove('open');gsInquiryModal?.setAttribute('aria-hidden','true');gsCurrentInquiry=null;};

  $('#gsMarkRead')?.addEventListener('click',async()=>{
    if(!gsCurrentInquiry)return;
    try{
      await gsPost('updateInquiry',{id:gsCurrentInquiry.id,readStatus:'已讀'});
      await loadGsInquiries();
      syncGoogleInquiryDashboard();
      const i=gsInquiries.findIndex(x=>x.id===gsCurrentInquiry.id);
      if(i>=0)openGsInquiry(i); else closeGsInquiry();
    }catch(err){alert(`更新失敗：${err.message}`)}
  });

  $('#gsSaveInquiryStatus')?.addEventListener('click',async()=>{
    if(!gsCurrentInquiry)return;
    try{
      await gsPost('updateInquiry',{id:gsCurrentInquiry.id,readStatus:'已讀',processStatus:$('#gsProcessStatus').value});
      closeGsInquiry(); await v48SyncAll();
    }catch(err){alert(`更新失敗：${err.message}`)}
  });

  $('#gsReloadNews')?.addEventListener('click',loadGsNews);
  $('#gsReloadFaq')?.addEventListener('click',loadGsFaq);
  $('#gsReloadInquiries')?.addEventListener('click',loadGsInquiries);
  $('#gsAddNews')?.addEventListener('click',()=>openGsEdit('news'));
  $('#gsAddFaq')?.addEventListener('click',()=>openGsEdit('faq'));

  ['#gsInquiryStart','#gsInquiryEnd','#gsInquiryCategory','#gsInquiryStatus','#gsInquiryKeyword'].forEach(sel=>{
    $(sel)?.addEventListener(sel==='#gsInquiryKeyword'?'input':'change',renderGsInquiries);
  });

  document.addEventListener('click',async e=>{
    const en=e.target.closest('[data-gs-edit-news]');
    if(en){openGsEdit('news',gsNews[Number(en.dataset.gsEditNews)]);return;}
    const dn=e.target.closest('[data-gs-delete-news]');
    if(dn){
      const x=gsNews[Number(dn.dataset.gsDeleteNews)];
      if(x&&confirm(`確定刪除「${x.title}」？`)){try{await gsPost('deleteNews',{id:x.id});await v48SyncAll()}catch(err){alert(err.message)}}
      return;
    }
    const ef=e.target.closest('[data-gs-edit-faq]');
    if(ef){openGsEdit('faq',gsFaq[Number(ef.dataset.gsEditFaq)]);return;}
    const df=e.target.closest('[data-gs-delete-faq]');
    if(df){
      const x=gsFaq[Number(df.dataset.gsDeleteFaq)];
      if(x&&confirm(`確定刪除這個問題？`)){try{await gsPost('deleteFaq',{id:x.id});await v48SyncAll()}catch(err){alert(err.message)}}
      return;
    }
    const iq=e.target.closest('[data-gs-inquiry]');
    if(iq){openGsInquiry(Number(iq.dataset.gsInquiry));return;}
    if(e.target.closest('[data-gs-edit-close]')){closeGsEdit();return;}
    if(e.target.closest('[data-gs-inquiry-close]')){closeGsInquiry();return;}
  });

  const loadGoogleAdminData=()=>{
    if(!GS_ADMIN_URL){
      gsApiMissing('#gsNewsList');gsApiMissing('#gsFaqList');gsApiMissing('#gsInquiryList');
      return;
    }
    loadGsNews();loadGsFaq();loadGsInquiries();
  };


  const bootAdmin = () => {
    if (sessionStorage.getItem('cc_admin_preview') === '1') {
      if (!location.hash) history.replaceState(null,'','#dashboard');
      showAdmin();
    } else {
      showLogin();
    }
  };

  bootAdmin();
  lucide.createIcons();


  document.addEventListener('click', e => {
    const nav=e.target.closest('[data-page="dashboard"],[data-admin-page-target="dashboard"],[data-nav="dashboard"]');
    if(nav && GS_ADMIN_URL){
      setTimeout(async()=>{
        try{
          gsInquiries=await gsGet('inquiries');
          syncGoogleInquiryDashboard();
        }catch(err){
          console.warn('Dashboard inquiry sync failed',err);
        }
      },80);
    }
  });



  // V46 stable mobile controls
  const mobileSidebarClose = $('#mobileSidebarClose');
  const mobileGoogleSync = $('#mobileGoogleSync');

  const syncMobileMenuAria = () => {
    const opened = adminView.classList.contains('menu-open');
    $('#mobileMenu')?.setAttribute('aria-expanded', opened ? 'true' : 'false');
  };

  $('#mobileMenu')?.addEventListener('click', () => {
    setTimeout(syncMobileMenuAria, 0);
  });

  mobileSidebarClose?.addEventListener('click', () => {
    adminView.classList.remove('menu-open');
    syncMobileMenuAria();
  });

  $('#drawerOverlay')?.addEventListener('click', () => {
    syncMobileMenuAria();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && adminView.classList.contains('menu-open')){
      adminView.classList.remove('menu-open');
      syncMobileMenuAria();
    }
  });

  window.addEventListener('resize', () => {
    if(window.innerWidth > 900){
      adminView.classList.remove('menu-open');
      syncMobileMenuAria();
    }
  });

  mobileGoogleSync?.addEventListener('click', async () => {
    if(!GS_ADMIN_URL){
      alert('尚未設定 Google Apps Script Web App URL。');
      return;
    }
    mobileGoogleSync.disabled = true;
    try{
      await Promise.all([
        loadGsNews(),
        loadGsFaq(),
        loadGsInquiries()
      ]);
      syncGoogleInquiryDashboard();
    }catch(err){
      console.warn('Mobile Google Sheets sync failed', err);
      alert('Google 試算表同步失敗，請稍後再試。');
    }finally{
      mobileGoogleSync.disabled = false;
    }
  });



  // ==========================================================
  // V47 管理員 CRUD（唯一命名避免與舊版衝突）
  // ==========================================================
  const V47_ADMIN_KEY='cc_admin_users_v47';
  const V47_MODULES=[
    ['dashboard','儀表板'],['news','最新消息'],['faq-admin','常見問題'],['forms','客戶表單'],
    ['home','首頁內容'],['services','服務項目'],['products','產品設備'],['industries','適用產業'],
    ['company','公司資訊'],['links','連結設定'],['appearance','外觀設定'],['admins','後台管理員'],['system','系統設定']
  ];
  const v47DefaultAdmins=()=>[{id:'ADMIN-MAIN',displayName:'系統管理員',username:'admin',password:'1234',enabled:true,permissions:V47_MODULES.map(x=>x[0])}];
  const v47ReadAdmins=()=>{
    try{
      const raw=localStorage.getItem(V47_ADMIN_KEY);
      const rows=raw?JSON.parse(raw):v47DefaultAdmins();
      return Array.isArray(rows)&&rows.length?rows:v47DefaultAdmins();
    }catch(_){return v47DefaultAdmins();}
  };
  const v47WriteAdmins=rows=>localStorage.setItem(V47_ADMIN_KEY,JSON.stringify(rows));
  let v47Admins=v47ReadAdmins();

  const v47RenderAdmins=()=>{
    const list=$('#v47AdminList'); if(!list)return;
    $('#v47AdminCount').textContent=`${v47Admins.length} 位`;
    list.innerHTML=v47Admins.map((u,i)=>`
      <div class="admin-row gs-data-row">
        <time>${i+1}</time>
        <div class="row-copy"><b>${gsSafe(u.displayName||u.username)}</b><small>帳號：${gsSafe(u.username)}｜權限 ${Array.isArray(u.permissions)?u.permissions.length:0} 項</small></div>
        <span class="gs-state ${u.enabled?'on':'off'}">${u.enabled?'啟用':'停用'}</span>
        <div class="row-actions">
          <button class="icon-btn" data-v47-edit-admin="${gsSafe(u.id)}" title="編輯">${icon('pencil')}</button>
          ${u.id!=='ADMIN-MAIN'?`<button class="icon-btn danger" data-v47-delete-admin="${gsSafe(u.id)}" title="刪除">${icon('trash-2')}</button>`:''}
        </div>
      </div>`).join('');
    lucide.createIcons();
  };

  const v47OpenAdmin=(user=null)=>{
    $('#v47AdminModalTitle').textContent=user?'編輯管理員':'新增管理員';
    $('#v47AdminId').value=user?.id||'';
    $('#v47AdminName').value=user?.displayName||'';
    $('#v47AdminUsername').value=user?.username||'';
    $('#v47AdminPassword').value=user?.password||'';
    $('#v47AdminEnabled').value=user?.enabled===false?'false':'true';
    const p=new Set(user?.permissions||V47_MODULES.map(x=>x[0]));
    $('#v47PermissionGrid').innerHTML=V47_MODULES.map(([id,label])=>`
      <label class="permission-item"><input type="checkbox" value="${id}" ${p.has(id)?'checked':''}><span>${label}</span></label>`).join('');
    $('#v47AdminModal').classList.add('open');
    $('#v47AdminModal').setAttribute('aria-hidden','false');
  };
  const v47CloseAdmin=()=>{$('#v47AdminModal')?.classList.remove('open');$('#v47AdminModal')?.setAttribute('aria-hidden','true');};

  $('#v47AddAdminBtn')?.addEventListener('click',()=>v47OpenAdmin());
  $('#v47AdminForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const id=$('#v47AdminId').value||`ADMIN-${Date.now()}`;
    const row={
      id,
      displayName:$('#v47AdminName').value.trim(),
      username:$('#v47AdminUsername').value.trim(),
      password:$('#v47AdminPassword').value,
      enabled:$('#v47AdminEnabled').value==='true',
      permissions:[...document.querySelectorAll('#v47PermissionGrid input:checked')].map(x=>x.value)
    };
    if(!row.displayName||!row.username||!row.password){alert('請完整填寫名稱、帳號與密碼。');return;}
    if(v47Admins.some(x=>x.username.toLowerCase()===row.username.toLowerCase()&&x.id!==id)){alert('此登入帳號已存在。');return;}
    const idx=v47Admins.findIndex(x=>x.id===id);
    if(idx>=0)v47Admins[idx]=row;else v47Admins.push(row);
    v47WriteAdmins(v47Admins);v47RenderAdmins();v47CloseAdmin();
  });

  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-v47-edit-admin]');
    if(edit){const u=v47Admins.find(x=>x.id===edit.dataset.v47EditAdmin);if(u)v47OpenAdmin(u);return;}
    const del=e.target.closest('[data-v47-delete-admin]');
    if(del){const u=v47Admins.find(x=>x.id===del.dataset.v47DeleteAdmin);if(u&&confirm(`確定刪除「${u.displayName}」？`)){v47Admins=v47Admins.filter(x=>x.id!==u.id);v47WriteAdmins(v47Admins);v47RenderAdmins();}return;}
    if(e.target.closest('[data-v47-admin-close]'))v47CloseAdmin();
  });
  v47RenderAdmins();




  // ==========================================================
  // V48 visible Google Sheets sync
  // ==========================================================
  const v48SetBusy=(busy)=>{
    ['#googleSyncAllBtn','#gsReloadNews','#gsReloadFaq','#gsReloadInquiries','#mobileGoogleSync'].forEach(sel=>{
      const btn=$(sel);
      if(!btn)return;
      btn.disabled=busy;
      btn.classList.toggle('is-syncing',busy);
    });
  };

  const v48SetConnection=(state,title,message='')=>{
    const el=$('#googleConnectionStatus');
    if(el)el.dataset.state=state;
    if($('#googleConnectionTitle'))$('#googleConnectionTitle').textContent=title;
    if($('#googleConnectionMessage'))$('#googleConnectionMessage').textContent=message;
  };

  const v48SetPageState=(selector,state,title,detail='')=>{
    const el=$(selector); if(!el)return;
    el.dataset.state=state;
    const b=el.querySelector('b');
    const s=el.querySelector('small');
    if(b)b.textContent=title;
    if(s)s.textContent=detail||'資料來源：Google 試算表';
  };

  const v48ShowUrlState=()=>{
    const el=$('#googleWebAppUrlStatus');
    if(!el)return;
    if(GS_ADMIN_URL){
      el.textContent='已設定 /exec';
      el.classList.add('is-ok');
      el.title=GS_ADMIN_URL;
    }else{
      el.textContent='尚未設定';
      el.classList.remove('is-ok');
    }
  };

  const v48Ping=async()=>{
    if(!GS_ADMIN_URL)throw new Error('尚未設定 Web App URL');
    const res=await fetch(`${GS_ADMIN_URL}?action=ping&_=${Date.now()}`,{cache:'no-store',redirect:'follow'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(!data?.ok)throw new Error(data?.error||'API 回傳失敗');
    return data;
  };

  const v48RenderNews=()=>{
    const list=$('#gsNewsList'); if(!list)return;
    list.innerHTML=gsNews.length?gsNews.map((x,i)=>`
      <div class="admin-row gs-data-row">
        <time>${gsSafe(x.date||'')}</time>
        <div class="row-copy"><b>${gsSafe(x.title)}</b><small>${gsSafe(x.fullDate)} · ${x.enabled?'啟用':'停用'}</small></div>
        <span class="gs-state ${x.enabled?'on':'off'}">${x.enabled?'前台顯示':'已停用'}</span>
        <div class="row-actions">
          <button class="icon-btn" data-gs-edit-news="${i}" title="編輯">${icon('pencil')}</button>
          <button class="icon-btn danger" data-gs-delete-news="${i}" title="刪除">${icon('trash-2')}</button>
        </div>
      </div>`).join(''):`<div class="gs-empty"><b>目前沒有最新消息</b><span>可按「新增最新消息」建立資料。</span></div>`;
    lucide.createIcons();
  };

  const v48RenderFaq=()=>{
    const list=$('#gsFaqList'); if(!list)return;
    list.innerHTML=gsFaq.length?gsFaq.map((x,i)=>`
      <div class="admin-row gs-data-row">
        <time>${x.order}</time>
        <div class="row-copy"><b>${gsSafe(x.q)}</b><small>${gsSafe(x.a).slice(0,90)}${String(x.a).length>90?'…':''}</small></div>
        <span class="gs-state ${x.enabled?'on':'off'}">${x.enabled?'啟用':'停用'}</span>
        <div class="row-actions">
          <button class="icon-btn" data-gs-edit-faq="${i}" title="編輯">${icon('pencil')}</button>
          <button class="icon-btn danger" data-gs-delete-faq="${i}" title="刪除">${icon('trash-2')}</button>
        </div>
      </div>`).join(''):`<div class="gs-empty"><b>目前沒有常見問題</b></div>`;
    lucide.createIcons();
  };

  

  // V58：Google 最新消息／常見問題啟用與關閉數量
  const v58Boolish = (v) => {
    if(v === true) return true;
    if(v === false || v == null) return false;
    const s=String(v).trim().toLowerCase();
    return !['false','0','否','停用','關閉','disabled','off',''].includes(s);
  };

  const v58UpdateToggleCounts = () => {
    const newsRows = Array.isArray(gsNews) ? gsNews : [];
    const faqRows = Array.isArray(gsFaq) ? gsFaq : [];

    const newsOn = newsRows.filter(x => v58Boolish(x.enabled)).length;
    const newsOff = newsRows.length - newsOn;
    const faqOn = faqRows.filter(x => v58Boolish(x.enabled)).length;
    const faqOff = faqRows.length - faqOn;

    const set=(id,val)=>{ const el=$(id); if(el) el.textContent=String(val); };
    set('#gsNewsEnabledCount',newsOn);
    set('#gsNewsDisabledCount',newsOff);
    set('#gsFaqEnabledCount',faqOn);
    set('#gsFaqDisabledCount',faqOff);
  };

const v48SyncAll=async()=>{
    v48ShowUrlState();

    if(!GS_ADMIN_URL){
      v48SetConnection('error','無法連線：尚未設定 Web App URL','請在 assets/js/google-sheets-config.js 填入 Apps Script /exec 網址。');
      v48SetPageState('#gsNewsSyncState','error','最新消息：無法連線','尚未設定 Web App URL');
      v48SetPageState('#gsFaqSyncState','error','常見問題：無法連線','尚未設定 Web App URL');
      v48SetPageState('#gsInquirySyncState','error','客戶表單：無法連線','尚未設定 Web App URL');
      return false;
    }

    v48SetBusy(true);
    v48SetConnection('loading','正在連線 Google 試算表','正在讀取最新消息、常見問題與客戶表單…');
    v48SetPageState('#gsNewsSyncState','loading','最新消息：同步中');
    v48SetPageState('#gsFaqSyncState','loading','常見問題：同步中');
    v48SetPageState('#gsInquirySyncState','loading','客戶表單：同步中');

    try{
      await v48Ping();
      const [news,faq,inquiries]=await Promise.all([
        gsGet('adminNews'),
        gsGet('adminFaq'),
        gsGet('inquiries')
      ]);
      gsNews=Array.isArray(news)?news:[];
      gsFaq=Array.isArray(faq)?faq:[];
      gsInquiries=Array.isArray(inquiries)?inquiries:[];

      v48RenderNews();
      v48RenderFaq();
      renderGsInquiries();
      syncGoogleInquiryDashboard();

      if($('#googleNewsCount'))$('#googleNewsCount').textContent=`${gsNews.length} 筆`;
      if($('#googleFaqCount'))$('#googleFaqCount').textContent=`${gsFaq.length} 筆`;
      if($('#gsFaqBadge')) $('#gsFaqBadge').textContent=gsFaq.length;
      if($('#googleInquiryCount'))$('#googleInquiryCount').textContent=`${gsInquiries.length} 筆`;

      v48SetConnection('success','Google 試算表：成功連線',`最新消息 ${gsNews.length} 筆｜常見問題 ${gsFaq.length} 筆｜客戶表單 ${gsInquiries.length} 筆`);
      v48SetPageState('#gsNewsSyncState','success',`最新消息：已同步 ${gsNews.length} 筆`);
      v48SetPageState('#gsFaqSyncState','success',`常見問題：已同步 ${gsFaq.length} 筆`);
      v48SetPageState('#gsInquirySyncState','success',`客戶表單：已同步 ${gsInquiries.length} 筆`);
      return true;
    }catch(err){
      const msg=err?.message||String(err);
      v48SetConnection('error','Google 試算表：連線失敗',msg);
      v48SetPageState('#gsNewsSyncState','error','最新消息：同步失敗',msg);
      v48SetPageState('#gsFaqSyncState','error','常見問題：同步失敗',msg);
      v48SetPageState('#gsInquirySyncState','error','客戶表單：同步失敗',msg);
      return false;
    }finally{
      v48SetBusy(false);
    }
  };

  $('#googleSyncAllBtn')?.addEventListener('click',v48SyncAll);
  $('#gsReloadNews')?.addEventListener('click',v48SyncAll,true);
  $('#gsReloadFaq')?.addEventListener('click',v48SyncAll,true);
  $('#gsReloadInquiries')?.addEventListener('click',v48SyncAll,true);
  $('#mobileGoogleSync')?.addEventListener('click',v48SyncAll,true);

  setTimeout(()=>{
    v48ShowUrlState();
    if(GS_ADMIN_URL)v48SyncAll();
    else v48SetConnection('error','無法連線：尚未設定 Web App URL','請設定 Apps Script /exec 網址後重新整理。');
  },500);



  window.addEventListener('error', e => {
    const box=document.getElementById('googleConnectionStatus');
    const title=document.getElementById('googleConnectionTitle');
    const msg=document.getElementById('googleConnectionMessage');
    if(box && title && msg){
      box.dataset.state='error';
      title.textContent='後台程式發生錯誤';
      msg.textContent=e.message||'請重新整理頁面後再試。';
    }
  });

})();