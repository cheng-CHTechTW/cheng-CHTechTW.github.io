const DATA_KEY="cc_full_site_data",IMG_KEY="cc_full_site_images",GOOGLE_SCRIPT_URL="請貼上你的 Google Apps Script Web App URL";
function clone(x){return JSON.parse(JSON.stringify(x))}function merge(a,b){Object.keys(b||{}).forEach(k=>{if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k])merge(a[k],b[k]);else a[k]=b[k]});return a}
function isPreviewMode(){return new URLSearchParams(location.search).get("preview")==="1"&&sessionStorage.getItem("cc_preview_mode")==="1"}
function getData(){let s=isPreviewMode()?sessionStorage.getItem("cc_preview_site_data"):localStorage.getItem(DATA_KEY);return s?merge(clone(DEFAULT_DATA),JSON.parse(s)):clone(DEFAULT_DATA)}
function getImgs(){return JSON.parse((isPreviewMode()?sessionStorage.getItem("cc_preview_site_images"):localStorage.getItem(IMG_KEY))||"{}")}
function gp(o,p){return p.split(".").reduce((x,k)=>x&&x[k],o)}function txt(el,v){el.innerHTML=String(v??"").replace(/\n/g,"<br>")}function visibleItems(arr){return (arr||[]).filter(x=>x.visible!==false)}
function todayYMD(){const d=new Date();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${d.getFullYear()}-${m}-${day}`}
function publishedNews(arr){const today=todayYMD();return visibleItems(arr).filter(n=>!n.publishDate || n.publishDate<=today).sort((a,b)=>{if((a.pinned?1:0)!==(b.pinned?1:0))return (b.pinned?1:0)-(a.pinned?1:0);return String(b.publishDate||"").localeCompare(String(a.publishDate||"") )})}

function imgVal(key, fallback){return getImgs()[key]||fallback||""}

function applyAppearanceConfig(d){
 const a=d.appearanceConfig||{};
 document.documentElement.style.setProperty("--site-logo-desktop-h",(a.desktopLogoHeight||56)+"px");
 document.documentElement.style.setProperty("--site-logo-mobile-h",(a.mobileLogoHeight||64)+"px");
 document.documentElement.style.setProperty("--footer-qr-size",(a.footerLineQrSize||150)+"px");
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
  const logo=im.logo||im.siteLogo||im.headerLogo;
  if(!logo)return;
  document.querySelectorAll('img[src*="logo"], .logo img, .footer-logo, [data-logo-img]').forEach(el=>{
    el.src=logo;
  });
}

function apply(){const d=getData(),im=getImgs();applyAppearanceConfig(d);syncAllLogoImages();document.title=d.siteTitle;renderNav(d);const align=d.appearanceConfig?.mobileMenuAlign||"right";menu.classList.remove("menu-left","menu-right");menu.classList.add("menu-"+align);document.querySelectorAll("[data-text]").forEach(e=>txt(e,gp(d,e.dataset.text)));document.querySelectorAll("[data-img]").forEach(e=>{let k=e.dataset.img;if(im[k])e.src=im[k]});if(im.heroBg)document.querySelector(".hero").style.backgroundImage=`url(${im.heroBg})`;document.querySelector("[data-line]").href=d.contact.lineUrl;document.querySelector("[data-phone]").href="tel:"+d.contact.phone.replace(/[^\d]/g,"");document.querySelectorAll("[data-social]").forEach(a=>{a.href=d.contact[a.dataset.social]||"#";a.target="_blank"});document.querySelector("[data-field=lineId]").textContent=d.contactFields?.lineId?.value||d.contact.lineId||"";heroPoints.innerHTML=d.hero.points.map(x=>`<span>${x}</span>`).join("");serviceGrid.innerHTML=d.services.map(s=>`<article class="service-card"><div class="icon" style="font-size:38px">${icon(s.icon)}</div><h3>${s.title}</h3><p>${s.text}</p><button data-scroll="${s.target}">了解更多 →</button></article>`).join("");industryGrid.innerHTML=d.industries.map((s,i)=>`<article class="industry-card"><img src="${imgVal("industry"+i,s.image)}"><div><h3>${s.title}</h3><p>${s.subtitle}</p></div></article>`).join("");solutionGrid.innerHTML=d.solutions.map(s=>`<article class="solution-card"><h3>${s.title}</h3><p>${s.text}</p></article>`).join("");statsGrid.innerHTML=d.stats.map(s=>`<div class="stat"><strong>${s.number}</strong><span>${s.label}</span></div>`).join("");shippingGrid.innerHTML=d.shipping.map((s,i)=>`<div class="ship"><div class="circle">${i+1}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join("");Object.keys(d.details).forEach(id=>{let x=d.details[id],el=document.getElementById(id);if(el)el.innerHTML=`<div class="container"><div><span class="blue-tag">${x.title}</span><h2>${x.headline}</h2><p>${x.text}</p></div><ul>${x.items.map(y=>`<li>${y}</li>`).join("")}</ul></div>`});renderFooter(d);renderCases(d);renderPartners(d);renderNews(d);renderFAQ(d);renderEditEntry(d);applySocialVisibility(d);bind()}
function renderFooter(d){const f=d.contactFields||{};footerContactLines.innerHTML=Object.keys(f).filter(k=>f[k].show!==false).map(k=>`<div class="${k==="address"||k==="email"||k==="hours"?"wide":""}"><b>${f[k].label}</b><span>${f[k].value}</span></div>`).join("");document.querySelectorAll("[data-footer-block]").forEach(el=>{let k=el.dataset.footerBlock;el.style.display=d.footerVisibility?.[k]===false?"none":""})}
function renderCases(d){let conf=d.casesDisplay||{limit:4};let r=renderCards(d.cases,conf.limit||4,(c,i)=>`<article><img src="${imgVal("case"+i,c.image)}"><h3>${c.title}</h3><p>${c.subtitle||""}</p><p>${c.text||""}</p>${c.url?`<a href="${c.url}" target="_blank">前往查看</a>`:""}</article>`);caseGrid.innerHTML=r.shown;caseMoreWrap.innerHTML=r.more?`<button class="btn outline-blue" data-open-list="cases">顯示更多成功案例</button>`:""}
function renderPartners(d){partners.style.display=d.partnersDisplay?.visible===false?"none":"";let conf=d.partnersDisplay||{limit:4};let r=renderCards(d.partners,conf.limit||4,(p,i)=>`<article class="partner-card"><img src="${imgVal("partner"+i,p.image)}"><div class="partner-body"><h3>${p.companyName}</h3><p>${p.description||""}</p><p>電話：${p.phone||""}</p><div class="partner-links">${p.websiteUrl?`<a href="${p.websiteUrl}" target="_blank">形象網站</a>`:""}${p.lineUrl?`<a href="${p.lineUrl}" target="_blank">LINE</a>`:""}${p.facebookUrl?`<a href="${p.facebookUrl}" target="_blank">粉專</a>`:""}</div></div></article>`);partnerGrid.innerHTML=r.shown;partnerMoreWrap.innerHTML=r.more?`<button class="btn outline-blue" data-open-list="partners">顯示更多關係企業</button>`:""}
function renderNews(d){news.style.display=d.newsDisplay?.visible===false?"none":"";let conf=d.newsDisplay||{limit:3};let all=publishedNews(d.news);let shown=all.slice(0,conf.limit||3);newsGrid.innerHTML=shown.map((n,i)=>`<article class="${n.pinned?"pinned-news":""}"><div class="news-meta">${n.pinned?`<span class="pin-badge">置頂</span>`:""}${n.publishDate?`<time>${n.publishDate}</time>`:""}</div><h3>${n.title}</h3><p>${n.subtitle||""}</p><p>${n.text||""}</p>${renderNewsExtras(n)}</article>`).join("");newsMoreWrap.innerHTML=all.length>(conf.limit||3)?`<button class="btn outline-blue" data-open-list="news">顯示更多最新消息</button>`:""}
function renderFAQ(d){faq.style.display=d.faqDisplay?.visible===false?"none":"";let vis=visibleItems(d.faqs),limit=d.faqDisplay?.limit||6;faqGrid.innerHTML=vis.slice(0,limit).map(f=>`<div class="faq-item"><div class="faq-q">${f.q}<span>＋</span></div><div class="faq-a">${f.a}</div></div>`).join("");faqMoreWrap.innerHTML=vis.length>limit?`<button class="btn outline-blue" data-open-list="faqs">顯示更多 QA</button>`:""}
function renderEditEntry(d){let a=adminEditEntry,c=d.editEntry||{};a.textContent=c.icon||"✎";a.title=c.title||"網站後台";a.className="admin-edit-entry";if(c.show===false)a.classList.add("hide");if(c.position)a.classList.add(c.position)}
function openList(type){const d=getData();let title="",body="";if(type==="cases"){title=d.casesTitle;body=visibleItems(d.cases).map((c,i)=>`<article class="modal-card"><img src="${imgVal("case"+i,c.image)}"><div><h3>${c.title}</h3><p>${c.subtitle||""}</p><p>${c.text||""}</p>${c.url?`<a href="${c.url}" target="_blank">前往查看</a>`:""}</div></article>`).join("")}if(type==="partners"){title=d.partnersTitle;body=visibleItems(d.partners).map((p,i)=>`<article class="modal-card"><img src="${imgVal("partner"+i,p.image)}"><div><h3>${p.companyName}</h3><p>${p.description||""}</p><p>電話：${p.phone||""}</p>${p.websiteUrl?`<a href="${p.websiteUrl}" target="_blank">形象網站</a>`:""}</div></article>`).join("")}if(type==="news"){title=d.newsTitle;body=publishedNews(d.news).map((n,i)=>`<article class="modal-card ${n.pinned?"pinned-news":""}"><div><div class="news-meta">${n.pinned?`<span class="pin-badge">置頂</span>`:""}${n.publishDate?`<time>${n.publishDate}</time>`:""}</div><h3>${n.title}</h3><p>${n.subtitle||""}</p><p>${n.text||""}</p>${renderNewsExtras(n)}</div></article>`).join("")}if(type==="faqs"){title=d.faqTitle;body=visibleItems(d.faqs).map(f=>`<div class="faq-item open"><div class="faq-q">${f.q}</div><div class="faq-a">${f.a}</div></div>`).join("")}contentModalTitle.textContent=title;contentModalBody.innerHTML=`<div class="${type==='faqs'?'faq-grid':'modal-list-grid'}">${body}</div>`;contentModal.classList.add("show");document.body.classList.add("modal-open")}
function bind(){document.querySelectorAll("[data-scroll]").forEach(e=>e.onclick=x=>{x.preventDefault();scrollToSection(e.dataset.scroll)});document.querySelectorAll(".faq-q").forEach(q=>q.onclick=()=>q.parentElement.classList.toggle("open"));document.querySelectorAll("[data-open-form]").forEach(e=>e.onclick=x=>{x.preventDefault();openForm()});document.querySelectorAll("[data-open-list]").forEach(e=>e.onclick=x=>{x.preventDefault();openList(e.dataset.openList)})}
function scrollToSection(id){let t=document.getElementById(id);if(!t)return;window.scrollTo({top:t.getBoundingClientRect().top+scrollY-86,behavior:"smooth"});menu.classList.remove("show")}mobileToggle.onclick=e=>{e.stopPropagation();menu.classList.toggle("show")};document.addEventListener("click",e=>{if(window.innerWidth<=760&&menu.classList.contains("show")){if(!menu.contains(e.target)&&e.target!==mobileToggle){menu.classList.remove("show")}}});function openForm(){leadModal.classList.add("show");document.body.classList.add("modal-open");formStatus.textContent=""}function closeForm(){leadModal.classList.remove("show");document.body.classList.remove("modal-open")}document.querySelectorAll("[data-close-form]").forEach(e=>e.onclick=closeForm);document.querySelectorAll("[data-close-content]").forEach(e=>e.onclick=()=>{contentModal.classList.remove("show");document.body.classList.remove("modal-open")});pageUrl.value=location.href;if(document.getElementById("notifyEmail"))notifyEmail.value=(getData().formConfig&&getData().formConfig.notifyEmail)||"";leadForm.onsubmit=async e=>{e.preventDefault();const d=getData(),url=d.formConfig?.googleScriptUrl||GOOGLE_SCRIPT_URL;if(notifyEmail)notifyEmail.value=d.formConfig?.notifyEmail||"";if(!url||url.includes("請貼上")){formStatus.textContent="尚未設定 Google Apps Script URL。";formStatus.className="err";return}let btn=leadForm.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="送出中...";let send=Object.fromEntries(new FormData(leadForm).entries());send.createdAt=new Date().toLocaleString("zh-TW",{hour12:false});try{await fetch(url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(send)});formStatus.textContent="已送出，我們會盡快與您聯絡！";formStatus.className="ok";leadForm.reset();setTimeout(closeForm,1200)}catch(err){formStatus.textContent="送出失敗。";formStatus.className="err"}finally{btn.disabled=false;btn.textContent="送出表單"}};apply();initSearch();setTimeout(syncFromCloudAndApply,100);

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
  const lineUrl=a.lineJoinUrl||(d.contact&&d.contact.lineUrl)||"https://line.me/ti/p/@905dqqqw";
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
           "https://line.me/R/ti/p/@905dqqqw";
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

