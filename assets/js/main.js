function getBasePath() {
  const path = window.location.pathname;
  const match = path.match(/^(.*?)\/(?:index\.html|ihome\.html|admin\.html)(?:\/|$)/i);
  if (match) {
    return window.location.origin + match[1] + "/";
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash !== -1) {
    return window.location.origin + path.substring(0, lastSlash + 1);
  }
  return window.location.origin + "/";
}
function resolveAssetPath(path) {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return getBasePath() + path;
}

const DATA_KEY="cc_full_site_data",IMG_KEY="cc_full_site_images";
const CLOUD_DATA_KEY="cc_cloud_site_data",CLOUD_IMG_KEY="cc_cloud_site_images";
const CLOUD_DATA_URL="assets/data/site-data.json";
const CLOUD_IMGS_URL="assets/data/site-images.json";
// GAS URL 由後台 admin 寫入 localStorage 的 cc_gas_url，或 data.js formConfig.googleScriptUrl
function getGasUrl(){return localStorage.getItem("cc_gas_url")||(window.DEFAULT_DATA&&DEFAULT_DATA.formConfig&&DEFAULT_DATA.formConfig.googleScriptUrl)||""}
function clone(x){return JSON.parse(JSON.stringify(x))}
function merge(a,b){Object.keys(b||{}).forEach(k=>{if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k]});return a}
function isAdminPage(){return /admin\.html/i.test(location.pathname)}
function isPreviewMode(){return new URLSearchParams(location.search).get("preview")==="1"&&sessionStorage.getItem("cc_preview_mode")==="1"}

// ── 資料讀取優先順序 ──────────────────────────────────────────
// 預覽模式        : sessionStorage preview
// 有雲端快取      : sessionStorage 雲端資料（syncFromCloudAndApply 寫入）
// 有本機資料      : localStorage（管理員已設定的內容，GAS 設定前的備援）
// 最後備援        : DEFAULT_DATA
// ─────────────────────────────────────────────────────────────
function getData(){
  if(isPreviewMode()){const s=sessionStorage.getItem("cc_preview_site_data");return s?merge(clone(DEFAULT_DATA),JSON.parse(s)):clone(DEFAULT_DATA)}
  const cloud=sessionStorage.getItem(CLOUD_DATA_KEY);
  if(cloud){try{const d=JSON.parse(cloud);if(d&&d.siteVersion)return merge(clone(DEFAULT_DATA),d)}catch(e){}}
  const local=localStorage.getItem(DATA_KEY);
  if(local){try{const d=JSON.parse(local);if(d&&d.siteVersion)return merge(clone(DEFAULT_DATA),d)}catch(e){}}
  return clone(DEFAULT_DATA)
}
function getImgs(){
  if(isPreviewMode())return JSON.parse(sessionStorage.getItem("cc_preview_site_images")||"{}");
  const cloud=sessionStorage.getItem(CLOUD_IMG_KEY);
  if(cloud){try{const d=JSON.parse(cloud);if(d&&typeof d==="object")return d}catch(e){}}
  return JSON.parse(localStorage.getItem(IMG_KEY)||"{}")
}

// ── 雲端載入：每次開頁都強制拉最新，資料與圖片同步 ────────────
async function _fetchCloudData(){
  const bust="?_="+Date.now();

  // ── 同時拉資料和圖片（平行請求，加速）──
  async function fetchJson(url){
    try{
      const r=await fetch(resolveAssetPath(url)+bust,{cache:"no-store"});
      if(r.ok) return await r.json();
    }catch(e){}
    return null;
  }

  // 1. GitHub Pages JSON（正式發布資料）
  const [siteData, siteImages] = await Promise.all([
    fetchJson(CLOUD_DATA_URL),
    fetchJson(CLOUD_IMGS_URL)
  ]);

  if(siteData && siteData._meta && siteData._meta.version && siteData.siteVersion){
    // 圖片單獨存入 sessionStorage，避免資料 JSON 過大
    if(siteImages && siteImages.images){
      sessionStorage.setItem(CLOUD_IMG_KEY, JSON.stringify(siteImages.images));
    }
    return siteData;
  }

  // 2. GAS 備援（GitHub JSON 尚未發布時）
  const gasUrl=getGasUrl();
  if(gasUrl&&!gasUrl.includes("請貼上")){
    try{
      const r=await fetch(gasUrl+"?action=getData"+bust,{cache:"no-store"});
      if(r.ok){
        const j=await r.json();
        if(j&&j.data&&j.data.siteVersion){
          if(j.images) sessionStorage.setItem(CLOUD_IMG_KEY, JSON.stringify(j.images));
          return j.data;
        }
      }
    }catch(e){}
  }
  return null;
}

