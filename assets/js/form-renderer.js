// form-renderer.js — CMS V1
// 依照 Firebase sites/{siteId}/formConfig 自動產生前台表單
import { db, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from './firebase-config.js';
import { siteId } from './cms-loader.js';

const TYPES = {
  text: f => `${lbl(f)}<input class="cms-form-input" type="text" id="field-${f.id}" name="${f.id}" placeholder="${esc(f.placeholder||'')}" ${f.required?'required':''}>`,
  phone: f => `${lbl(f)}<input class="cms-form-input" type="tel" id="field-${f.id}" name="${f.id}" placeholder="${esc(f.placeholder||'例：0912345678')}" ${f.required?'required':''}>`,
  email: f => `${lbl(f)}<input class="cms-form-input" type="email" id="field-${f.id}" name="${f.id}" placeholder="${esc(f.placeholder||'example@mail.com')}" ${f.required?'required':''}>`,
  date: f => `${lbl(f)}<input class="cms-form-input" type="date" id="field-${f.id}" name="${f.id}" ${f.required?'required':''}>`,
  time: f => `${lbl(f)}<input class="cms-form-input" type="time" id="field-${f.id}" name="${f.id}" ${f.required?'required':''}>`,
  select: f => `${lbl(f)}<select class="cms-form-input" id="field-${f.id}" name="${f.id}" ${f.required?'required':''}><option value="">請選擇</option>${(f.options||[]).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`,
  radio: f => `<fieldset><legend>${esc(f.name)}${f.required?'<span class=cms-form-req>*</span>':''}</legend>${(f.options||[]).map((o,i)=>`<label class=cms-form-radio><input type=radio name="${f.id}" value="${esc(o)}" ${f.required&&i===0?'required':''}>${esc(o)}</label>`).join('')}</fieldset>`,
  checkbox: f => `<fieldset><legend>${esc(f.name)}</legend>${(f.options||[]).map(o=>`<label class=cms-form-checkbox><input type=checkbox name="${f.id}" value="${esc(o)}">${esc(o)}</label>`).join('')}</fieldset>`,
  textarea: f => `${lbl(f)}<textarea class="cms-form-input cms-form-textarea" id="field-${f.id}" name="${f.id}" rows="4" placeholder="${esc(f.placeholder||'')}" ${f.required?'required':''}></textarea>`,
  address: f => `${lbl(f)}<input class="cms-form-input" type="text" id="field-${f.id}" name="${f.id}" placeholder="${esc(f.placeholder||'')}" ${f.required?'required':''}>`
};

const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const lbl = f => `<label class="cms-form-label" for="field-${f.id}">${esc(f.name)}${f.required?'<span class="cms-form-req">*</span>':''}</label>`;

async function renderForm(sel = '[data-cms="contact-form"]') {
  const wrap = document.querySelector(sel); if (!wrap) return;
  try {
    const q = query(collection(db,'sites',siteId,'formConfig'), orderBy('sort','asc'));
    const snap = await getDocs(q);
    const fields = snap.docs.map(d=>({id:d.id,...d.data()})).filter(f=>f.visible!==false);
    if (!fields.length) { wrap.innerHTML='<p class="cms-form-empty">尚未設定表單欄位</p>'; return; }
    wrap.innerHTML = `<form id="cms-contact-form" novalidate>
      ${fields.map(f=>`<div class="cms-form-group">${(TYPES[f.type]||TYPES.text)(f)}</div>`).join('')}
      <div class="cms-form-group"><button type="submit" id="cms-form-submit" class="cms-btn">送出</button></div>
      <div id="cms-form-msg" class="cms-form-msg" aria-live="polite"></div>
    </form>`;
    document.getElementById('cms-contact-form').addEventListener('submit', handleSubmit);
  } catch(e) { wrap.innerHTML='<p>表單載入失敗</p>'; console.error(e); }
}

async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('cms-form-submit');
  const msg = document.getElementById('cms-form-msg');
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  btn.disabled=true; btn.textContent='處理中...'; msg.textContent=''; msg.className='cms-form-msg';
  const data = { submittedAt: serverTimestamp(), siteId };
  for (const [k,v] of new FormData(e.target).entries()) {
    data[k] = data[k] ? (Array.isArray(data[k])?[...data[k],v]:[data[k],v]) : v;
  }
  try {
    await addDoc(collection(db,'sites',siteId,'formSubmissions'), data);
    btn.textContent='✓ 送出成功'; btn.style.background='#22c55e';
    msg.className='cms-form-msg cms-form-msg--success';
    msg.textContent='感謝您的填寫，我們將盡快與您聯繫！';
    e.target.reset();
    setTimeout(()=>{ btn.disabled=false; btn.textContent='送出'; btn.style.background=''; }, 3000);
  } catch(err) {
    btn.disabled=false; btn.textContent='重新送出';
    msg.className='cms-form-msg cms-form-msg--error';
    msg.textContent='送出失敗：'+err.message;
  }
}

document.addEventListener('DOMContentLoaded', ()=>renderForm());
export { renderForm };
