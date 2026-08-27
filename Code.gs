/**
 * 誠創科技 V27 基準版
 * GitHub Pages × Google 試算表後台 API
 *
 * 同一份試算表三個頁籤：
 * - 最新消息
 * - 客戶表單
 * - 常見問題
 *
 * 後台管理：
 * - 最新消息：讀取 / 新增 / 修改 / 刪除 / 啟用停用
 * - 客戶表單：讀取 / 標記已讀 / 更新處理狀態 / 刪除
 * - 常見問題：讀取 / 新增 / 修改 / 刪除 / 啟用停用 / 排序
 */

const TABS = {
  news: '最新消息',
  inquiries: '客戶表單',
  faq: '常見問題'
};

function doGet(e) {
  try {
    ensureSheets_();
    const action = (e && e.parameter && e.parameter.action) || 'ping';

    if (action === 'ping') {
      return json_({
        ok: true,
        service: 'ChengChuang Google Sheets API',
        tabs: TABS
      });
    }

    if (action === 'news' || action === 'adminNews') {
      return json_({ ok: true, data: readNews_(action === 'adminNews') });
    }

    if (action === 'faq' || action === 'adminFaq') {
      return json_({ ok: true, data: readFaq_(action === 'adminFaq') });
    }

    if (action === 'inquiries') {
      return json_({ ok: true, data: readInquiries_() });
    }

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    ensureSheets_();

    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || '';
    const data = body.data || {};

    if (action === 'submitInquiry') return json_(saveInquiry_(data));

    if (action === 'saveNews') return json_(upsertNews_(data));
    if (action === 'deleteNews') return json_(deleteById_(TABS.news, data.id));

    if (action === 'saveFaq') return json_(upsertFaq_(data));
    if (action === 'deleteFaq') return json_(deleteById_(TABS.faq, data.id));

    if (action === 'updateInquiry') return json_(updateInquiry_(data));
    if (action === 'deleteInquiry') return json_(deleteById_(TABS.inquiries, data.id));

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(
    ss,
    TABS.news,
    ['ID','發布日期','月日','標題','內容','啟用','更新時間']
  );

  ensureSheet_(
    ss,
    TABS.inquiries,
    ['編號','提交時間','店名','聯絡人','聯絡電話','LINE ID','Email','營業狀態','需求','備註','讀取狀態','處理狀態']
  );

  ensureSheet_(
    ss,
    TABS.faq,
    ['ID','排序','問題','答案','啟用','更新時間']
  );
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  }
  return sh;
}

function saveInquiry_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.inquiries);
  const now = new Date();
  const id = Utilities.formatDate(now, Session.getScriptTimeZone(), "'Q'yyyyMMddHHmmss");

  sh.appendRow([
    id,
    now,
    data.storeName || '',
    data.contactName || '',
    data.phone || '',
    data.line || '',
    data.email || '',
    data.businessStatus || '',
    data.service || '',
    data.note || '',
    '未讀',
    '未處理'
  ]);

  return { ok: true, id: id };
}

function readInquiries_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.inquiries);
  if (sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,12).getValues();
  return rows.map(r => ({
    id: String(r[0] || ''),
    submittedAt: dateTimeText_(r[1]),
    storeName: String(r[2] || ''),
    contactName: String(r[3] || ''),
    phone: String(r[4] || ''),
    line: String(r[5] || ''),
    email: String(r[6] || ''),
    businessStatus: String(r[7] || ''),
    service: String(r[8] || ''),
    note: String(r[9] || ''),
    readStatus: String(r[10] || '未讀'),
    processStatus: String(r[11] || '未處理')
  })).sort((a,b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

function updateInquiry_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.inquiries);
  const row = findRowById_(sh, data.id);
  if (!row) return { ok: false, error: 'not_found' };

  if (data.readStatus !== undefined) sh.getRange(row,11).setValue(data.readStatus);
  if (data.processStatus !== undefined) sh.getRange(row,12).setValue(data.processStatus);

  return { ok: true, id: data.id };
}

function readNews_(includeDisabled) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.news);
  if (sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,7).getValues();

  return rows
    .map(r => ({
      id: String(r[0] || ''),
      fullDate: dateText_(r[1]),
      date: String(r[2] || ''),
      title: String(r[3] || ''),
      body: String(r[4] || ''),
      enabled: normalizeBool_(r[5]),
      updatedAt: dateTimeText_(r[6])
    }))
    .filter(x => includeDisabled || x.enabled)
    .filter(x => x.title)
    .sort((a,b) => String(b.fullDate).localeCompare(String(a.fullDate)));
}

function upsertNews_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.news);
  const now = new Date();
  const id = data.id || Utilities.getUuid();
  const row = data.id ? findRowById_(sh, data.id) : 0;

  const values = [[
    id,
    data.fullDate || '',
    data.date || '',
    data.title || '',
    data.body || '',
    data.enabled !== false,
    now
  ]];

  if (row) sh.getRange(row,1,1,7).setValues(values);
  else sh.appendRow(values[0]);

  return { ok: true, id: id };
}