// ── 前台核心同步函式：載入雲端→更新快取→重繪（只有資料有更新才重繪）─
async function syncFromCloudAndApply(){
  if(isPreviewMode())return;
  const fresh=await _fetchCloudData();
  if(!fresh)return; // 雲端拉取失敗 → 保持現有顯示（localStorage 的內容）
  // 比對是否有更新
  const curStr=JSON.stringify(getData());
  const newStr=JSON.stringify(merge(clone(DEFAULT_DATA),fresh));
  if(curStr===newStr)return; // 沒有變化，不重繪
  // 寫入快取並同步 localStorage（讓下次開頁也能讀到最新）
  sessionStorage.setItem(CLOUD_DATA_KEY,JSON.stringify(fresh));
  if(!isAdminPage()) localStorage.setItem(DATA_KEY,JSON.stringify(fresh));
  _reapplyAll();
}
function gp(o,p){return p.split(".").reduce((x,k)=>x&&x[k],o)}function txt(el,v){el.innerHTML=String(v??"").replace(/\n/g,"<br>")}function visibleItems(arr){return (arr||[]).filter(x=>x.visible!==false)}
function todayYMD(){const d=new Date();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${d.getFullYear()}-${m}-${day}`}
function publishedNews(arr){const today=todayYMD();return visibleItems(arr).filter(n=>!n.publishDate || n.publishDate<=today).sort((a,b)=>{if((a.pinned?1:0)!==(b.pinned?1:0))return (b.pinned?1:0)-(a.pinned?1:0);return String(b.publishDate||"").localeCompare(String(a.publishDate||"") )})}

function imgVal(key, fallback){return getImgs()[key]||fallback||""}

function applyAppearanceConfig(d){
 const a=d.appearanceConfig||{};
 document.documentElement.style.setProperty("--site-logo-desktop-h",(a.desktopLogoHeight||56)+"px");
 document.documentElement.style.setProperty("--site-logo-mobile-h",(a.mobileLogoHeight||64)+"px");
 document.documentElement.style.setProperty("--footer-qr-size",(a.footerLineQrSize||150)+"px");
 
 // Dynamic Favicon and OG Image loading from getImgs()
 try {
   const im = getImgs();
   const fav = im.siteFavicon || "assets/images/logo.png";
   let favLink = document.querySelector('link[rel*="icon"]');
   if (!favLink) {
     favLink = document.createElement("link");
     favLink.rel = "shortcut icon";
     document.head.appendChild(favLink);
   }
   favLink.href = resolveAssetPath(fav);

   const ogImg = im.siteOgImage || "assets/images/hero-bg.jpg";
   let ogMeta = document.querySelector('meta[property="og:image"]');
   if (!ogMeta) {
     ogMeta = document.createElement("meta");
     ogMeta.setAttribute("property", "og:image");
     document.head.appendChild(ogMeta);
   }
   ogMeta.content = resolveAssetPath(ogImg);
 } catch(e) {
   console.error("Error setting custom favicon/ogImage:", e);
 }
}
function renderFooterQr(d){
 const a=d.appearanceConfig||{}, box=document.querySelector('[data-footer-block="qr"]');
 if(!box)return;
 if((d.footerVisibility&&d.footerVisibility.qr===false)||a.footerLineQrShow===false){box.style.display="none";return}
 box.style.display="";
 const label=a.footerLineQrLabel||"官方 LINE";
 const img=(getImgs().lineQr)||a.footerLineQrImage||"assets/images/line-qr.png";
 const url=(d.contact&&d.contact.lineUrl)||"#";
 const lineId=(d.contactFields&&d.contactFields.lineId&&d.contactFields.lineId.value)||(d.contact&&d.contact.lineId)||"";
 box.innerHTML=`<a class="fake-qr" href="${url}" target="_blank"><img src="${img}" alt="${label}"></a><p>${label}<br><strong>${lineId}</strong></p>`;
}


function parseExtraLinks(s){
  return String(s||"").split("\n").map(x=>x.trim()).filter(Boolean).map(x=>{
    let p=x.split("|");
    return {text:(p[0]||"連結").trim(),url:(p[1]||p[0]||"#").trim()};
  });
}
function renderNewsExtras(n){
  const imgs=String(n.extraImages||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const links=parseExtraLinks(n.extraLinks);
  return `${imgs.length?`<div class="news-extra-images">${imgs.map(u=>`<img src="${u}">`).join("")}</div>`:""}${links.length?`<div class="news-extra-links">${links.map(l=>`<a href="${l.url}" target="_blank">${l.text}</a>`).join("")}</div>`:""}${n.url?`<div class="news-extra-links"><a href="${n.url}" target="_blank">分享連結</a></div>`:""}`;
}

function icon(n){return {monitor:"🖥️",printer:"🖨️",invoice:"📄",payment:"💳",code:"</>",headset:"🎧"}[n]||"●"}
function renderNav(d){let defs=[["home","home"],["about","about"],["pos","posDetail"],["invoice","invoiceDetail"],["payment","paymentDetail"],["solutions","industries"],["cases","cases"],["partners","partners"],["news","news"],["faq","faq"]];menu.innerHTML=defs.filter(x=>d.headerVisibility?.[x[0]]!==false).map(x=>`<a data-scroll="${x[1]}">${d.navLabels?.[x[0]]||x[0]}</a>`).join("")+(d.headerVisibility?.contact!==false?`<button data-open-form>${d.navLabels?.contact||"聯絡我們"}</button>`:"")}
function renderCards(list, limit, renderer){let vis=visibleItems(list);return {shown:vis.slice(0,limit).map(renderer).join(""), all:vis.map(renderer).join(""), more:vis.length>limit}}

function ensureMobileFloatingButtons(){
  if(document.querySelector(".float-actions,.floating-actions,.quick-actions,.side-actions,.side-contact,.fixed-contact,.contact-float")) return;
  const d=getData();
  const wrap=document.createElement("div");
  wrap.className="float-actions";
  const line=(d.contact&&d.contact.lineUrl)||"#";
  const phone=(d.contact&&d.contact.phone)||"";
  wrap.innerHTML=`<a href="${line}" target="_blank">LINE</a><a href="tel:${phone.replace(/[^0-9+]/g,"")}">電話</a><button type="button" data-open-form>表單</button><button type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})">TOP</button>`;
  document.body.appendChild(wrap);
}


function syncAllLogoImages(){
  const im=getImgs();
  const logo=im.logo||im.siteLogo||im.headerLogo||"assets/images/logo.png";
  document.querySelectorAll('img[src*="logo"], .logo img, .footer-logo, [data-logo-img]').forEach(el=>{
    el.src=resolveAssetPath(logo);
  });
}

