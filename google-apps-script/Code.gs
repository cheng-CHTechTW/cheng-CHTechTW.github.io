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
  authLog: '驗證紀錄',
  recipients: 'Email接收設定'
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

    if (action === 'passwordResetCheck') {
      return json_(checkPasswordResetToken_(p.token));
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

    if (action === 'inquiryRecipients') {
      if (!hasPermission_(session.profile,'company')) return json_({ok:false,error:'forbidden'});
      return json_({ ok: true, data: readInquiryRecipientsAdmin_() });
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

    if (action === 'adminForgotPassword') {
      return json_(forgotPassword_(data));
    }

    if (action === 'adminResetPassword') {
      return json_(resetPasswordByToken_(data));
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
    if (action === 'saveInquiryRecipients') { if(!hasPermission_(session.profile,'company')) return json_({ok:false,error:'forbidden'}); return json_(saveInquiryRecipients_(data)); }

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
    ['管理員ID','姓名','帳號','密碼鹽值','密碼雜湊','啟用','權限代碼','更新時間','Email']);

  ensureSheet_(ss, TABS.permissions,
    ['權限代碼','權限名稱','dashboard','news','faq-admin','home','services','products','industries','forms','company','links','appearance','admins','system','更新時間']);

  ensureSheet_(ss, TABS.authLog,
    ['驗證時間','帳號','驗證結果','備註']);

  ensureSheet_(ss, TABS.recipients,
    ['ID','Email','接收客戶表單','啟用','建立時間','更新時間']);

  ensureAdminEmailColumn_(ss);
  seedInquiryRecipients_();
}


function ensureAdminEmailColumn_(ss) {
  const sh = ss.getSheetByName(TABS.admins);
  if (!sh) return;
  if (String(sh.getRange(1,9).getDisplayValue() || '').trim() !== 'Email') {
    sh.getRange(1,9).setValue('Email').setFontWeight('bold');
  }
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
  seedEngineerAdmin_();
}

/* =========================
 * Admin authentication
 * ========================= */


const PASSWORD_RESET_MINUTES = 30;
const PASSWORD_RESET_PREFIX = 'PWD_RESET_';

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function forgotPassword_(data) {
  const username = String(data.username || '').trim();
  const email = String(data.email || '').trim().toLowerCase();

  const generic = {
    ok: true,
    message: '如果帳號與 Email 資料相符，系統會寄出密碼重設信。'
  };

  if (!username || !isValidEmail_(email)) {
    Utilities.sleep(300);
    return generic;
  }

  const admin = findAdminByUsername_(username);
  if (!admin || !admin.enabled || !admin.email ||
      String(admin.email).trim().toLowerCase() !== email) {
    logAuth_(username, false, 'forgot_password_mismatch');
    Utilities.sleep(350);
    return generic;
  }

  const token = Utilities.getUuid().replace(/-/g,'') +
                Utilities.getUuid().replace(/-/g,'');
  const tokenHash = simpleSha256_(token);
  const expiresAt = Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000;

  PropertiesService.getScriptProperties().setProperty(
    PASSWORD_RESET_PREFIX + tokenHash,
    JSON.stringify({
      adminId: admin.id,
      username: admin.username,
      email: admin.email,
      expiresAt: expiresAt
    })
  );

  const resetUrl =
    'https://chuang-c.com/admin/reset-password.html?token=' +
    encodeURIComponent(token);

  MailApp.sendEmail({
    to: admin.email,
    subject: '【誠創科技】後台管理密碼重設',
    body: '請於 ' + PASSWORD_RESET_MINUTES + ' 分鐘內開啟以下連結重設密碼：\n' + resetUrl,
    htmlBody:
      '<div style="font-family:Arial,Microsoft JhengHei,sans-serif;max-width:640px;margin:auto;color:#333">' +
      '<div style="background:#3f3d3a;color:#fff;padding:22px 26px"><b style="font-size:22px">後台密碼重設</b></div>' +
      '<div style="padding:26px;background:#faf9f7">' +
      '<p>' + escapeHtmlMail_(admin.name || admin.username) + ' 您好：</p>' +
      '<p>請在 ' + PASSWORD_RESET_MINUTES + ' 分鐘內點選下方按鈕設定新密碼。</p>' +
      '<p style="margin:26px 0"><a href="' + resetUrl + '" style="display:inline-block;background:#3f3d3a;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">重設後台密碼</a></p>' +
      '<p style="font-size:12px;color:#777;word-break:break-all">' + resetUrl + '</p>' +
      '<p style="font-size:12px;color:#9a5d55">若不是您提出申請，請忽略此信。</p>' +
      '</div></div>',
    name: '誠創科技網站後台'
  });

  logAuth_(username, true, 'password_reset_email_sent');
  return generic;
}

function checkPasswordResetToken_(token) {
  const record = readPasswordResetToken_(token);
  if (!record.ok) return record;
  return { ok:true, valid:true, expiresAt:record.payload.expiresAt };
}

function resetPasswordByToken_(data) {
  const token = String(data.token || '').trim();
  const password = String(data.password || '');
  const confirmPassword = String(data.confirmPassword || '');

  if (password.length < 8) return { ok:false, error:'password_too_short' };
  if (password !== confirmPassword) return { ok:false, error:'password_confirmation_mismatch' };

  const record = readPasswordResetToken_(token);
  if (!record.ok) return record;

  const payload = record.payload;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  const row = findRowById_(sh, payload.adminId);
  if (!row) return { ok:false, error:'admin_not_found' };

  const currentEmail = String(sh.getRange(row,9).getDisplayValue() || '').trim().toLowerCase();
  if (currentEmail !== String(payload.email || '').trim().toLowerCase()) {
    deletePasswordResetToken_(token);
    return { ok:false, error:'reset_identity_changed' };
  }

  const salt = Utilities.getUuid();
  const hash = passwordHash_(salt,password);
  sh.getRange(row,4).setValue(salt);
  sh.getRange(row,5).setValue(hash);
  sh.getRange(row,8).setValue(new Date());

  deletePasswordResetToken_(token);
  logAuth_(payload.username, true, 'password_reset_success');
  return { ok:true, changed:true };
}

function readPasswordResetToken_(token) {
  token = String(token || '').trim();
  if (!token) return { ok:false, error:'invalid_reset_token' };

  const props = PropertiesService.getScriptProperties();
  const key = PASSWORD_RESET_PREFIX + simpleSha256_(token);
  const raw = props.getProperty(key);
  if (!raw) return { ok:false, error:'invalid_or_used_reset_token' };

  try {
    const payload = JSON.parse(raw);
    if (!payload.expiresAt || Date.now() > Number(payload.expiresAt)) {
      props.deleteProperty(key);
      return { ok:false, error:'reset_token_expired' };
    }
    return { ok:true, payload:payload };
  } catch (_) {
    props.deleteProperty(key);
    return { ok:false, error:'invalid_reset_token' };
  }
}

function deletePasswordResetToken_(token) {
  PropertiesService.getScriptProperties().deleteProperty(
    PASSWORD_RESET_PREFIX + simpleSha256_(String(token || '').trim())
  );
}

function simpleSha256_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function escapeHtmlMail_(value) {
  return String(value || '').replace(/[<>&"]/g, function(ch) {
    return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch];
  });
}


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

  const rows = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
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
        permissionCode: String(r[6] || 'ADMIN'),
        email: String(r[8] || '').trim()
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
  const rows = [
    ['company_name','公司名稱','誠創科技工作室',true,now],
    ['brand_name','品牌名稱','CH 誠創 科技·設計',true,now],
    ['website','官方網站','https://chuang-c.com/',true,now],
    ['email','公司信箱','service@chuang-c.com',true,now],
    ['inquiry_email','主要接收Email','service@chuang-c.com',false,now],
    ['phone','聯絡電話','(02) 8623-7091',true,now],
    ['line_id','LINE ID','@905dqqgw',true,now],
    ['line_url','LINE 官方連結','https://lin.ee/N8TErfC',true,now],
    ['address','公司地址','新北市淡水區水源街二段177巷104號6樓',true,now],
    ['service_hours','服務時間','週一～週五 09:00～18:00',true,now],
    ['domain','主要網域','chuang-c.com',true,now],
    ['www_domain','WWW 網域','www.chuang-c.com',true,now],
    ['business_type','服務類型','POS系統、電子發票、多元支付、網站設計、客製系統、雲端服務',true,now],
    ['copyright','版權資訊','© CH 誠創科技工作室',true,now]
  ];

  sh.getRange(2,1,rows.length,5).setValues(rows);
}

