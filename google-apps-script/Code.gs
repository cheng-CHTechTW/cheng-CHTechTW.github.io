/**
 * 誠創科技網站 Google Sheets CMS + 管理後台驗證
 *
 * 公開 API：
 * - ping
 * - news
 * - faq
 * - submitInquiry
 * - adminLogin
 *
 * 管理 API（必須 Session Token）：
 * - adminSession
 * - adminNews / adminFaq / inquiries
 * - saveNews / deleteNews
 * - saveFaq / deleteFaq
 * - updateInquiry / deleteInquiry
 * - adminLogout
 *
 * 安全原則：
 * 1. 前端永遠不取得管理人員密碼或密碼雜湊。
 * 2. 密碼不寫入「驗證紀錄」，只寫 TRUE / FALSE。
 * 3. 管理員密碼使用 Salt + SHA-256 雜湊儲存。
 * 4. 管理資料 API 必須持有短期 Session Token。
 */

const TABS = {
  news: '最新消息',
  inquiries: '客戶表單',
  faq: '常見問題',
  company: '公司資訊',
  admins: '管理人員',
  permissions: '管理權限',
  authLog: '驗證紀錄'
};

const ADMIN_SESSION_SECONDS = 21600; // 6 小時

function doGet(e) {
  try {
    ensureSheets_();
    const p = (e && e.parameter) || {};
    const action = p.action || 'ping';

    if (action === 'ping') {
      return json_({
        ok: true,
        service: 'ChengChuang Google Sheets API',
        tabs: {
          news: TABS.news,
          inquiries: TABS.inquiries,
          faq: TABS.faq
        }
      });
    }

    if (action === 'news') {
      return json_({ ok: true, data: readNews_(false) });
    }

    if (action === 'faq') {
      return json_({ ok: true, data: readFaq_(false) });
    }

    if (action === 'adminSession') {
      const session = requireSession_(p.token);
      if (!session.ok) return json_(session);
      return json_({
        ok: true,
        profile: safeProfile_(session.profile)
      });
    }

    const session = requireSession_(p.token);
    if (!session.ok) return json_(session);

    if (action === 'adminNews') {
      if (!hasPermission_(session.profile,'news')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readNews_(true) });
    }

    if (action === 'adminFaq') {
      if (!hasPermission_(session.profile,'faq-admin')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readFaq_(true) });
    }

    if (action === 'inquiries') {
      if (!hasPermission_(session.profile,'forms')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readInquiries_() });
    }

    if (action === 'adminUsers') {
      if (!hasPermission_(session.profile,'admins')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readAdminUsersSafe_() });
    }

    if (action === 'companyInfo') {
      if (!hasPermission_(session.profile,'company')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readCompanyInfo_() });
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
    const token = body.token || data.token || '';

    if (action === 'submitInquiry') {
      return json_(saveInquiry_(data));
    }

    if (action === 'adminLogin') {
      return json_(adminLogin_(data));
    }

    if (action === 'adminLogout') {
      invalidateSession_(token);
      return json_({ ok: true });
    }

    const session = requireSession_(token);
    if (!session.ok) return json_(session);

    if (action === 'saveNews') { if(!hasPermission_(session.profile,'news')) return json_({ok:false,error:'forbidden'}); return json_(upsertNews_(data)); }
    if (action === 'deleteNews') { if(!hasPermission_(session.profile,'news')) return json_({ok:false,error:'forbidden'}); return json_(deleteById_(TABS.news, data.id)); }

    if (action === 'saveFaq') { if(!hasPermission_(session.profile,'faq-admin')) return json_({ok:false,error:'forbidden'}); return json_(upsertFaq_(data)); }
    if (action === 'deleteFaq') { if(!hasPermission_(session.profile,'faq-admin')) return json_({ok:false,error:'forbidden'}); return json_(deleteById_(TABS.faq, data.id)); }

    if (action === 'updateInquiry') { if(!hasPermission_(session.profile,'forms')) return json_({ok:false,error:'forbidden'}); return json_(updateInquiry_(data)); }
    if (action === 'deleteInquiry') { if(!hasPermission_(session.profile,'forms')) return json_({ok:false,error:'forbidden'}); return json_(deleteById_(TABS.inquiries, data.id)); }

    if (action === 'saveAdminUser') { if(!hasPermission_(session.profile,'admins')) return json_({ok:false,error:'forbidden'}); return json_(saveAdminUser_(data)); }
    if (action === 'deleteAdminUser') { if(!hasPermission_(session.profile,'admins')) return json_({ok:false,error:'forbidden'}); return json_(deleteAdminUser_(data)); }
    if (action === 'saveCompanyInfo') { if(!hasPermission_(session.profile,'company')) return json_({ok:false,error:'forbidden'}); return json_(saveCompanyInfo_(data)); }

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* =========================
 * Sheet initialization
 * ========================= */

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, TABS.news,
    ['ID','發布日期','月日','標題','內容','啟用','更新時間']);

  ensureSheet_(ss, TABS.inquiries,
    ['編號','提交時間','店名','聯絡人','聯絡電話','LINE ID','Email','營業狀態','需求','備註','讀取狀態','處理狀態']);

  ensureSheet_(ss, TABS.faq,
    ['ID','排序','問題','答案','啟用','更新時間']);

  ensureSheet_(ss, TABS.company,
    ['欄位代碼','欄位名稱','內容','公開','更新時間']);

  ensureSheet_(ss, TABS.admins,
    ['管理員ID','姓名','帳號','密碼鹽值','密碼雜湊','啟用','權限代碼','更新時間']);

  ensureSheet_(ss, TABS.permissions,
    ['權限代碼','權限名稱','dashboard','news','faq-admin','home','services','products','industries','forms','company','links','appearance','admins','system','更新時間']);

  ensureSheet_(ss, TABS.authLog,
    ['驗證時間','帳號','驗證結果','備註']);
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