function apply(){const d=getData(),im=getImgs();applyAppearanceConfig(d);syncAllLogoImages();document.title=d.siteTitle;renderNav(d);const align=d.appearanceConfig?.mobileMenuAlign||"right";menu.classList.remove("menu-left","menu-right");menu.classList.add("menu-"+align);document.querySelectorAll("[data-text]").forEach(e=>txt(e,gp(d,e.dataset.text)));document.querySelectorAll("[data-img]").forEach(e=>{let k=e.dataset.img;if(im[k])e.src=resolveAssetPath(im[k])});if(im.heroBg)document.querySelector(".hero").style.backgroundImage=`url(${resolveAssetPath(im.heroBg)})`;document.querySelector("[data-line]").href=d.contact.lineUrl;document.querySelector("[data-phone]").href="tel:"+d.contact.phone.replace(/[^\d]/g,"");document.querySelectorAll("[data-social]").forEach(a=>{a.href=d.contact[a.dataset.social]||"#";a.target="_blank"});document.querySelector("[data-field=lineId]").textContent=d.contactFields?.lineId?.value||d.contact.lineId||"";heroPoints.innerHTML=d.hero.points.map(x=>`<span>${x}</span>`).join("");serviceGrid.innerHTML=d.services.map(s=>`<article class="service-card"><div class="icon" style="font-size:38px">${icon(s.icon)}</div><h3>${s.title}</h3><p>${s.text}</p><button data-scroll="${s.target}">了解更多 →</button></article>`).join("");industryGrid.innerHTML=d.industries.map((s,i)=>{const src=resolveAssetPath(imgVal("industry"+i,s.image));return `<article class="industry-card"><img src="${src}" onerror="this.onerror=null;this.src='${resolveAssetPath(s.image)}'"><div><h3>${s.title}</h3><p>${s.subtitle}</p></div></article>`}).join("");solutionGrid.innerHTML=d.solutions.map(s=>`<article class="solution-card"><h3>${s.title}</h3><p>${s.text}</p></article>`).join("");
  // Handle stats grid visibility and rendering
  const statsSec = document.getElementById("stats");
  if (statsSec) {
    statsSec.style.display = (d.statsVisible !== false) ? "" : "none";
  }
  if (typeof statsGrid !== "undefined" && statsGrid) {
    statsGrid.innerHTML = (d.stats || []).filter(s => s.visible !== false).map(s => {
      const match = s.number.match(/(\d+)/);
      let initialText = s.number;
      if (match) {
        const suffix = s.number.replace(match[1], "");
        initialText = "1" + suffix;
      }
      return `<div class="stat"><strong data-val="${s.number}">${initialText}</strong><span>${s.label}</span></div>`;
    }).join("");
  }
  
  // Handle shipping grid visibility and rendering
  const shippingSec = document.getElementById("shipping");
  if (shippingSec) {
    shippingSec.style.display = (d.shippingVisible !== false) ? "" : "none";
  }
  if (typeof shippingGrid !== "undefined" && shippingGrid) {
    shippingGrid.innerHTML = (d.shipping || []).filter(s => s.visible !== false).map((s, i) => `<div class="ship"><div class="circle">${i+1}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join("");
  }
Object.keys(d.details).forEach(id=>{let x=d.details[id],el=document.getElementById(id);if(el)el.innerHTML=`<div class="container"><div><span class="blue-tag">${x.title}</span><h2>${x.headline}</h2><p>${x.text}</p></div><ul>${x.items.map(y=>`<li>${y}</li>`).join("")}</ul></div>`});renderFooter(d);renderCases(d);renderPartners(d);renderNews(d);renderFAQ(d);renderEditEntry(d);applySocialVisibility(d);bind()}
function renderFooter(d){const f=d.contactFields||{};footerContactLines.innerHTML=Object.keys(f).filter(k=>f[k].show!==false).map(k=>`<div class="${k==="address"||k==="email"||k==="hours"?"wide":""}"><b>${f[k].label}</b><span>${f[k].value}</span></div>`).join("");document.querySelectorAll("[data-footer-block]").forEach(el=>{let k=el.dataset.footerBlock;el.style.display=d.footerVisibility?.[k]===false?"none":""})}
function renderCases(d){let conf=d.casesDisplay||{limit:4};let r=renderCards(d.cases,conf.limit||4,(c,i)=>{const src=resolveAssetPath(imgVal("case"+i,c.image));return`<article><img src="${src}" onerror="this.onerror=null;this.src='${resolveAssetPath(c.image)}'"><h3>${c.title}</h3><p>${c.subtitle||""}</p><p>${c.text||""}</p>${c.url?`<a href="${c.url}" target="_blank">前往查看</a>`:""}</article>`});caseGrid.innerHTML=r.shown;caseMoreWrap.innerHTML=r.more?`<button class="btn outline-blue" data-open-list="cases">顯示更多成功案例</button>`:""}
function renderPartners(d){partners.style.display=d.partnersDisplay?.visible===false?"none":"";let conf=d.partnersDisplay||{limit:4};let r=renderCards(d.partners,conf.limit||4,(p,i)=>{const src=resolveAssetPath(imgVal("partner"+i,p.image));return`<article class="partner-card"><img src="${src}" onerror="this.onerror=null;this.src='${resolveAssetPath(p.image)}'"><div class="partner-body"><h3>${p.companyName}</h3><p>${p.description||""}</p><p>電話：${p.phone||""}</p><div class="partner-links">${p.websiteUrl?`<a href="${p.websiteUrl}" target="_blank">形象網站</a>`:""}${p.lineUrl?`<a href="${p.lineUrl}" target="_blank">LINE</a>`:""}${p.facebookUrl?`<a href="${p.facebookUrl}" target="_blank">粉專</a>`:""}</div></div></article>`});partnerGrid.innerHTML=r.shown;partnerMoreWrap.innerHTML=r.more?`<button class="btn outline-blue" data-open-list="partners">顯示更多關係企業</button>`:""}
function renderNews(d){news.style.display=d.newsDisplay?.visible===false?"none":"";let conf=d.newsDisplay||{limit:3};let all=publishedNews(d.news);let shown=all.slice(0,conf.limit||3);newsGrid.innerHTML=shown.map((n,i)=>`<article class="${n.pinned?"pinned-news":""}"><div class="news-meta">${n.pinned?`<span class="pin-badge">置頂</span>`:""}${n.publishDate?`<time>${n.publishDate}</time>`:""}</div><h3>${n.title}</h3><p>${n.subtitle||""}</p><p>${n.text||""}</p>${renderNewsExtras(n)}</article>`).join("");newsMoreWrap.innerHTML=all.length>(conf.limit||3)?`<button class="btn outline-blue" data-open-list="news">顯示更多最新消息</button>`:""}
function renderFAQ(d){faq.style.display=d.faqDisplay?.visible===false?"none":"";let vis=visibleItems(d.faqs),limit=d.faqDisplay?.limit||6;faqGrid.innerHTML=vis.slice(0,limit).map(f=>`<div class="faq-item"><div class="faq-q">${f.q}<span>＋</span></div><div class="faq-a">${f.a}</div></div>`).join("");faqMoreWrap.innerHTML=vis.length>limit?`<button class="btn outline-blue" data-open-list="faqs">顯示更多 QA</button>`:""}
function renderEditEntry(d){let a=adminEditEntry,c=d.editEntry||{};a.textContent=c.icon||"✎";a.title=c.title||"網站後台";a.className="admin-edit-entry";if(c.show===false)a.classList.add("hide");if(c.position)a.classList.add(c.position)}
function openList(type){const d=getData();let title="",body="";if(type==="cases"){title=d.casesTitle;body=visibleItems(d.cases).map((c,i)=>{const src=resolveAssetPath(imgVal("case"+i,c.image));return`<article class="modal-card"><img src="${src}" onerror="this.onerror=null;this.src='${resolveAssetPath(c.image)}'"><div><h3>${c.title}</h3><p>${c.subtitle||""}</p><p>${c.text||""}</p>${c.url?`<a href="${c.url}" target="_blank">前往查看</a>`:""}</div></article>`}).join("")}if(type==="partners"){title=d.partnersTitle;body=visibleItems(d.partners).map((p,i)=>{const src=resolveAssetPath(imgVal("partner"+i,p.image));return`<article class="modal-card"><img src="${src}" onerror="this.onerror=null;this.src='${resolveAssetPath(p.image)}'"><div><h3>${p.companyName}</h3><p>${p.description||""}</p><p>電話：${p.phone||""}</p>${p.websiteUrl?`<a href="${p.websiteUrl}" target="_blank">形象網站</a>`:""}</div></article>`}).join("")}if(type==="news"){title=d.newsTitle;body=publishedNews(d.news).map((n,i)=>`<article class="modal-card ${n.pinned?"pinned-news":""}"><div><div class="news-meta">${n.pinned?`<span class="pin-badge">置頂</span>`:""}${n.publishDate?`<time>${n.publishDate}</time>`:""}</div><h3>${n.title}</h3><p>${n.subtitle||""}</p><p>${n.text||""}</p>${renderNewsExtras(n)}</div></article>`).join("")}if(type==="faqs"){title=d.faqTitle;body=visibleItems(d.faqs).map(f=>`<div class="faq-item open"><div class="faq-q">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join("")}contentModalTitle.textContent=title;contentModalBody.innerHTML=`<div class="${type==='faqs'?'faq-grid':'modal-list-grid'}">${body}</div>`;contentModal.classList.add("show");document.body.classList.add("modal-open")}
function bind(){document.querySelectorAll("[data-scroll]").forEach(e=>e.onclick=x=>{x.preventDefault();scrollToSection(e.dataset.scroll)});document.querySelectorAll(".faq-q").forEach(q=>q.onclick=()=>q.parentElement.classList.toggle("open"));document.querySelectorAll("[data-open-form]").forEach(e=>e.onclick=x=>{x.preventDefault();openForm()});document.querySelectorAll("[data-open-list]").forEach(e=>e.onclick=x=>{x.preventDefault();openList(e.dataset.openList)})}
function scrollToSection(id) {
  let t = document.getElementById(id);
  if (!t) return;
  window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 86, behavior: "smooth" });
  
  menu.classList.remove("show");
  if (mobileToggle) mobileToggle.textContent = "☰";
  const menuOverlay = document.getElementById("menuOverlay");
  if (menuOverlay) menuOverlay.classList.remove("show");
  
  // Remove content blur
  document.querySelectorAll("main, footer, .hero").forEach(el => el.classList.remove("blur-content"));
}