function seedPermissions_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.permissions);
  if (sh.getLastRow() > 1) return;

  const now = new Date();
  sh.appendRow([
    'ENGINEER',
    '工程師管理',
    true,  // dashboard
    true,  // news
    true,  // faq-admin
    true,  // home
    true,  // services
    true,  // products
    true,  // industries
    true,  // forms
    true,  // company
    true,  // links
    true,  // appearance
    true,  // admins
    true,  // system
    now
  ]);
}

function seedEngineerAdmin_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (!sh) throw new Error('找不到管理人員頁籤');

  // 全新試算表只建立 1 位預設工程師。
  // 若已有任何管理人員，setup() 不會覆蓋或新增，避免破壞既有帳號。
  if (sh.getLastRow() > 1) return false;

  const username = 'engineer';
  const password = Utilities.getUuid().replace(/-/g,'').slice(0,16);
  const salt = Utilities.getUuid();
  const hash = passwordHash_(salt, password);

  sh.appendRow([
    'ADMIN-ENG-001',
    '系統工程師',
    username,
    salt,
    hash,
    true,
    'ENGINEER',
    new Date(),
    'service@chuang-c.com'
  ]);

  Logger.log('========================================');
  Logger.log('V66 初始工程師管理員已建立');
  Logger.log('帳號：' + username);
  Logger.log('一次性初始密碼：' + password);
  Logger.log('請登入後立即修改密碼。');
  Logger.log('試算表不保存明文密碼。');
  Logger.log('========================================');

  return true;
}