async function syncFromCloudAndApply(){
  const d = getData();
  const url = d.formConfig?.googleScriptUrl || GOOGLE_SCRIPT_URL;
  if(url && !url.includes("請貼上")){
    try {
      const res = await fetch(url);
      const cloud = await res.json();
      let updated = false;
      if(cloud && cloud.data){
        const cloudStr = JSON.stringify(cloud.data);
        const localStr = localStorage.getItem(DATA_KEY);
        if(cloudStr !== localStr){
          localStorage.setItem(DATA_KEY, cloudStr);
          updated = true;
        }
      }
      if(cloud && cloud.images){
        const cloudImgStr = JSON.stringify(cloud.images);
        const localImgStr = localStorage.getItem(IMG_KEY);
        if(cloudImgStr !== localImgStr){
          localStorage.setItem(IMG_KEY, cloudImgStr);
          updated = true;
        }
      }
      if(updated){
        console.log("檢測到線上資料有更新，重新渲染頁面...");
        apply();
        if(window.ccV16Enhance) ccV16Enhance();
        if(window.ccV17FloatingFollow) ccV17FloatingFollow();
        if(window.applySocialVisibility009) applySocialVisibility009(getData());
        if(window.applySocialIconVisibilityV19) applySocialIconVisibilityV19(getData());
      }
    } catch(e) {
      console.warn("同步線上資料失敗，使用本地快取", e);
    }
  }
}

function initSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  if (!input || !btn) return;
  
  function doSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    
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
    contentModalTitle.textContent = `搜尋結果: 『${input.value}』`;
    if (results.length === 0) {
      contentModalBody.innerHTML = `<div style="padding: 24px; text-align: center; color: #475569; font-size: 16px;">沒有找到與『${input.value}』相符的項目，請換個關鍵字試試。</div>`;
    } else {
      let html = `<div class="search-results-list" style="display:flex; flex-direction:column; gap:20px; color:#1e293b;">`;
      results.forEach(cat => {
        html += `
          <div style="border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
            <h3 style="color:#2d9cff; margin:0 0 10px 0; font-size:18px; border-left:4px solid #2d9cff; padding-left:8px;">${cat.category}</h3>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${cat.items.map(it => `
                <div class="search-result-item" style="padding:8px; border-radius:6px; background:#f8fafc; transition:background 0.2s; cursor:pointer;" onclick="closeSearchAndNavigate('${it.target}', '${it.url || ''}')">
                  <strong style="display:block; font-size:15px; color:#0f172a;">${it.title}</strong>
                  <span style="font-size:13px; color:#475569; display:block; margin-top:2px;">${it.desc}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      });
      html += `</div>`;
      contentModalBody.innerHTML = html;
    }
    
    contentModal.classList.add("show");
    document.body.classList.add("modal-open");
  }
  
  btn.onclick = (e) => { e.preventDefault(); doSearch(); };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });
}

function closeSearchAndNavigate(target, url) {
  contentModal.classList.remove("show");
  document.body.classList.remove("modal-open");
  
  if (url && url !== "index.html" && !url.includes("index.html")) {
    window.open(url, "_blank");
    return;
  }
  
  if (target) {
    scrollToSection(target);
  }
}

window.closeSearchAndNavigate = closeSearchAndNavigate;
window.initSearch = initSearch;