if (mobileToggle) {
  mobileToggle.onclick = e => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle("show");
    mobileToggle.textContent = isOpen ? "✕" : "☰";
    const menuOverlay = document.getElementById("menuOverlay");
    if (menuOverlay) menuOverlay.classList.toggle("show", isOpen);
    
    // Toggle content blur
    document.querySelectorAll("main, footer, .hero").forEach(el => {
      el.classList.toggle("blur-content", isOpen);
    });
  };
}

const menuOverlay = document.getElementById("menuOverlay");
if (menuOverlay) {
  menuOverlay.onclick = () => {
    menu.classList.remove("show");
    if (mobileToggle) mobileToggle.textContent = "☰";
    menuOverlay.classList.remove("show");
    
    // Remove content blur
    document.querySelectorAll("main, footer, .hero").forEach(el => el.classList.remove("blur-content"));
  };
}

document.addEventListener("click", e => {
  if (window.innerWidth <= 760 && menu.classList.contains("show")) {
    if (!menu.contains(e.target) && e.target !== mobileToggle) {
      menu.classList.remove("show");
      if (mobileToggle) mobileToggle.textContent = "☰";
      const menuOverlay = document.getElementById("menuOverlay");
      if (menuOverlay) menuOverlay.classList.remove("show");
      
      // Remove content blur
      document.querySelectorAll("main, footer, .hero").forEach(el => el.classList.remove("blur-content"));
    }
  }
});

function openForm() {
  leadModal.classList.add("show");
  document.body.classList.add("modal-open");
  formStatus.textContent = "";
}

function closeForm() {
  leadModal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-close-form]").forEach(e => e.onclick = closeForm);
document.querySelectorAll("[data-close-content]").forEach(e => e.onclick = () => {
  contentModal.classList.remove("show");
  document.body.classList.remove("modal-open");
});