function setup() {
  ensureSheets_();
  seedDefaultContent_();
  seedCompanyInfo_();
  seedPermissions_();
}

/* =========================
 * Admin authentication
 * ========================= */

function adminLogin_(data) {
  const username = String(data.username || '').trim();
  const password = String(data.password || '');

  if (!username || !password) {
    logAuth_(username, false, 'missing_credentials');
    return { ok: false, error: 'invalid_credentials' };
  }

  const admin = findAdminByUsername_(username);

  if (!admin || !admin.enabled) {
    logAuth_(username, false, 'not_found_or_disabled');
    Utilities.sleep(250);
    return { ok: false, error: 'invalid_credentials' };
  }

  const hash = passwordHash_(admin.salt, password);
  if (!constantTimeEqual_(hash, admin.passwordHash)) {
    logAuth_(username, false, 'password_mismatch');
    Utilities.sleep(250);
    return { ok: false, error: 'invalid_credentials' };
  }

  const permissions = permissionsForCode_(admin.permissionCode);
  const profile = {
    id: admin.id,
    name: admin.name,
    permissionCode: admin.permissionCode,
    permissions: permissions
  };

  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put(
    'ADMIN_SESSION_' + token,
    JSON.stringify(profile),
    ADMIN_SESSION_SECONDS
  );

  logAuth_(username, true, 'login_success');

  return {
    ok: true,
    token: token,
    expiresIn: ADMIN_SESSION_SECONDS,
    verified: true,
    profile: safeProfile_(profile)
  };
}

function requireSession_(token) {
  token = String(token || '').trim();
  if (!token) return { ok: false, error: 'unauthorized' };

  const cache = CacheService.getScriptCache();
  const raw = cache.get('ADMIN_SESSION_' + token);
  if (!raw) return { ok: false, error: 'session_expired' };

  try {
    const profile = JSON.parse(raw);
    cache.put(
      'ADMIN_SESSION_' + token,
      JSON.stringify(profile),
      ADMIN_SESSION_SECONDS
    );
    return { ok: true, profile: profile };
  } catch (err) {
    return { ok: false, error: 'session_expired' };
  }
}

function invalidateSession_(token) {
  token = String(token || '').trim();
  if (!token) return;
  CacheService.getScriptCache().remove('ADMIN_SESSION_' + token);
}

function hasPermission_(profile, permission) {
  return !!(profile && Array.isArray(profile.permissions) && profile.permissions.indexOf(permission) !== -1);
}

function safeProfile_(profile) {
  return {
    id: String(profile.id || ''),
    name: String(profile.name || ''),
    permissionCode: String(profile.permissionCode || ''),
    permissions: Array.isArray(profile.permissions) ? profile.permissions : []
  };
}

