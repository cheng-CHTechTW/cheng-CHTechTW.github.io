// ═══════════════════════════════════════════════════════
//  誠創科技 Google Apps Script v2
//  功能：網站資料同步、表單收集、Email通知、GitHub發布
//  安全：GitHub Token 存於 Script Properties，不在程式碼中
// ═══════════════════════════════════════════════════════

// ── 設定（請在 Script Properties 設定以下 key）──────────
// GITHUB_TOKEN   : GitHub Personal Access Token (repo scope)
// GITHUB_OWNER   : cheng-CHTechTW
// GITHUB_REPO    : cheng-CHTechTW.github.io
// NOTIFY_EMAIL   : 收通知的 Email（可多個，逗號分隔）
// ────────────────────────────────────────────────────────

function getProps() {
  return PropertiesService.getScriptProperties();
}

// ── GET 請求處理 ─────────────────────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "getData";
  var result;

  try {
    if (action === "getData")         result = handleGetData();
    else if (action === "getVersions") result = handleGetVersions();
    else if (action === "getForms")    result = handleGetForms(e);
    else result = { error: "未知 action: " + action };
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST 請求處理 ────────────────────────────────────────
function doPost(e) {
  var d, result;
  try {
    d = JSON.parse(e.postData.contents);
    var type = d.type || "";

    if (type === "saveConfig")      result = handleSaveConfig(d);
    else if (type === "publish")    result = handlePublish(d);
    else if (type === "adminLog")   result = handleAdminLog(d);
    else if (type === "submitForm") result = handleFormSubmit(d);
    else if (type === "updateFormStatus") result = handleUpdateFormStatus(d);
    else result = { result: "error", message: "未知 type: " + type };
  } catch (err) {
    result = { result: "error", message: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════
//  GET 功能
// ══════════════════════════════════════════════════════════

// 取得網站資料
function handleGetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("網站設定資料");
  if (!sheet) return { data: null, images: null };

  var rows = sheet.getDataRange().getValues();
  var data = {}, images = {};
  for (var i = 1; i < rows.length; i++) {
    try {
      if (rows[i][0] === "site_data")   data = JSON.parse(rows[i][1]);
      if (rows[i][0] === "site_images") images = JSON.parse(rows[i][1]);
    } catch(e) {}
  }
  return { data: data, images: images };
}

// 取得版本歷史
function handleGetVersions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("版本歷史");
  if (!sheet) return { versions: [] };

  var rows = sheet.getDataRange().getValues();
  var versions = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    versions.push({
      versionNo: rows[i][0],
      publishedAt: rows[i][1],
      publishedBy: rows[i][2],
      note: rows[i][3],
      dataSnapshot: rows[i][4] || ""
    });
  }
  return { versions: versions.reverse() }; // 最新在前
}

// 取得表單紀錄（支援篩選）
function handleGetForms(e) {
  var params = e && e.parameter ? e.parameter : {};
  var formType = params.formType || "";
  var status   = params.status   || "";
  var search   = params.search   || "";
  var dateFrom = params.dateFrom || "";
  var dateTo   = params.dateTo   || "";
  var page     = parseInt(params.page || "1");
  var pageSize = parseInt(params.pageSize || "50");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = formType ? "表單_" + formType : "表單紀錄";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // 嘗試從所有表單 sheet 合併
    var all = getAllFormRecords(ss, formType);
    return paginateRecords(all, status, search, dateFrom, dateTo, page, pageSize);
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0] || [];
  var records = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var rec = {};
    headers.forEach(function(h, idx) { rec[h] = rows[i][idx]; });
    records.push(rec);
  }

  return paginateRecords(records, status, search, dateFrom, dateTo, page, pageSize);
}

function getAllFormRecords(ss, filterType) {
  var sheets = ss.getSheets();
  var all = [];
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (!name.startsWith("表單_") && name !== "表單紀錄") return;
    if (filterType && name !== "表單_" + filterType) return;
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0] || [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      var rec = { _sheetName: name };
      headers.forEach(function(h, idx) { rec[h] = rows[i][idx]; });
      all.push(rec);
    }
  });
  // 按時間排序（最新在前）
  all.sort(function(a, b) { return new Date(b["送出時間"]||0) - new Date(a["送出時間"]||0); });
  return all;
}