pageUrl.value = location.href;
if (document.getElementById("notifyEmail")) {
  notifyEmail.value = (getData().formConfig && getData().formConfig.notifyEmail) || "";
}

leadForm.onsubmit = async e => {
  e.preventDefault();
  const d = getData();
  const url = getGasUrl() || d.formConfig?.googleScriptUrl;
  if (notifyEmail) notifyEmail.value = d.formConfig?.notifyEmail || "";
  if (!url || url.includes("請貼上")) {
    formStatus.textContent = "尚未設定表單服務，請聯絡管理員。";
    formStatus.className = "err";
    return;
  }
  let btn = leadForm.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "送出中...";
  let send = Object.fromEntries(new FormData(leadForm).entries());
  send.type        = "submitForm";
  send.formType    = leadForm.dataset.formType || "contact";
  send.siteId      = (getData().siteId) || "chengchuang"; // 站台識別
  send.sourceUrl   = location.href;
  send.createdAt   = new Date().toLocaleString("zh-TW", { hour12: false });
  send.notifyEmail = d.formConfig?.notifyEmail || "";
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(send)
    });
    formStatus.textContent = "✅ 已送出，我們會盡快與您聯絡！";
    formStatus.className = "ok";
    leadForm.reset();
    setTimeout(closeForm, 1500);
  } catch (err) {
    formStatus.textContent = "❌ 送出失敗，請電話或 LINE 聯繫我們。";
    formStatus.className = "err";
  } finally {
    btn.disabled = false;
    btn.textContent = "送出表單";
  }
};

// 開啟指定類型的表單
function openFormType(formType){
  const labels = {contact:"聯絡我們",quote:"報價需求",repair:"維修申請",customer:"客戶需求",register:"合作申請"};
  const modal = document.getElementById("leadModal");
  if(modal){
    leadForm.dataset.formType = formType || "contact";
    const title = modal.querySelector("h2");
    if(title) title.textContent = labels[formType] || "聯絡我們";
    openForm();
  }
}

apply();          // 立刻用 DEFAULT_DATA 渲染，確保頁面不空白
initSearch();
syncFromCloudAndApply(); // 同時非同步拉雲端，拉到立刻重繪（不 delay）

/* 006 v16 post render fixes */
function ccV16Enhance(){
  const d=getData();
  const im=getImgs();
  const logo=im.logo||im.siteLogo||im.headerLogo||"assets/images/logo.png";

  document.querySelectorAll('.logo img,.footer-logo,.brand-logo img,img[src*="logo"]').forEach(el=>{
    if(el && logo) el.src=logo;
    el.style.background='transparent';
    el.style.border='0';
    el.style.boxShadow='none';
  });

  const a=d.appearanceConfig||{};
  const lineUrl=a.lineJoinUrl||(d.contact&&d.contact.lineUrl)||"#";
  const qrImg=im.lineQr||a.footerLineQrImage||"assets/images/line-qr.png";
  const qrSize=a.footerLineQrSize||150;
  document.documentElement.style.setProperty("--footer-qr-size", qrSize+"px");

  document.querySelectorAll('[data-footer-block="qr"],.qr-box').forEach(box=>{
    if(!box)return;
    if((d.footerVisibility&&d.footerVisibility.qr===false)||a.footerLineQrShow===false){
      box.style.display='none';
      return;
    }
    box.style.display='';
    const label=a.footerLineQrLabel||"官方 LINE";
    const lineId=(d.contactFields&&d.contactFields.lineId&&d.contactFields.lineId.value)||(d.contact&&d.contact.lineId)||"";
    box.innerHTML=`<a class="fake-qr" style="width:${qrSize}px;height:${qrSize}px" href="${lineUrl}" target="_blank" rel="noopener"><img src="${qrImg}" alt="${label}"></a><p>${label}<br><a href="${lineUrl}" target="_blank" rel="noopener"><strong>${lineId}</strong></a></p>`;
  });

  /* 讓 LINE ID 文字也能直接點 LINE */
  document.querySelectorAll('.contact-lines div,.footer-contact div').forEach(row=>{
    const txt=row.textContent||"";
    if(txt.toLowerCase().includes('line') || txt.includes('@905')){
      if(!row.querySelector('a')){
        row.style.cursor='pointer';
        row.addEventListener('click',()=>window.open(lineUrl,'_blank'),{once:false});
      }
    }
  });

  /* 最下方版本碼：低調顯示 */
  if(a.showVersion!==false && !document.querySelector('.footer-version')){
    const footer=document.querySelector('footer,.footer');
    if(footer){
      const v=document.createElement('div');
      v.className='footer-version';
      v.textContent=a.versionLabel||d.siteVersion||'006_v16';
      footer.appendChild(v);
    }
  }
}

window.addEventListener('load',()=>{try{ccV16Enhance()}catch(e){console.warn(e)}});
setTimeout(()=>{try{ccV16Enhance()}catch(e){}},500);


/* 007 v17 mobile floating follow fix */
function ccV17FloatingFollow(){
  const d=getData();
  const a=d.appearanceConfig||{};
  const lineUrl=a.lineJoinUrl||(d.contact&&d.contact.lineUrl)||"https://lin.ee/RbGc5o5";
  const phone=(d.contact&&d.contact.phone)||"";
  let wrap=document.getElementById("ccMobileFloat");
  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="ccMobileFloat";
    wrap.className="cc-mobile-float";
    wrap.innerHTML=`<a id="ccFloatLine" href="#" target="_blank" rel="noopener">LINE</a><a id="ccFloatPhone" href="#">電話</a><button id="ccFloatForm" type="button">表單</button><button id="ccFloatTop" type="button">TOP</button>`;
    document.body.appendChild(wrap);
  }
  wrap.style.display="flex";
  wrap.style.position="fixed";
  wrap.style.zIndex="2147483000";
  const line=document.getElementById("ccFloatLine");
  const tel=document.getElementById("ccFloatPhone");
  const form=document.getElementById("ccFloatForm");
  const top=document.getElementById("ccFloatTop");
  if(line)line.href=lineUrl;
  if(tel)tel.href="tel:"+String(phone).replace(/[^0-9+]/g,"");
  if(form){
    form.onclick=function(e){
      e.preventDefault();
      const btn=document.querySelector("[data-open-form],.open-form,[href='#contact']");
      if(window.openForm) window.openForm();
      else if(btn && btn!==form) btn.click();
      else {
        const modal=document.getElementById("leadModal");
        if(modal){modal.classList.add("show");document.body.classList.add("modal-open");}
        else location.hash="#contact";
      }
    };
  }
  if(top){
    top.onclick=function(e){e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});};
  }
}
window.addEventListener("load",()=>{try{ccV17FloatingFollow()}catch(e){console.warn(e)}});
document.addEventListener("DOMContentLoaded",()=>{try{ccV17FloatingFollow()}catch(e){}});
setTimeout(()=>{try{ccV17FloatingFollow()}catch(e){}},800);
setTimeout(()=>{try{ccV17FloatingFollow()}catch(e){}},2500);


