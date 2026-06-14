# 009 DEV Site Test Report

任務名稱：第五階段建立 DEV JSON 測試站  
分支：`codex/002-json-sync-prototype`  
PR：#2

## 一、測試範圍

本階段建立並檢查以下檔案：

```text
dev-index.html
dev-ihome.html
assets/js/dev-json-loader.js
```

以及既有 JSON：

```text
assets/data/site-data.json
assets/data/news.json
assets/data/partners.json
assets/data/faq.json
assets/data/forms-config.json
```

## 二、測試項目

| 項目 | 結果 | 說明 |
|---|---|---|
| 建立 `dev-index.html` | 通過 | 已建立主站 DEV JSON 測試頁。 |
| 建立 `dev-ihome.html` | 通過 | 已建立愛家居 DEV JSON 測試頁。 |
| 建立 `assets/js/dev-json-loader.js` | 通過 | 已建立獨立 DEV loader。 |
| 優先讀取 `assets/data/*.json` | 通過 | loader 使用 `fetch(..., { cache: "no-store" })` 讀取 5 個 JSON。 |
| JSON 失敗時讀取 `data.js` | 通過 | dev 頁先載入 `assets/js/data.js`，loader 失敗時 fallback `window.DEFAULT_DATA`。 |
| 顯示目前資料來源 | 通過 | 頁面會顯示 `JSON` 或 `data.js`。 |
| 不修改正式 `index.html` | 通過 | PR compare 未包含 `index.html`。 |
| 不修改正式 `ihome.html` | 通過 | PR compare 未包含 `ihome.html`。 |
| 不修改正式 `admin.html` | 通過 | PR compare 未包含 `admin.html`。 |
| 不合併 main | 通過 | PR #2 仍 open，未合併。 |

## 三、預期畫面結果

### `dev-index.html`

正常讀到 JSON 時：

```text
資料來源：JSON
版本號：006_v33
最新消息數：3
關係企業數：2
FAQ 數：4
表單設定數：5
```

若 JSON 讀取失敗：

```text
資料來源：data.js
```

並顯示錯誤訊息。

### `dev-ihome.html`

正常讀到 JSON 時：

```text
資料來源：JSON
版本號：006_v33
品牌：愛家居系統櫥櫃
電話：0955-149-470
作品數：25
```

若 JSON 讀取失敗：

```text
資料來源：data.js
```

並從 `window.DEFAULT_DATA` 顯示備援資料。

## 四、DEV 測試網址

PR 分支檔案：

```text
https://github.com/cheng-CHTechTW/cheng-CHTechTW.github.io/blob/codex/002-json-sync-prototype/dev-index.html
https://github.com/cheng-CHTechTW/cheng-CHTechTW.github.io/blob/codex/002-json-sync-prototype/dev-ihome.html
```

可嘗試 CDN 分支預覽：

```text
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-index.html
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-ihome.html
```

注意：CDN 快取可能需要幾分鐘更新。若看到舊內容，請稍後重新整理或加查詢參數。

## 五、使用說明

1. 先開 `dev-index.html`。
2. 看「資料來源」是否為 `JSON`。
3. 看版本號是否為 `006_v33`。
4. 看最新消息、關係企業、FAQ、表單設定數量是否符合預期。
5. 再開 `dev-ihome.html`。
6. 看愛家居品牌、電話、作品數是否正確。
7. 用手機、LINE 內建瀏覽器、桌機各開一次，確認都讀到 JSON。
8. 若顯示 `data.js`，表示 JSON 讀取失敗，需檢查部署路徑或分支預覽方式。

## 六、限制與注意事項

1. DEV 頁目前是資料摘要測試頁，不是正式網站版型。
2. DEV 頁不會覆寫正式站資料。
3. DEV 頁不會發布內容。
4. DEV 頁不會送出表單。
5. DEV 頁不會讀取 GitHub Token 或 Firebase Secret。
6. DEV 頁不會儲存客戶資料。
7. 正式 GitHub Pages 不一定服務 PR 分支，合併前請以 PR 檔案與 CDN 分支預覽檢查。

## 七、下一階段建議

下一階段可以進入：

```text
006_DEV_Render_Mapping_Test
```

建議內容：

1. 在 DEV 頁建立接近正式版型的 render mapping。
2. 將 `site-data.json`、`news.json`、`partners.json`、`faq.json` 套進 dev render。
3. 不修改正式 `index.html` / `ihome.html`。
4. 手機、LINE、桌機測試一致後，再評估正式頁接入。