// 相容舊流程：若手動執行 createInitialAdmin()，也只會建立 engineer。
function createInitialAdmin() {
  ensureSheets_();
  seedPermissions_();
  return seedEngineerAdmin_();
}


/**
 * V69：重新建立 / 修復 engineer 工程師登入。
 *
 * 用途：
 * - engineer 已存在但忘記/不確定一次性密碼
 * - 管理人員列的啟用或權限代碼設定錯誤
 * - setup() 因已有管理員而不會重新建立密碼
 *
 * 執行後：
 * - 帳號固定 engineer
 * - 姓名固定 系統工程師
 * - 啟用 TRUE
 * - 權限 ENGINEER
 * - 重新產生 Salt + SHA-256
 * - 新的 16 碼一次性密碼只顯示在 Apps Script 執行記錄
 */
function resetEngineerLogin() {
  ensureSheets_();
  seedPermissions_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(TABS.admins);
  if (!sh) throw new Error('找不到管理人員頁籤');

  const username = 'engineer';
  const newPassword = Utilities.getUuid().replace(/-/g, '').slice(0,16);
  const salt = Utilities.getUuid();
  const passwordHash = passwordHash_(salt, newPassword);
  const now = new Date();

  let targetRow = 0;
  let targetEmail = 'service@chuang-c.com';

  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();

    for (let i = 0; i < rows.length; i++) {
      const account = String(rows[i][2] || '').trim().toLowerCase();
      const id = String(rows[i][0] || '').trim();

      if (account === username || id === 'ADMIN-ENG-001') {
        targetRow = i + 2;
        targetEmail = String(rows[i][8] || '').trim() || targetEmail;
        break;
      }
    }
  }

  const values = [[
    'ADMIN-ENG-001',
    '系統工程師',
    username,
    salt,
    passwordHash,
    true,
    'ENGINEER',
    now,
    targetEmail
  ]];

  if (targetRow) {
    sh.getRange(targetRow,1,1,9).setValues(values);
  } else {
    sh.appendRow(values[0]);
    targetRow = sh.getLastRow();
  }

  // 確保 ENGINEER 權限列真的存在且全部啟用。
  repairEngineerPermissions_();

  // 清除舊 Session，避免舊狀態干擾。
  CacheService.getScriptCache().removeAll([
    'ADMIN_LOGIN_ATTEMPT_' + username
  ]);

  Logger.log('========================================');
  Logger.log('V69 engineer 登入已重設成功');
  Logger.log('帳號：engineer');
  Logger.log('一次性新密碼：' + newPassword);
  Logger.log('管理人員列：' + targetRow);
  Logger.log('啟用：TRUE');
  Logger.log('權限代碼：ENGINEER');
  Logger.log('請使用這組新密碼登入。');
  Logger.log('試算表不會保存明文密碼。');
  Logger.log('========================================');

  return {
    ok: true,
    username: username,
    row: targetRow,
    permissionCode: 'ENGINEER'
  };
}