/* Unified social media and link device visibility control */
function applySocialVisibility(d) {
  if (!d) return;
  const isMobile = window.innerWidth <= 760;
  
  // Device visibility config
  const visCfg = d.socialDeviceVisibility || {};
  
  // Default values check
  const contact = d.contact || {};
  const lineUrl = contact.lineUrl || "";
  const fbUrl = contact.facebookUrl || "";
  const igUrl = contact.instagramUrl || "";
  const ytUrl = contact.youtubeUrl || "";
  const emailVal = (d.contactFields && d.contactFields.email && d.contactFields.email.value) || contact.email || "";
  
  const defaultFB = "https://facebook.com/";
  const defaultIG = "https://instagram.com/";
  const defaultYT = "https://youtube.com/";
  
  function isUrlEmpty(url, defaultPrefix) {
    if (!url) return true;
    const trimmed = url.trim();
    if (trimmed === "" || trimmed === "#" || trimmed === "index.html") return true;
    if (defaultPrefix && trimmed === defaultPrefix) return true;
    return false;
  }
  
  function shouldShow(key, url, defaultPrefix) {
    // 1. Check if URL is empty
    if (key !== "email" && isUrlEmpty(url, defaultPrefix)) {
      return false;
    }
    if (key === "email" && !emailVal.trim()) {
      return false;
    }
    
    // 2. Check Device visibility setting
    const setting = visCfg[key] || "both";
    if (setting === "hidden") return false;
    if (setting === "desktop" && isMobile) return false;
    if (setting === "mobile" && !isMobile) return false;
    
    return true;
  }
  
  const map = {
    line: '[data-line],#ccFloatLine',
    facebook: '[data-social="facebookUrl"]',
    instagram: '[data-social="instagramUrl"]',
    youtube: '[data-social="youtubeUrl"]',
    email: '.social [data-open-form]'
  };
  
  const lineShow = shouldShow("line", lineUrl);
  const fbShow = shouldShow("facebook", fbUrl, defaultFB);
  const igShow = shouldShow("instagram", igUrl, defaultIG);
  const ytShow = shouldShow("youtube", ytUrl, defaultYT);
  const emailShow = shouldShow("email");
  
  document.querySelectorAll(map.line).forEach(el => el.style.display = lineShow ? "" : "none");
  document.querySelectorAll(map.facebook).forEach(el => el.style.display = fbShow ? "" : "none");
  document.querySelectorAll(map.instagram).forEach(el => el.style.display = igShow ? "" : "none");
  document.querySelectorAll(map.youtube).forEach(el => el.style.display = ytShow ? "" : "none");
  document.querySelectorAll(map.email).forEach(el => el.style.display = emailShow ? "" : "none");
  
  const social = document.querySelector(".social");
  if (social) {
    const anyVisible = fbShow || igShow || ytShow || emailShow;
    social.style.display = anyVisible ? "" : "none";
  }
}

function applySocialVisibility009(d) { applySocialVisibility(d); }
function applySocialIconVisibilityV19(d) { applySocialVisibility(d); }
window.applySocialVisibility009 = applySocialVisibility009;
window.applySocialIconVisibilityV19 = applySocialIconVisibilityV19;
window.applySocialVisibility = applySocialVisibility;

window.addEventListener('load', () => {
  try { applySocialVisibility(getData()); } catch(e) {}
});
window.addEventListener('resize', () => {
  try { applySocialVisibility(getData()); } catch(e) {}
});
document.addEventListener('DOMContentLoaded', () => {
  try { applySocialVisibility(getData()); } catch(e) {}
});
setTimeout(() => {
  try { applySocialVisibility(getData()); } catch(e) {}
}, 800);
setTimeout(() => {
  try { applySocialVisibility(getData()); } catch(e) {}
}, 2500);