function findAdminByUsername_(username) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (!sh || sh.getLastRow() <= 1) return null;

  const rows = sh.getRange(2,1,sh.getLastRow()-1,8).getValues();
  const target = String(username || '').trim().toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const account = String(r[2] || '').trim();

    if (account.toLowerCase() === target) {
      return {
        id: String(r[0] || ''),
        name: String(r[1] || ''),
        username: account,
        salt: String(r[3] || ''),
        passwordHash: String(r[4] || ''),
        enabled: normalizeBool_(r[5]),
        permissionCode: String(r[6] || 'ADMIN')
      };
    }
  }
  return null;
}

function permissionsForCode_(code) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.permissions);
  if (!sh || sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,15).getValues();
  const modules = [
    'dashboard','news','faq-admin','home','services','products','industries',
    'forms','company','links','appearance','admins','system'
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0] || '') === String(code || '')) {
      const permissions = [];
      for (let m = 0; m < modules.length; m++) {
        if (normalizeBool_(r[m + 2])) permissions.push(modules[m]);
      }
      return permissions;
    }
  }
  return [];
}

function passwordHash_(salt, password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || '') + ':' + String(password || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function constantTimeEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function logAuth_(username, result, note) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.authLog);
    sh.appendRow([
      new Date(),
      String(username || ''),
      result ? 'TRUE' : 'FALSE',
      String(note || '')
    ]);
  } catch (_) {}
}

/* =========================
 * Seed security data
 * ========================= */

function seedCompanyInfo_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.company);
  if (sh.getLastRow() > 1) return;

  const now = new Date();
  sh.getRange(2,1,6,5).setValues([
    ['company_name','公司名稱','誠創科技工作室',true,now],
    ['phone','聯絡電話','(02) 8623-7091',true,now],
    ['email','公司信箱','service@chuang-c.com',true,now],
    ['line','LINE ID','@905dqqgw',true,now],
    ['address','公司地址','新北市淡水區水源街二段177巷104號6樓',true,now],
    ['hours','服務時間','週一～週五 09:00～18:00',true,now]
  ]);
}

function seedPermissions_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.permissions);
  if (sh.getLastRow() > 1) return;

  const now = new Date();
  sh.appendRow([
    'ADMIN','系統管理員',
    true,true,true,true,true,true,true,true,true,true,true,true,true,
    now
  ]);

  sh.appendRow([
    'CONTENT','內容管理員',
    true,true,true,true,true,true,true,false,false,false,true,false,false,
    now
  ]);
}

function createInitialAdmin() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (sh.getLastRow() > 1) {
    Logger.log('管理人員已存在，不會建立第二個初始帳號。');
    return false;
  }

  const username = 'admin';
  const password = Utilities.getUuid().replace(/-/g,'').slice(0,16);
  const salt = Utilities.getUuid();
  const hash = passwordHash_(salt, password);

  sh.appendRow([
    'ADMIN-MAIN',
    '系統管理員',
    username,
    salt,
    hash,
    true,
    'ADMIN',
    new Date()
  ]);

  Logger.log('初始後台帳號：' + username);
  Logger.log('一次性初始密碼：' + password);
  Logger.log('登入後請立即在「管理員管理」修改密碼。');
  return true;
}

function changeAdminPassword_(username, newPassword) {
  username = String(username || '').trim();
  newPassword = String(newPassword || '');

  if (!username || newPassword.length < 8) {
    throw new Error('密碼至少需要 8 碼');
  }

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  const rows = sh.getRange(2,1,Math.max(sh.getLastRow()-1,0),8).getValues();

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][2] || '').trim().toLowerCase() === username.toLowerCase()) {
      const row = i + 2;
      const salt = Utilities.getUuid();
      sh.getRange(row,4).setValue(salt);
      sh.getRange(row,5).setValue(passwordHash_(salt,newPassword));
      sh.getRange(row,8).setValue(new Date());
      return true;
    }
  }

  throw new Error('找不到管理員');
}

/* =========================
 * Secure admin/company management
 * ========================= */

function readAdminUsersSafe_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (!sh || sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,8).getValues();
  return rows.map(function(r) {
    const permissionCode = String(r[6] || '');
    return {
      id: String(r[0] || ''),
      displayName: String(r[1] || ''),
      enabled: normalizeBool_(r[5]),
      permissionCode: permissionCode,
      permissions: permissionsForCode_(permissionCode),
      updatedAt: dateTimeText_(r[7])
    };
  });
}