function readFaq_(includeDisabled) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.faq);
  if (sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,6).getValues();

  return rows
    .map(r => ({
      id: String(r[0] || ''),
      order: Number(r[1] || 0),
      q: String(r[2] || ''),
      a: String(r[3] || ''),
      enabled: normalizeBool_(r[4]),
      updatedAt: dateTimeText_(r[5])
    }))
    .filter(x => includeDisabled || x.enabled)
    .filter(x => x.q)
    .sort((a,b) => a.order - b.order);
}

function upsertFaq_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.faq);
  const now = new Date();
  const id = data.id || Utilities.getUuid();
  const row = data.id ? findRowById_(sh, data.id) : 0;

  const values = [[
    id,
    Number(data.order || 0),
    data.q || '',
    data.a || '',
    data.enabled !== false,
    now
  ]];

  if (row) sh.getRange(row,1,1,6).setValues(values);
  else sh.appendRow(values[0]);

  return { ok: true, id: id };
}

function deleteById_(sheetName, id) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const row = findRowById_(sh, id);
  if (!row) return { ok: false, error: 'not_found' };
  sh.deleteRow(row);
  return { ok: true, id: id };
}

function findRowById_(sh, id) {
  if (!id || sh.getLastRow() <= 1) return 0;
  const values = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
  for (let i=0; i<values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function normalizeBool_(value) {
  if (value === true) return true;
  if (value === false) return false;
  const s = String(value).toLowerCase().trim();
  return !['false','0','否','停用','關閉',''].includes(s);
}

function dateText_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function dateTimeText_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value);
}


/**
 * 第一次設定時執行：
 * 1. 建立三個頁籤
 * 2. 如果「最新消息」與「常見問題」只有標題列，則寫入 V27 預設資料
 *
 * 已有資料時不會重複匯入。
 */
function setup() {
  ensureSheets_();
  seedDefaultContent_();
}

function seedDefaultContent_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const newsSh = ss.getSheetByName(TABS.news);
  if (newsSh.getLastRow() <= 1) {
    const now = new Date();
    const rows = [
      ['NEWS-20260827','2026-08-27','08.27','誠創科技形象網站新版正式上線','全新網站提供 POS、電子發票、雲端服務、網站設計與客製系統，並持續補充教學與最新公告。',true,now],
      ['NEWS-20260820','2026-08-20','08.20','系統與服務內容持續更新中','持續整理服務說明、網站內容與相關支援資訊。',true,now],
      ['NEWS-20260815','2026-08-15','08.15','新增設備與耗材說明專區','新增 POS 周邊設備與紙捲耗材相關介紹。',true,now],
      ['NEWS-20260808','2026-08-08','08.08','雲端串接與多店管理方案更新','提供多店營運、雲端看帳與資料串接規劃。',true,now],
      ['NEWS-20260730','2026-07-30','07.30','POS 導入流程與交機服務更新','補充 POS 導入、備貨、安裝與交機服務流程。',true,now],
      ['NEWS-20260715','2026-07-15','07.15','企業系統客製與流程自動化服務開放諮詢','提供企業流程、系統整合與自動化需求諮詢。',true,now]
    ];
    newsSh.getRange(2,1,rows.length,7).setValues(rows);
  }

  const faqSh = ss.getSheetByName(TABS.faq);
  if (faqSh.getLastRow() <= 1) {
    const now = new Date();
    const rows = [
      ['FAQ-001',1,'誠創科技主要提供哪些服務？','提供 POS 系統、電子發票、多元支付、網站設計、客製化系統與雲端服務等。',true,now],
      ['FAQ-002',2,'POS 系統可以依店家需求調整嗎？','可以，會依餐飲、零售、美食街、商圈等不同營運方式規劃適合的功能與設備。',true,now],
      ['FAQ-003',3,'可以協助電子發票申請與設定嗎？','可以，可依實際需求協助電子發票相關申請、設備與系統串接規劃。',true,now],
      ['FAQ-004',4,'網站可以支援手機和平板嗎？','可以，網站會採 RWD 響應式設計，讓桌機、平板與手機都能正常瀏覽。',true,now],
      ['FAQ-005',5,'設備安裝後有售後服務嗎？','有，可依設備與服務內容提供後續客服、遠端協助與相關支援。',true,now],
      ['FAQ-006',6,'可以只購買設備或耗材嗎？','可以，可依需求購買 POS 周邊設備、紙捲、標籤與相關耗材。',true,now],
      ['FAQ-007',7,'如何提出網站或系統客製需求？','可透過網站諮詢表單留下需求，我們會再依功能、流程與預算進一步討論。',true,now]
    ];
    faqSh.getRange(2,1,rows.length,6).setValues(rows);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