/* 010 v20：前台快捷工具顯示/隱藏與自訂清單同步 */
(function(){
  function getSafeData(){
    try{
      return typeof getData==="function" ? getData() : (window.DEFAULT_DATA || {});
    }catch(e){
      return window.DEFAULT_DATA || {};
    }
  }
  function getLineUrl(d){
    return (d.contact && d.contact.lineUrl) ||
           (d.appearanceConfig && d.appearanceConfig.lineJoinUrl) ||
           "https://lin.ee/RbGc5o5";
  }
  function getPhoneUrl(d){
    const p=(d.contact && d.contact.phone) || "(02)-6623-7091";
    return "tel:" + String(p).replace(/[^0-9+]/g,"");
  }
  function openForm010(){
    const m=document.getElementById("leadModal");
    if(m){
      m.classList.add("show");
      document.body.classList.add("modal-open");
      return;
    }
    const btn=document.querySelector("[data-open-form]");
    if(btn) btn.click();
  }
  function ensureQuickTools010(){
    const d=getSafeData();
    const q=d.quickToolVisibility || {show:true};

    let oldFloat=document.querySelector(".floatbar");
    if(oldFloat) oldFloat.style.display="none";

    let box=document.getElementById("ccQuickTools");
    if(!box){
      box=document.getElementById("ccMobileFloat") || document.createElement("div");
      box.id="ccQuickTools";
      box.className="cc-quick-tools";
      if(!box.parentNode) document.body.appendChild(box);
    }

    if(q.show===false){
      box.style.display="none";
      return;
    }

    box.style.display="flex";
    const tools = d.quickTools || [
      { type: "line", label: "LINE", url: "", visible: true },
      { type: "phone", label: "電話", url: "", visible: true },
      { type: "form", label: "表單", url: "", visible: true },
      { type: "top", label: "TOP", url: "", visible: true }
    ];

    box.innerHTML = tools.filter(t => t.visible !== false).map((t, idx) => {
      if (t.type === "line") {
        const url = getLineUrl(d);
        return `<a href="${url}" target="_blank" rel="noopener">${t.label || 'LINE'}</a>`;
      } else if (t.type === "phone") {
        const url = t.url || getPhoneUrl(d);
        return `<a href="${url}">${t.label || '電話'}</a>`;
      } else if (t.type === "form") {
        return `<button type="button" data-qt-action="form">${t.label || '表單'}</button>`;
      } else if (t.type === "top") {
        return `<button type="button" data-qt-action="top">${t.label || 'TOP'}</button>`;
      } else { // custom
        return `<a href="${t.url || '#'}" target="_blank" rel="noopener">${t.label || '自訂'}</a>`;
      }
    }).join("");

    box.querySelectorAll("[data-qt-action='form']").forEach(btn => btn.onclick = openForm010);
    box.querySelectorAll("[data-qt-action='top']").forEach(btn => btn.onclick = () => window.scrollTo({top:0,behavior:"smooth"}));
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",ensureQuickTools010);
  }else{
    ensureQuickTools010();
  }
})();

function _reapplyAll(){
  apply();
  if(window.ccV16Enhance) ccV16Enhance();
  if(window.ccV17FloatingFollow) ccV17FloatingFollow();
  if(window.applySocialVisibility009) applySocialVisibility009(getData());
  if(window.applySocialIconVisibilityV19) applySocialIconVisibilityV19(getData());
}

function initSearch() {
  const searchToggleBtn = document.getElementById("searchToggleBtn");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchCloseBtn = document.getElementById("searchCloseBtn");
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  const resultsContainer = document.getElementById("searchOverlayResults");
  
  if (!searchToggleBtn || !searchOverlay || !input || !btn || !resultsContainer) return;
  
  searchToggleBtn.onclick = (e) => {
    e.preventDefault();
    searchOverlay.classList.add("show");
    document.body.classList.add("modal-open");
    setTimeout(() => input.focus(), 150);
  };
  
  const closeSearch = () => {
    searchOverlay.classList.remove("show");
    document.body.classList.remove("modal-open");
    input.value = "";
    resultsContainer.innerHTML = "";
  };
  
  if (searchCloseBtn) {
    searchCloseBtn.onclick = closeSearch;
  }
  
  // Close on Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchOverlay.classList.contains("show")) {
      closeSearch();
    }
  });

  function doSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      resultsContainer.innerHTML = "";
      return;
    }
    
    const d = getData();
    const results = [];
    const today = todayYMD();
    
    // Search Services
    const matchedServices = (d.services || []).filter(s => 
      String(s.title || "").toLowerCase().includes(q) || 
      String(s.text || "").toLowerCase().includes(q)
    );
    if (matchedServices.length > 0) {
      results.push({
        category: "服務項目",
        type: "services",
        items: matchedServices.map(s => ({
          title: s.title,
          desc: s.text,
          target: s.target
        }))
      });
    }
    
    // Search Cases
    const matchedCases = (d.cases || []).filter(c => 
      c.visible !== false && (
        String(c.title || "").toLowerCase().includes(q) || 
        String(c.subtitle || "").toLowerCase().includes(q) || 
        String(c.text || "").toLowerCase().includes(q)
      )
    );
    if (matchedCases.length > 0) {
      results.push({
        category: "成功案例",
        type: "cases",
        items: matchedCases.map(c => ({
          title: c.title,
          desc: (c.subtitle ? `[${c.subtitle}] ` : "") + (c.text || ""),
          url: c.url,
          target: "cases"
        }))
      });
    }
    
    // Search Partners
    const matchedPartners = (d.partners || []).filter(p => 
      p.visible !== false && (
        String(p.companyName || "").toLowerCase().includes(q) || 
        String(p.description || "").toLowerCase().includes(q) ||
        String(p.phone || "").toLowerCase().includes(q)
      )
    );
    if (matchedPartners.length > 0) {
      results.push({
        category: "關係企業",
        type: "partners",
        items: matchedPartners.map(p => ({
          title: p.companyName,
          desc: p.description,
          url: p.websiteUrl,
          target: "partners"
        }))
      });
    }
    
    // Search News
    const matchedNews = (d.news || []).filter(n => 
      n.visible !== false && 
      (!n.publishDate || n.publishDate <= today) && (
        String(n.title || "").toLowerCase().includes(q) || 
        String(n.subtitle || "").toLowerCase().includes(q) || 
        String(n.text || "").toLowerCase().includes(q)
      )
    );
    if (matchedNews.length > 0) {
      results.push({
        category: "最新消息",
        type: "news",
        items: matchedNews.map(n => ({
          title: `[${n.publishDate}] ${n.title}`,
          desc: n.text,
          target: "news"
        }))
      });
    }
    
    // Search FAQ
    const matchedFaqs = (d.faqs || []).filter(f => 
      f.visible !== false && (
        String(f.q || "").toLowerCase().includes(q) || 
        String(f.a || "").toLowerCase().includes(q)
      )
    );
    if (matchedFaqs.length > 0) {
      results.push({
        category: "常見問題",
        type: "faqs",
        items: matchedFaqs.map(f => ({
          title: `Q: ${f.q}`,
          desc: `A: ${f.a}`,
          target: "faq"
        }))
      });
    }
    
    // Render Results
    if (results.length === 0) {
      resultsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 16px;">無匹配“${input.value}”的內容，請嘗試其他關鍵字。</div>`;
    } else {
      let html = `<div class="search-results-list" style="display:flex; flex-direction:column; gap:20px; color:#ffffff;">`;
      results.forEach(cat => {
        html += `
          <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom:12px;">
            <h3 style="color:#2d9cff; margin:0 0 10px 0; font-size:16px; border-left:3px solid #2d9cff; padding-left:8px; font-weight: 600;">${cat.category}</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${cat.items.map(it => `
                <div class="search-result-item" style="padding:10px; border-radius:6px; background:rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); transition:all 0.2s; cursor:pointer;" onclick="closeSearchAndNavigate('${it.target}', '${it.url || ''}')">
                  <strong style="display:block; font-size:14.5px; color:#ffffff;">${it.title}</strong>
                  <span style="font-size:12.5px; color:#94a3b8; display:block; margin-top:2px;">${it.desc}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      });
      html += `</div>`;
      resultsContainer.innerHTML = html;
      
      // Add hover effects dynamically
      const items = resultsContainer.querySelectorAll(".search-result-item");
      items.forEach(el => {
        el.onmouseenter = () => {
          el.style.background = "rgba(45, 156, 255, 0.1)";
          el.style.borderColor = "rgba(45, 156, 255, 0.3)";
        };
        el.onmouseleave = () => {
          el.style.background = "rgba(255,255,255,0.03)";
          el.style.borderColor = "rgba(255,255,255,0.05)";
        };
      });
    }
  }
  
  btn.onclick = (e) => { e.preventDefault(); doSearch(); };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });
  // Real-time search as user types
  input.addEventListener("input", () => {
    doSearch();
  });
}

