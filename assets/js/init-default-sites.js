// init-default-sites.js — CMS V1
// 一鍵建立 chtech / ihome 預設 Firebase 資料
import { db, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from './firebase-config.js';

const BILLING = id => ({ siteId:id, createdAt:serverTimestamp(), activatedAt:null, expiredAt:null, nextBillingAt:null, reminderDays:14, bufferDays:7, autoSuspend:true, status:'active' });
const MODULES = { hero:{enabled:true,sort:1}, services:{enabled:true,sort:2}, partners:{enabled:true,sort:3}, news:{enabled:true,sort:4}, faq:{enabled:true,sort:5}, shippingFlow:{enabled:true,sort:6}, contactForm:{enabled:true,sort:7}, cases:{enabled:false,sort:8}, pos:{enabled:false,locked:true}, delivery:{enabled:false,locked:true}, invoice:{enabled:false,locked:true}, ordering:{enabled:false,locked:true} };

const CHTECH_INFO = { companyName:'誠創科技有限公司', companyNameEn:'CH Tech Co., Ltd.', phone:'04-XXXXXXXX', email:'info@chtech.com.tw', address:'台中市XX區XX路X號', taxId:'12345678', about:'誠創科技專注於提供客製化科技解決方案。', footerCopy:'© 2025 誠創科技 All Rights Reserved.', logoPrimary:'/assets/sites/chtech/logo/logo-primary.webp', logoLight:'/assets/sites/chtech/logo/logo-light.webp', lineUrl:'', lineQr:'/assets/sites/chtech/qrcode/line-qr.webp', fbUrl:'', igUrl:'', seoTitle:'誠創科技 | 您的數位轉型夥伴', seoDescription:'誠創科技提供網站建置、系統開發、數位行销等服務。' };
const IHOME_INFO  = { companyName:'愛家居設計', companyNameEn:'iHome Design', phone:'04-XXXXXXXX', email:'info@ihome-design.com.tw', address:'台中市XX區XX路X號', taxId:'', about:'愛家居設計專注於室內設計與空間規劃。', footerCopy:'© 2025 愛家居設計 All Rights Reserved.', logoPrimary:'/assets/sites/ihome/logo/logo-primary.webp', logoLight:'/assets/sites/ihome/logo/logo-light.webp', lineUrl:'', lineQr:'/assets/sites/ihome/qrcode/line-qr.webp', fbUrl:'', igUrl:'', seoTitle:'愛家居設計 | 讓家更美好', seoDescription:'愛家居設計提供全方位室內設計服務。' };

const CHTECH_SVC = [{title:'網站建置',desc:'客製化形象網站，RWD響應式設計',icon:'🌐',image:'/assets/sites/chtech/service/service-01.webp',sort:1,visible:true,status:'active'},{title:'系統開發',desc:'ERP、CRM、POS 等企業系統開發',icon:'⚙️',image:'/assets/sites/chtech/service/service-02.webp',sort:2,visible:true,status:'active'},{title:'數位行销',desc:'SEO 屄化、社群經營、廣告投放',icon:'📣',image:'/assets/sites/chtech/service/service-03.webp',sort:3,visible:true,status:'active'},{title:'雲端部署',desc:'Firebase、AWS、GCP 雲端架構規劃',icon:'☁️',image:'/assets/sites/chtech/service/service-04.webp',sort:4,visible:true,status:'active'}];
const IHOME_SVC  = [{title:'空間設計',desc:'住宅、商業空間全方位設計規劃',icon:'🏠',image:'/assets/sites/ihome/service/service-01.webp',sort:1,visible:true,status:'active'},{title:'施工監管',desc:'專業監工，品質保障',icon:'🔨',image:'/assets/sites/ihome/service/service-02.webp',sort:2,visible:true,status:'active'},{title:'軟裝搭配',desc:'家具、燈光、布艺整體規劃',icon:'🛋️',image:'/assets/sites/ihome/service/service-03.webp',sort:3,visible:true,status:'active'}];
const CHTECH_NEWS = [{title:'誠創科技正式推出 CMS V1 管理系統',summary:'全新後台管理系統上線。',date:'2025-01-01',category:'公告',image:'',url:'#',sort:1,visible:true,status:'active'}];
const IHOME_NEWS  = [{title:'愛家居設計全新官網上線',summary:'焫然一新的官網，帶來更好的瀏覽體驗。',date:'2025-01-01',category:'公告',image:'',url:'#',sort:1,visible:true,status:'active'}];
const CHTECH_FAQ = [{question:'POS 系統可以整合電子發票嗎？',answer:'可以，可規劃電子發票、載具、統編與列印流程。',sort:1,visible:true},{question:'費用如何計算？',answer:'依功能需求報價，歡迎聯繫我們免費談詢。',sort:2,visible:true}];
const IHOME_FAQ  = [{question:'設計流程是什麼？',answer:'談詢→量測→設計提案→確認→施工→完工驗收。',sort:1,visible:true}];
const CHTECH_SHIP = [{title:'確認報價單',icon:'📋',desc:'正確下載回簽',sort:1,visible:true},{title:'匯款 50% 訂金',icon:'💳',desc:'提供後五碼核對',sort:2,visible:true},{title:'提供菜單建置',icon:'📝',desc:'提供菜單或商品表',sort:3,visible:true},{title:'線上資訊表登記',icon:'📱',desc:'收件人/電話/地址',sort:4,visible:true},{title:'安排設備出貨',icon:'📦',desc:'約需 3~4 個工作日',sort:5,visible:true},{title:'貨到付款',icon:'🚚',desc:'物流公司收取尾款',sort:6,visible:true},{title:'新機檢查安裝',icon:'🔧',desc:'通知客服設定',sort:7,visible:true},{title:'線上註冊',icon:'👍',desc:'啟用商品保固',sort:8,visible:true},{title:'預約教學',icon:'🎓',desc:'遠端線上教學',sort:9,visible:true}];
const FORM = [{name:'姓名',type:'text',required:true,visible:true,sort:1,placeholder:'請輸入您的姓名'},{name:'電話',type:'phone',required:true,visible:true,sort:2,placeholder:'請輸入聯絡電話'},{name:'Email',type:'email',required:false,visible:true,sort:3,placeholder:'example@mail.com'},{name:'詢問內容',type:'textarea',required:true,visible:true,sort:4,placeholder:'請輸入您想詢問的內容'}];

async function safeSet(ref, data) {
  const snap = await getDoc(ref);
  if (snap.exists()) return false;
  await setDoc(ref, { ...data, _createdAt: serverTimestamp() });
  return true;
}

async function addItems(siteId, col, items) {
  for (const i of items) await addDoc(collection(db,'sites',siteId,col), { ...i, _createdAt:serverTimestamp() });
}

export async function initDefaultSites(log = console.log) {
  for (const [id, info, svc, news, faq, ship, partners] of [
    ['chtech', CHTECH_INFO, CHTECH_SVC, CHTECH_NEWS, CHTECH_FAQ, CHTECH_SHIP, [{name:'誠創科技',image:'/assets/sites/chtech/partner/partner-01.webp',url:'#',description:'POS系統解決方案',sort:1,visible:true}]],
    ['ihome',  IHOME_INFO,  IHOME_SVC,  IHOME_NEWS,  IHOME_FAQ,  null, null]
  ]) {
    log('⌛ 初始化站台：' + id);
    await safeSet(doc(db,'sites',id,'siteInfo','main'), info) ? log('  ✅ siteInfo') : log('  ⚠️ siteInfo 已存在');
    await safeSet(doc(db,'sites',id,'hero','main'), { title:id==='chtech'?'誠創科技 您的數位轉型夥伴':'愛家居設計 讓家更美好', subtitle:id==='chtech'?'專業・可靠・創新':'專業設計 溫馨空間', ctaText:'了解更多', ctaUrl:'#services', image:'/assets/sites/'+id+'/banner/banner-home-01.webp', visible:true }) ? log('  ✅ hero') : log('  ⚠️ hero 已存在');
    await safeSet(doc(db,'sites',id,'billing','main'), BILLING(id)) ? log('  ✅ billing') : log('  ⚠️ billing 已存在');
    await safeSet(doc(db,'sites',id,'modules','main'), MODULES) ? log('  ✅ modules') : log('  ⚠️ modules 已存在');
    await addItems(id,'services',svc); log('  ✅ services (' + svc.length + ')');
    await addItems(id,'news',news);    log('  ✅ news (' + news.length + ')');
    await addItems(id,'faq',faq);     log('  ✅ faq (' + faq.length + ')');
    await addItems(id,'formConfig',FORM); log('  ✅ formConfig');
    if (ship) { await addItems(id,'shippingFlow',ship); log('  ✅ shippingFlow'); }
    if (partners) { await addItems(id,'partners',partners); log('  ✅ partners'); }
    log('✅ ' + id + ' 完成');
  }
}