function repairEngineerPermissions_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(TABS.permissions);
  if (!sh) throw new Error('找不到管理權限頁籤');

  const now = new Date();
  const values = [[
    'ENGINEER',
    '工程師管理',
    true, true, true, true, true, true, true,
    true, true, true, true, true, true,
    now
  ]];

  let targetRow = 0;

  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2,1,sh.getLastRow()-1,16).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === 'ENGINEER') {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow) {
    sh.getRange(targetRow,1,1,16).setValues(values);
  } else {
    sh.appendRow(values[0]);
  }

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


/**
 * 僅在「確定要清除既有管理設定並重建 V66 預設值」時手動執行。
 * setup() 不會呼叫此函式。
 */
function resetSecurityDefaultsV66() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const admins = ss.getSheetByName(TABS.admins);
  const permissions = ss.getSheetByName(TABS.permissions);
  const company = ss.getSheetByName(TABS.company);
  const authLog = ss.getSheetByName(TABS.authLog);

  if (admins && admins.getLastRow() > 1) {
    admins.getRange(2,1,admins.getLastRow()-1,admins.getLastColumn()).clearContent();
  }
  if (permissions && permissions.getLastRow() > 1) {
    permissions.getRange(2,1,permissions.getLastRow()-1,permissions.getLastColumn()).clearContent();
  }
  if (company && company.getLastRow() > 1) {
    company.getRange(2,1,company.getLastRow()-1,company.getLastColumn()).clearContent();
  }
  if (authLog && authLog.getLastRow() > 1) {
    authLog.getRange(2,1,authLog.getLastRow()-1,authLog.getLastColumn()).clearContent();
  }

  seedCompanyInfo_();
  seedPermissions_();
  seedEngineerAdmin_();

  Logger.log('V66 管理設定已重建完成。');
}

/* =========================
 * Secure admin/company management
 * ========================= */

function readAdminUsersSafe_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  if (!sh || sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
  return rows.map(function(r) {
    const permissionCode = String(r[6] || '');
    return {
      id: String(r[0] || ''),
      displayName: String(r[1] || ''),
      enabled: normalizeBool_(r[5]),
      permissionCode: permissionCode,
      permissions: permissionsForCode_(permissionCode),
      updatedAt: dateTimeText_(r[7]),
      email: String(r[8] || '')
    };
  });
}