function closeSearchAndNavigate(target, url) {
  const searchOverlay = document.getElementById("searchOverlay");
  if (searchOverlay) {
    searchOverlay.classList.remove("show");
  }
  document.body.classList.remove("modal-open");
  
  if (url && url !== "index.html" && !url.includes("index.html")) {
    window.open(url, "_blank");
    return;
  }
  
  if (target) {
    scrollToSection(target);
  }
}

function fillSearch(val) {
  const input = document.getElementById("searchInput");
  if (input) {
    input.value = val;
    // Trigger input event to run real-time search
    input.dispatchEvent(new Event("input"));
  }
}

window.closeSearchAndNavigate = closeSearchAndNavigate;
window.initSearch = initSearch;
window.fillSearch = fillSearch;

// Scroll event listener for premium navigation styling & active section highlighting
window.addEventListener("scroll", function() {
  const header = document.querySelector(".header");
  if (header) {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  // Sync active menu link on scroll
  const sections = document.querySelectorAll(".section-anchor");
  const navLinks = document.querySelectorAll(".menu a[data-scroll]");
  let currentActive = "";
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    if (window.scrollY >= sectionTop - 120) {
      currentActive = section.getAttribute("id");
    }
  });

  navLinks.forEach(link => {
    if (link.getAttribute("data-scroll") === currentActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

// Scroll Reveal Observer (Ihome style block animation loader)
function animateSingleStatNumber(statEl) {
  const el = statEl.querySelector("strong[data-val]");
  if (!el) return;
  const targetStr = el.getAttribute("data-val") || "";
  const match = targetStr.match(/(\d+)/);
  if (!match) return;
  
  const targetNum = parseInt(match[1], 10);
  const suffix = targetStr.replace(match[1], "");
  
  const duration = 1200; // 1.2 seconds count duration
  const startTime = performance.now();
  
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = progress * (2 - progress); // easeOutQuad
    const currentVal = Math.floor(easeProgress * targetNum);
    
    el.textContent = currentVal + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = targetStr;
    }
  }
  requestAnimationFrame(update);
}

function initScrollReveal() {
  const d = getData();
  const animConfig = d.appearanceConfig || {};
  const duration = animConfig.animationDuration !== undefined ? animConfig.animationDuration : 1.2;
  const animType = animConfig.animationType || 'fadeInUp'; // fadeInUp, fadeInDown, zoomIn, fade
  
  // Map animation types to reveal class names
  let animClass = 'reveal-fade-up';
  if (animType === 'fadeInDown') animClass = 'reveal-fade-down';
  else if (animType === 'zoomIn') animClass = 'reveal-zoom-in';
  else if (animType === 'fade') animClass = 'reveal-fade-only';

  const elements = document.querySelectorAll('.section, .service-card, .industry-card, .solution-card, .stat, .partner-card, .case-card, .news-card, .faq-item, .detail .container > div, .detail .container > ul');
  
  elements.forEach((el, index) => {
    el.classList.add(animClass);
    // Apply dynamic duration as inline style
    el.style.transitionDuration = `${duration}s`;
    
    // Add a slight stagger delay for grid items
    const gridIndex = index % 4;
    if (gridIndex > 0 && !el.classList.contains('section')) {
      el.style.transitionDelay = `${gridIndex * 0.08}s`;
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('stat')) {
          try { animateSingleStatNumber(entry.target); } catch(e) {}
        }
        observer.unobserve(entry.target); // Animates only once
      }
    });
  }, {
    root: null,
    threshold: 0.05,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// Call Scroll Reveal initialization
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initScrollReveal, 200);
});

/* ==========================================================================
   Desktop Viewport Resize Proportionate Scaling Helper
   ========================================================================== */
function handleDesktopScaling() {
  const width = window.innerWidth;
  // Apply proportional zoom scaling on desktop widths (between 768px and 1400px)
  if (width > 760 && width < 1400) {
    const scale = width / 1400;
    document.body.style.zoom = scale;
  } else {
    document.body.style.zoom = "";
  }
}
window.addEventListener("resize", handleDesktopScaling);
window.addEventListener("DOMContentLoaded", handleDesktopScaling);
// Run immediately to prevent layout shifts
handleDesktopScaling();
