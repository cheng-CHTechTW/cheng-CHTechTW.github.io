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
    ['編號','提交時間','姓名/店名','電話','Email','LINE ID','需求項目','需求內容','讀取狀態','處理狀態']
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
    data.name || '',
    data.phone || '',
    data.email || '',
    data.line || '',
    data.service || '',
    data.message || '',
    '未讀',
    '未處理'
  ]);

  return { ok: true, id: id };
}

function readInquiries_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.inquiries);
  if (sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,10).getValues();
  return rows.map(r => ({
    id: String(r[0] || ''),
    submittedAt: dateTimeText_(r[1]),
    name: String(r[2] || ''),
    phone: String(r[3] || ''),
    email: String(r[4] || ''),
    line: String(r[5] || ''),
    service: String(r[6] || ''),
    message: String(r[7] || ''),
    readStatus: String(r[8] || '未讀'),
    processStatus: String(r[9] || '未處理')
  })).sort((a,b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

function updateInquiry_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.inquiries);
  const row = findRowById_(sh, data.id);
  if (!row) return { ok: false, error: 'not_found' };

  if (data.readStatus !== undefined) sh.getRange(row,9).setValue(data.readStatus);
  if (data.processStatus !== undefined) sh.getRange(row,10).setValue(data.processStatus);

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

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