function saveAdminUser_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  const id = String(data.id || '').trim() || ('ADMIN-' + new Date().getTime());
  const displayName = String(data.displayName || '').trim();
  const username = String(data.username || '').trim();
  const password = String(data.password || '');
  const enabled = data.enabled !== false;
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  if (!displayName) return { ok:false, error:'missing_name' };

  let row = findRowById_(sh,id);
  let existing = null;
  if (row) {
    existing = sh.getRange(row,1,1,8).getValues()[0];
  }

  if (!row && (!username || password.length < 8)) {
    return { ok:false, error:'new_user_requires_username_and_8_char_password' };
  }

  if (username && usernameExistsForOther_(username,id)) {
    return { ok:false, error:'username_exists' };
  }

  const account = username || String(existing && existing[2] || '');
  let salt = String(existing && existing[3] || '');
  let hash = String(existing && existing[4] || '');

  if (password) {
    if (password.length < 8) return { ok:false, error:'password_too_short' };
    salt = Utilities.getUuid();
    hash = passwordHash_(salt,password);
  }

  const permissionCode = upsertUserPermissions_(id,displayName,permissions);
  const values = [[id,displayName,account,salt,hash,enabled,permissionCode,new Date()]];

  if (row) sh.getRange(row,1,1,8).setValues(values);
  else sh.appendRow(values[0]);

  return {
    ok:true,
    data:{
      id:id,
      displayName:displayName,
      enabled:enabled,
      permissionCode:permissionCode,
      permissions:permissionsForCode_(permissionCode)
    }
  };
}

function deleteAdminUser_(data) {
  const id = String(data.id || '').trim();
  if (!id) return { ok:false, error:'missing_id' };
  if (id === 'ADMIN-MAIN') return { ok:false, error:'main_admin_cannot_delete' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  const row = findRowById_(sh,id);
  if (!row) return { ok:false, error:'not_found' };
  sh.deleteRow(row);

  const psh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.permissions);
  const code = 'USER_' + id;
  if (psh && psh.getLastRow() > 1) {
    const vals = psh.getRange(2,1,psh.getLastRow()-1,1).getDisplayValues();
    for (let i=vals.length-1;i>=0;i--) {
      if (String(vals[i][0]) === code) psh.deleteRow(i+2);
    }
  }

  return { ok:true, id:id };
}

function usernameExistsForOther_(username,id) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (!sh || sh.getLastRow() <= 1) return false;
  const rows = sh.getRange(2,1,sh.getLastRow()-1,8).getValues();
  const target = String(username || '').trim().toLowerCase();
  return rows.some(function(r){
    return String(r[2] || '').trim().toLowerCase() === target && String(r[0] || '') !== String(id || '');
  });
}

function upsertUserPermissions_(id,name,permissions) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.permissions);
  const code = 'USER_' + id;
  const modules = [
    'dashboard','news','faq-admin','home','services','products','industries',
    'forms','company','links','appearance','admins','system'
  ];
  const set = {};
  (permissions || []).forEach(function(p){ set[String(p)] = true; });
  const rowValues = [code, String(name || '') + ' 權限'];
  modules.forEach(function(m){ rowValues.push(!!set[m]); });
  rowValues.push(new Date());

  let row = 0;
  if (sh.getLastRow() > 1) {
    const vals = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
    for (let i=0;i<vals.length;i++) if (String(vals[i][0]) === code) { row=i+2; break; }
  }
  if (row) sh.getRange(row,1,1,rowValues.length).setValues([rowValues]);
  else sh.appendRow(rowValues);
  return code;
}

function readCompanyInfo_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.company);
  if (!sh || sh.getLastRow() <= 1) return [];
  const rows = sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  return rows.map(function(r){
    return {
      key:String(r[0] || ''),
      label:String(r[1] || ''),
      value:String(r[2] || ''),
      isPublic:normalizeBool_(r[3]),
      updatedAt:dateTimeText_(r[4])
    };
  });
}

function saveCompanyInfo_(data) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) return { ok:false, error:'missing_rows' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.company);
  const existing = {};
  if (sh.getLastRow() > 1) {
    sh.getRange(2,1,sh.getLastRow()-1,5).getValues().forEach(function(r,i){existing[String(r[0]||'')]=i+2;});
  }
  rows.forEach(function(x){
    const key=String(x.key||'').trim();
    if(!key)return;
    const vals=[[key,String(x.label||''),String(x.value||''),x.isPublic!==false,new Date()]];
    const row=existing[key];
    if(row) sh.getRange(row,1,1,5).setValues(vals);
    else sh.appendRow(vals[0]);
  });
  return { ok:true };
}

/* =========================
 * Existing CMS functions
 * ========================= */

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
