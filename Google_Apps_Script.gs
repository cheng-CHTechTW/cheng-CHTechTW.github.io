function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName("網站設定資料");
    var dataStr = "";
    var imagesStr = "";
    
    if (configSheet) {
      var rows = configSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === "site_data") {
          dataStr = rows[i][1];
        } else if (rows[i][0] === "site_images") {
          imagesStr = rows[i][1];
        }
      }
    }
    
    var result = {
      data: dataStr ? JSON.parse(dataStr) : null,
      images: imagesStr ? JSON.parse(imagesStr) : null
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var d = JSON.parse(e.postData.contents);

    // 處理網站設定存檔
    if (d.type === "saveConfig") {
      var configSheet = ss.getSheetByName("網站設定資料") || ss.insertSheet("網站設定資料");
      configSheet.clear();
      configSheet.appendRow(["key", "value"]);
      configSheet.appendRow(["site_data", JSON.stringify(d.data)]);
      configSheet.appendRow(["site_images", JSON.stringify(d.images)]);
      
      return ContentService
        .createTextOutput(JSON.stringify({ result: "success", type: "saveConfig" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 處理使用者稽核紀錄
    if (d.type === "adminLog") {
      var logSheet = ss.getSheetByName("使用者登入與變更紀錄") || ss.insertSheet("使用者登入與變更紀錄");
      if (logSheet.getLastRow() === 0) {
        logSheet.appendRow(["時間", "使用者", "帳號", "動作", "內容"]);
      }
      logSheet.appendRow([
        d.createdAt || new Date(),
        d.actor || "",
        d.username || "",
        d.action || "",
        d.detail || ""
      ]);

      if (d.notifyEmail) {
        MailApp.sendEmail(
          d.notifyEmail,
          "【誠創科技後台】使用者紀錄通知：" + (d.action || ""),
          "時間：" + (d.createdAt || new Date()) + "\n" +
          "使用者：" + (d.actor || "") + "\n" +
          "帳號：" + (d.username || "") + "\n" +
          "動作：" + (d.action || "") + "\n" +
          "內容：" + (d.detail || "")
        );
      }

      return ContentService
        .createTextOutput(JSON.stringify({ result: "success", type: "adminLog" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 處理前台客戶聯絡表單
    var sh = ss.getSheetByName("表單紀錄") || ss.insertSheet("表單紀錄");
    if (sh.getLastRow() === 0) {
      sh.appendRow(["送出時間", "姓名/店名", "電話", "Email", "LINE ID", "營業地區", "門店狀態", "需求項目", "需求內容", "來源", "頁面網址"]);
    }

    sh.appendRow([
      d.createdAt || new Date(),
      d.name || "",
      d.phone || "",
      d.email || "",
      d.lineId || "",
      d.businessArea || "",
      d.storeStatus || "",
      d.service || "",
      d.message || "",
      d.source || "",
      d.pageUrl || ""
    ]);

    if (d.notifyEmail) {
      MailApp.sendEmail(
        d.notifyEmail,
        "【誠創科技官網】新的客戶表單：" + (d.name || "未填姓名"),
        "姓名/店名：" + (d.name || "") + "\n" +
        "電話：" + (d.phone || "") + "\n" +
        "Email：" + (d.email || "") + "\n" +
        "LINE ID：" + (d.lineId || "") + "\n" +
        "營業地區：" + (d.businessArea || "") + "\n" +
        "門店狀態：" + (d.storeStatus || "") + "\n" +
        "需求項目：" + (d.service || "") + "\n" +
        "需求內容：" + (d.message || "")
      );
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