function paginateRecords(records, status, search, dateFrom, dateTo, page, pageSize) {
  var filtered = records.filter(function(r) {
    if (status && r["處理狀態"] !== status) return false;
    if (search) {
      var s = search.toLowerCase();
      var hay = (r["姓名"]+r["公司名稱"]+r["電話"]+r["Email"]+r["LINE ID"]||"").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (dateFrom && r["送出時間"] && new Date(r["送出時間"]) < new Date(dateFrom)) return false;
    if (dateTo   && r["送出時間"] && new Date(r["送出時間"]) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });
  var total = filtered.length;
  var start = (page - 1) * pageSize;
  return {
    total: total,
    page: page,
    pageSize: pageSize,
    records: filtered.slice(start, start + pageSize)
  };
}

// ══════════════════════════════════════════════════════════
//  POST 功能
// ══════════════════════════════════════════════════════════

// 儲存草稿到 Google Sheets
function handleSaveConfig(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("網站設定資料") || ss.insertSheet("網站設定資料");
  sheet.clear();
  sheet.appendRow(["key", "value", "updatedAt"]);
  sheet.appendRow(["site_data",   JSON.stringify(d.data   || {}), new Date().toISOString()]);
  sheet.appendRow(["site_images", JSON.stringify(d.images || {}), new Date().toISOString()]);
  return { result: "success", type: "saveConfig" };
}

// 發布到 GitHub（更新 assets/data/site-data.json）
function handlePublish(d) {
  var props = getProps();
  var token = props.getProperty("GITHUB_TOKEN");
  var owner = props.getProperty("GITHUB_OWNER") || "cheng-CHTechTW";
  var repo  = props.getProperty("GITHUB_REPO")  || "cheng-CHTechTW.github.io";

  if (!token) return { result: "error", message: "未設定 GITHUB_TOKEN，請在 Script Properties 設定" };

  // 先儲存到 Sheets
  handleSaveConfig(d);

  // 建立版本號
  var versionNo = _generateVersionNo();
  var publishedAt = new Date().toISOString();
  var publishedBy = d.publishedBy || "admin";
  var note = d.note || "";

  // 組合要寫入 GitHub 的 JSON
  var siteDataJson = Object.assign({}, d.data || {}, {
    _meta: { version: versionNo, publishedAt: publishedAt, publishedBy: publishedBy, note: note }
  });

  // 更新 site-data.json
  var pushResult = _updateGithubFile(
    token, owner, repo,
    "assets/data/site-data.json",
    JSON.stringify(siteDataJson, null, 2),
    "publish: " + versionNo + " by " + publishedBy
  );

  if (pushResult.error) return { result: "error", message: pushResult.error };

  // 記錄版本歷史
  _saveVersion(versionNo, publishedAt, publishedBy, note, d.data);

  return { result: "success", type: "publish", version: versionNo, publishedAt: publishedAt };
}

// 表單送出
function handleFormSubmit(d) {
  var formType  = d.formType  || "contact";
  var sheetName = "表單_" + formType;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  var headers = ["送出時間","表單類型","姓名","公司名稱","電話","Email","LINE ID",
                 "需求類型","需求內容","來源頁面","上傳附件","處理狀態","負責人","備註","最後更新"];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4472C4").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }

  var now = new Date();
  sheet.appendRow([
    now,
    d.formType      || "",
    d.name          || "",
    d.companyName   || "",
    d.phone         || "",
    d.email         || "",
    d.lineId        || "",
    d.serviceType   || d.service || "",
    d.message       || d.content || "",
    d.sourceUrl     || d.pageUrl || "",
    d.attachmentUrl || "",
    "未處理",
    "",
    "",
    now
  ]);

  // Email 通知
  var notifyEmail = d.notifyEmail || getProps().getProperty("NOTIFY_EMAIL");
  if (notifyEmail) {
    _sendFormNotification(notifyEmail, d, formType);
  }

  return { result: "success", formType: formType };
}

// 更新表單狀態
function handleUpdateFormStatus(d) {
  var sheetName = d.sheetName || ("表單_" + (d.formType || "contact"));
  var rowIndex  = parseInt(d.rowIndex || "0");
  var newStatus = d.status || "";
  var note      = d.note || "";
  var assignee  = d.assignee || "";

  if (!rowIndex) return { result: "error", message: "缺少 rowIndex" };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { result: "error", message: "找不到工作表: " + sheetName };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var statusCol  = headers.indexOf("處理狀態") + 1;
  var noteCol    = headers.indexOf("備註") + 1;
  var assigneCol = headers.indexOf("負責人") + 1;
  var updatedCol = headers.indexOf("最後更新") + 1;

  if (statusCol  > 0) sheet.getRange(rowIndex, statusCol).setValue(newStatus);
  if (note && noteCol > 0) sheet.getRange(rowIndex, noteCol).setValue(note);
  if (assignee && assigneCol > 0) sheet.getRange(rowIndex, assigneCol).setValue(assignee);
  if (updatedCol > 0) sheet.getRange(rowIndex, updatedCol).setValue(new Date());

  return { result: "success" };
}

// 管理員操作紀錄
function handleAdminLog(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("操作紀錄") || ss.insertSheet("操作紀錄");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["時間","使用者","帳號","動作","內容"]);
  }
  sheet.appendRow([d.createdAt || new Date(), d.actor||"", d.username||"", d.action||"", d.detail||""]);
  return { result: "success", type: "adminLog" };
}

