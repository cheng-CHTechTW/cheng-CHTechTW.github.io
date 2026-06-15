// ============================================================
// cms-loader.js — 誠創科技 CMS V1
// 前台自動從 Firebase 讀取資料並更新頁面
// ============================================================

import { db, doc, getDoc, collection, getDocs, query, orderBy, limit }
  from './firebase-config.js';

const siteId = document.body.dataset.siteId;
if (!siteId) console.warn('[CMS] 找不到 data-site-id');

const siteRef = (path) => doc(db, 'sites', siteId, ...path.split('/'));
const colRef  = (path) => collection(db, 'sites', siteId, path);

async function fetchDoc(path) {
  try { const snap = await getDoc(siteRef(path)); return snap.exists() ? snap.data() : null; }
  catch (e) { console.warn('[CMS] fetchDoc failed', path, e); return null; }
}

async function fetchCol(path, orderField = 'sort', dir = 'asc') {
  try { const q = query(colRef(path), orderBy(orderField, dir)); const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (e) { console.warn('[CMS] fetchCol failed', path, e); return []; }
}

const isVisible = (item) => item.visible !== false && (item.value || item.title || item.name);

function setText(sel, val) { document.querySelectorAll(sel).forEach(el => { if(val) el.textContent = val; }); }
function setImg(sel, src, alt='') { document.querySelectorAll(sel).forEach(el => { if(src){el.src=src;if(alt)el.alt=alt;} }); }
function setAttr(sel, attr, val) { document.querySelectorAll(sel).forEach(el => { if(val) el.setAttribute(attr,val); }); }

async function loadSiteInfo() {
  const d = await fetchDoc('siteInfo'); if(!d) return;
  setText('[data-cms="company-name"]', d.companyName); setText('[data-cms="company-name-en"]', d.companyNameEn);
  setText('[data-cms="phone"]', d.phone); setText('[data-cms="email"]', d.email);
  setText('[data-cms="address"]', d.address); setText('[data-cms="about"]', d.about);
  setText('[data-cms="footer-copy"]', d.footerCopy);
  setAttr('[data-cms="phone-link"]','href', d.phone?`tel:${d.phone}`:null);
  setAttr('[data-cms="email-link"]','href', d.email?`mailto:${d.email}`:null);
  setAttr('[data-cms="line-link"]','href', d.lineUrl); setAttr('[data-cms="fb-link"]','href',d.fbUrl);
  setImg('[data-cms="logo-primary"]', d.logoPrimary, d.companyName);
  setImg('[data-cms="logo-light"]', d.logoLight, d.companyName);
  setImg('[data-cms="line-qr"]', d.lineQr);
  if(d.seoTitle) document.title=d.seoTitle;
  if(d.seoDescription) setAttr('meta[name="description"]','content',d.seoDescription);
}

async function loadHero() {
  const d = await fetchDoc('hero'); if(!d) return;
  setText('[data-cms="hero-title"]',d.title); setText('[data-cms="hero-subtitle"]',d.subtitle);
  setText('[data-cms="hero-cta"]',d.ctaText); setAttr('[data-cms="hero-cta-link"]','href',d.ctaUrl);
  if(d.image) setImg('[data-cms="hero-img"]',d.image,d.title);
}

async function loadServices() {
  const items = await fetchCol('services'); const vis = items.filter(isVisible);
  const c = document.querySelector('[data-cms="services-grid"]'); if(!c||!vis.length) return;
  c.innerHTML = vis.map(i=>`<div class="cms-service-card">${i.image?`<img src="${i.image}" alt="${i.title||''}" style="width:100%;aspect-ratio:16/9;object-fit:cover">`:''}${i.title?`<h3>${i.title}</h3>`:''}${i.description?`<p>${i.description}</p>`:''}</div>`).join('');
}

async function loadPartners() {
  if(siteId!=='chtech') return;
  const items = await fetchCol('partners'); const vis = items.filter(isVisible);
  const c = document.querySelector('[data-cms="partners-grid"]'); if(!c||!vis.length) return;
  c.innerHTML = vis.map(i=>`<div class="cms-partner-item"><a href="${i.url||'#'}" target="_blank"><img src="${i.image}" alt="${i.name||''}"></a></div>`).join('');
}

async function loadNews(max=6) {
  const items = await fetchCol('news','date','desc');
  const vis = items.filter(isVisible).filter(n=>n.status==='active'||!n.status);
  const card = i=>`<article class="cms-news-card">${i.image?`<img src="${i.image}" alt="${i.title||''}" style="width:100%;aspect-ratio:16/9;object-fit:cover">`:''}${i.date?`<time>${i.date}</time>`:''} ${i.category?`<span>${i.category}</span>`:''}<h3>${i.title||''}</h3>${i.summary?`<p>${i.summary}</p>`:''}<a href="${i.url||'#'}">查看更多</a></article>`;
  const il = document.querySelector('[data-cms="news-list"]'); if(il) il.innerHTML=vis.slice(0,max).map(card).join('');
  const al = document.querySelector('[data-cms="news-all"]');  if(al) al.innerHTML=vis.map(card).join('');
}

async function loadFaq() {
  const items = await fetchCol('faq'); const vis = items.filter(isVisible);
  const c = document.querySelector('[data-cms="faq-list"]'); if(!c||!vis.length) return;
  c.innerHTML = vis.map(i=>`<div class="cms-faq-item"><button class="cms-faq-q" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden">${i.question||i.title}</button><div class="cms-faq-a" hidden><p>${i.answer||i.description||''}</p></div></div>`).join('');
}

async function loadShippingFlow() {
  if(siteId!=='chtech') return;
  const items = await fetchCol('shippingFlow'); const vis=items.filter(isVisible).sort((a,b)=>(a.sort||0)-(b.sort||0)).slice(0,9);
  const c = document.querySelector('[data-cms="shipping-grid"]'); if(!c||!vis.length) return;
  c.innerHTML = vis.map((i,idx)=>`<div class="cms-ship-cell" data-row="${Math.floor(idx/3)+1}" style="opacity:0;transform:translateY(20px);transition:opacity .4s,transform .4s">${i.icon?`<div>${i.icon}</div>`:''}${i.title?`<div>${i.title}</div>`:''}${i.description?`<small>${i.description}</small>`:''}</div>`).join('');
  const cells=c.querySelectorAll('.cms-ship-cell');
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){[1,2,3].forEach((r,ri)=>setTimeout(()=>{cells.forEach(cl=>{if(+cl.dataset.row===r){cl.style.opacity='1';cl.style.transform='none';}});},ri*400));io.disconnect();}});},{threshold:.2});
  io.observe(c);
}

async function loadCases() {
  if(siteId!=='ihome') return;
  const items = await fetchCol('cases'); const vis=items.filter(isVisible);
  const c=document.querySelector('[data-cms="cases-grid"]'); if(!c||!vis.length) return;
  c.innerHTML=vis.map(i=>`<div class="cms-case-card">${i.image?`<img src="${i.image}" alt="${i.title||''}">`:''}${i.title?`<h3>${i.title}</h3>`:''}</div>`).join('');
}

async function initCMS() {
  if(!siteId) return;
  console.log('[CMS] start:', siteId);
  await Promise.allSettled([loadSiteInfo(),loadHero(),loadServices(),loadPartners(),loadNews(),loadFaq(),loadShippingFlow(),loadCases()]);
  console.log('[CMS] done');
  document.dispatchEvent(new CustomEvent('cms:loaded',{detail:{siteId}}));
}

document.addEventListener('DOMContentLoaded', initCMS);
export { initCMS, fetchDoc, fetchCol, siteId };