function saveAdminUser_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.admins);
  const id = String(data.id || '').trim() || ('ADMIN-' + new Date().getTime());
  const displayName = String(data.displayName || '').trim();
  const username = String(data.username || '').trim();
  const password = String(data.password || '');
  const email = String(data.email || '').trim().toLowerCase();
  const enabled = data.enabled !== false;
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  if (!displayName) return { ok:false, error:'missing_name' };

  let row = findRowById_(sh,id);
  let existing = null;
  if (row) {
    existing = sh.getRange(row,1,1,9).getValues()[0];
  }

  if (!row && (!username || password.length < 8 || !isValidEmail_(email))) {
    return { ok:false, error:'new_user_requires_username_email_and_8_char_password' };
  }

  if (username && usernameExistsForOther_(username,id)) {
    return { ok:false, error:'username_exists' };
  }

  const account = username || String(existing && existing[2] || '');
  const accountEmail = email || String(existing && existing[8] || '').trim().toLowerCase();
  if (!isValidEmail_(accountEmail)) return { ok:false, error:'invalid_email' };
  let salt = String(existing && existing[3] || '');
  let hash = String(existing && existing[4] || '');

  if (password) {
    if (password.length < 8) return { ok:false, error:'password_too_short' };
    salt = Utilities.getUuid();
    hash = passwordHash_(salt,password);
  }

  const permissionCode = upsertUserPermissions_(id,displayName,permissions);
  const values = [[id,displayName,account,salt,hash,enabled,permissionCode,new Date(),accountEmail]];

  if (row) sh.getRange(row,1,1,9).setValues(values);
  else sh.appendRow(values[0]);

  return {
    ok:true,
    data:{
      id:id,
      displayName:displayName,
      enabled:enabled,
      email:accountEmail,
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
  const rows = sh.getRange(2,1,sh.getLastRow()-1,9).getValues();
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



function seedInquiryRecipients_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(TABS.recipients);
  if (!sh || sh.getLastRow() > 1) return;

  const legacy = getCompanySetting_('inquiry_email') || getCompanySetting_('email') || 'service@chuang-c.com';
  const raw = String(legacy || '').split(/[;,\n\r]+/);
  const seen = {};
  const emails = raw.map(function(v){ return String(v || '').trim().toLowerCase(); })
    .filter(function(v){
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || seen[v]) return false;
      seen[v] = true;
      return true;
    });

  if (!emails.length) return;

  const now = new Date();
  const rows = emails.map(function(email, index) {
    return [
      'MAIL-' + String(index + 1).padStart(3, '0'),
      email,
      true,
      true,
      now,
      now
    ];
  });

  sh.getRange(2,1,rows.length,6).setValues(rows);
}

function getCompanySetting_(code) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.company);
  if (!sh || sh.getLastRow() <= 1) return '';

  const rows = sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === String(code || '').trim()) {
      return String(rows[i][2] || '').trim();
    }
  }
  return '';
}