// ══════════════════════════════════════════════════════════
//  內部工具函式
// ══════════════════════════════════════════════════════════

function _generateVersionNo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("版本歷史");
  var count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  return String(count + 1).padStart(3, "0") + "_v" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function _saveVersion(versionNo, publishedAt, publishedBy, note, dataSnapshot) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("版本歷史") || ss.insertSheet("版本歷史");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["版本號","發布時間","發布人員","備註","資料快照"]);
    sheet.getRange(1,1,1,5).setFontWeight("bold").setBackground("#4472C4").setFontColor("#FFFFFF");
  }
  sheet.appendRow([versionNo, publishedAt, publishedBy, note, JSON.stringify(dataSnapshot||{})]);
}

function _updateGithubFile(token, owner, repo, filePath, content, commitMsg) {
  var apiBase = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + filePath;
  var headers = {
    "Authorization": "token " + token,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "GAS-CHTechTW"
  };

  // 取得現有檔案 SHA（更新檔案需要）
  var sha = "";
  try {
    var getResp = UrlFetchApp.fetch(apiBase, { method: "get", headers: headers, muteHttpExceptions: true });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha || "";
    }
  } catch(e) {}

  // 上傳新內容
  var body = { message: commitMsg, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8) };
  if (sha) body.sha = sha;

  try {
    var putResp = UrlFetchApp.fetch(apiBase, {
      method: "put",
      headers: headers,
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    var code = putResp.getResponseCode();
    if (code === 200 || code === 201) return { success: true };
    return { error: "GitHub API 回應 " + code + ": " + putResp.getContentText().slice(0, 200) };
  } catch(e) {
    return { error: e.toString() };
  }
}

function _sendFormNotification(toEmail, d, formType) {
  var typeLabel = { contact:"聯絡我們", quote:"報價需求", repair:"維修申請", customer:"客戶需求", register:"合作註冊" };
  var label = typeLabel[formType] || formType;
  var subject = "【誠創科技】新表單：" + label + " - " + (d.name || d.companyName || "未填姓名");
  var body = [
    "表單類型：" + label,
    "姓名/公司：" + (d.name || d.companyName || ""),
    "電話：" + (d.phone || ""),
    "Email：" + (d.email || ""),
    "LINE ID：" + (d.lineId || ""),
    "需求類型：" + (d.serviceType || d.service || ""),
    "需求內容：" + (d.message || d.content || ""),
    "來源頁面：" + (d.sourceUrl || d.pageUrl || ""),
    "送出時間：" + new Date().toLocaleString("zh-TW"),
    "",
    "請登入後台查看：https://cheng-CHTechTW.github.io/admin.html"
  ].join("\n");

  toEmail.split(",").forEach(function(email) {
    email = email.trim();
    if (email) {
      try { MailApp.sendEmail(email, subject, body); } catch(e) {}
    }
  });
}