function sendInquiryEmail_(data, inquiryId, submittedAt) {
  const recipients = readActiveInquiryRecipients_();
  if (!recipients.length) return false;
  const to = recipients.map(function(item){ return item.email; }).join(',');

  const subject = `【誠創科技｜新客戶表單】${data.storeName || '未填店名'}｜${data.contactName || '未填聯絡人'}`;

  const safe = v => String(v || '').replace(/[<>&]/g, s => ({
    '<':'&lt;','>':'&gt;','&':'&amp;'
  }[s]));

  const html = `
  <div style="font-family:Arial,'Noto Sans TC','Microsoft JhengHei',sans-serif;max-width:760px;margin:auto;color:#2f3337">
    <div style="background:#3f3d3a;color:#fff;padding:24px 28px">
      <div style="font-size:13px;opacity:.8">CHENG CHUANG TECHNOLOGY · DESIGN</div>
      <div style="font-size:24px;font-weight:700;margin-top:6px">新客戶諮詢表單</div>
      <div style="font-size:13px;margin-top:6px">編號：${safe(inquiryId)}</div>
    </div>

    <div style="padding:24px 28px;background:#faf9f7">
      <div style="margin-bottom:18px;font-size:14px">
        <b>提交時間：</b>${safe(submittedAt)}
      </div>

      <table style="width:100%;border-collapse:collapse;background:#fff">
        <tr><th style="text-align:left;padding:11px;border:1px solid #ddd;background:#f1eeea;width:30%">欄位</th><th style="text-align:left;padding:11px;border:1px solid #ddd;background:#f1eeea">內容</th></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">店名</td><td style="padding:11px;border:1px solid #ddd">${safe(data.storeName)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">聯絡人</td><td style="padding:11px;border:1px solid #ddd">${safe(data.contactName)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">聯絡電話</td><td style="padding:11px;border:1px solid #ddd">${safe(data.phone)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">LINE ID</td><td style="padding:11px;border:1px solid #ddd">${safe(data.line)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">Email</td><td style="padding:11px;border:1px solid #ddd">${safe(data.email)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">營業狀態</td><td style="padding:11px;border:1px solid #ddd">${safe(data.businessStatus)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">需求</td><td style="padding:11px;border:1px solid #ddd">${safe(data.service)}</td></tr>
        <tr><td style="padding:11px;border:1px solid #ddd">備註</td><td style="padding:11px;border:1px solid #ddd;white-space:pre-wrap">${safe(data.note)}</td></tr>
      </table>

      <div style="margin-top:20px;padding:14px;background:#fff;border:1px solid #e5e0db;border-radius:8px;font-size:13px;color:#6d6a66">
        此信件由誠創科技網站表單自動寄送。客戶資料已同步寫入 Google 試算表「客戶表單」。
      </div>
    </div>
  </div>`;

  const text = [
    '誠創科技｜新客戶諮詢表單',
    `編號：${inquiryId}`,
    `提交時間：${submittedAt}`,
    '',
    `店名：${data.storeName || ''}`,
    `聯絡人：${data.contactName || ''}`,
    `聯絡電話：${data.phone || ''}`,
    `LINE ID：${data.line || ''}`,
    `Email：${data.email || ''}`,
    `營業狀態：${data.businessStatus || ''}`,
    `需求：${data.service || ''}`,
    `備註：${data.note || ''}`
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: text,
    htmlBody: html,
    name: '誠創科技網站'
  });

  return true;
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

  let emailSent = false;
  try {
    emailSent = sendInquiryEmail_(
      data,
      id,
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
    );
  } catch (mailErr) {
    console.error('sendInquiryEmail_ failed:', mailErr);
  }

  return { ok: true, id: id, emailSent: emailSent };
}


function readInquiryRecipientsAdmin_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.recipients);
  if (!sh || sh.getLastRow() <= 1) return [];

  const rows = sh.getRange(2,1,sh.getLastRow()-1,6).getValues();
  return rows.map(function(r) {
    return {
      id: String(r[0] || ''),
      email: String(r[1] || '').trim().toLowerCase(),
      receiveInquiry: normalizeBool_(r[2]),
      enabled: normalizeBool_(r[3]),
      createdAt: dateTimeText_(r[4]),
      updatedAt: dateTimeText_(r[5])
    };
  }).filter(function(x){ return x.email; });
}

function readActiveInquiryRecipients_() {
  const rows = readInquiryRecipientsAdmin_();
  const seen = {};

  return rows.filter(function(item) {
    if (!item.email || !isValidEmail_(item.email) ||
        !item.receiveInquiry || !item.enabled || seen[item.email]) {
      return false;
    }
    seen[item.email] = true;
    return true;
  });
}

function saveInquiryRecipients_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.recipients);
  if (!sh) return { ok:false, error:'recipients_sheet_missing' };

  const incoming = Array.isArray(data.recipients) ? data.recipients : [];
  const seen = {};
  const now = new Date();
  const rows = [];

  incoming.forEach(function(item, index) {
    const email = String(item.email || '').trim().toLowerCase();
    if (!isValidEmail_(email) || seen[email]) return;
    seen[email] = true;

    rows.push([
      String(item.id || ('MAIL-' + String(index + 1).padStart(3,'0'))),
      email,
      item.receiveInquiry !== false,
      item.enabled !== false,
      item.createdAt || now,
      now
    ]);
  });

  if (!rows.length) return { ok:false, error:'at_least_one_recipient_required' };

  if (sh.getLastRow() > 1) {
    sh.getRange(2,1,sh.getLastRow()-1,6).clearContent();
  }
  sh.getRange(2,1,rows.length,6).setValues(rows);

  return { ok:true, count:rows.length };
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
