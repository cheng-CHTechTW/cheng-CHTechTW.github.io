# 005 Sync Architecture

任務名稱：002_JSON_Sync_Prototype  
目的：建立 JSON-first 測試架構，作為後續接入正式站前的審查基礎。

## 1. 現行架構

既有網站主要檔案包含：

```text
index.html
ihome.html
assets/js/data.js
assets/js/main.js
assets/js/admin.js
```

目前正式站已有雲端同步與 localStorage 備援的歷史邏輯。第二階段先不直接修改正式入口頁，而是新增獨立 JSON 載入器與資料檔，讓同步方式可以先被 PR 審查。

## 2. JSON 架構

公開內容資料：

```text
assets/data/site-data.json
assets/data/news.json
assets/data/partners.json
assets/data/faq.json
assets/data/forms-config.json
```

責任分工：

```text
site-data.json      主網站公開設定與同步規則
news.json           最新消息
partners.json       關係企業 / 合作夥伴
faq.json            常見問題
forms-config.json   公開表單欄位與狀態設定
```

這些檔案可以被 GitHub Pages 直接讀取，因此所有裝置都會指向同一份公開資料。

## 3. 資料載入器

新增：

```text
assets/js/cloud-data-loader.js
```

功能：

1. 使用 `fetch(..., { cache: "no-store" })` 優先讀取 `assets/data/*.json`。
2. JSON 讀取失敗時回到 `assets/js/data.js` 提供的 `window.DEFAULT_DATA`。
3. 只保留 `cc_admin_draft` 與 `cc_admin_preview` 作為草稿與預覽。
4. 不讀取 `cc_full_site_data` 作為正式資料來源。
5. 不讀取 `cc_full_site_images` 作為正式圖片來源。

## 4. localStorage 規則

允許：

```text
cc_admin_draft
cc_admin_preview
```

用途：

```text
後台草稿
後台預覽
dev 測試
```

不作為正式來源：

```text
cc_full_site_data
cc_full_site_images
login
form_submissions
```

## 5. Firebase 預留位置

第二階段不需要 Firebase 金鑰，也不新增 Firebase 初始化。

未來建議 Firebase 負責：

```text
Authentication       管理員登入
Firestore            表單資料、權限、操作紀錄、版本紀錄
Cloud Functions      發布、通知、權限驗證
Firebase Storage     附件與圖片
```

公開 JSON 與 Firebase 的分工：

```text
GitHub JSON：公開網站內容
Firebase：敏感資料、表單紀錄、權限、操作紀錄
```

## 6. GitHub 發布流程

建議採用：

```text
Issue 建立需求
↓
建立 codex/dev 分支
↓
提交 PR
↓
PR 中說明新增檔案、未接正式站的部分、下一步接入方式
↓
使用者審核
↓
確認後再合併
```

正式更新 JSON 的未來流程：

```text
後台編輯
↓
儲存草稿
↓
預覽
↓
送出發布
↓
後端或 Cloud Function 驗證權限
↓
更新 GitHub JSON 或 Firebase 正式資料
↓
所有裝置讀同一份公開資料
```

## 7. 安全限制

不可放入 GitHub 公開檔案：

```text
客戶表單資料
管理員帳號密碼
GitHub Token
Firebase Secret
權限資料
驗證碼
內部備註
報價紀錄
```

`forms-config.json` 只可放公開欄位定義與狀態選項，不可放表單送出紀錄。

## 8. 下一步

本 PR 合併前不改正式入口頁。

使用者確認後，下一階段才處理：

1. 將 loader 接入 `index.html` / `ihome.html` 的 dev 測試版。
2. 對照現有 `main.js` render 流程，將 JSON bundle 套入畫面。
3. 測試手機、LINE 內建瀏覽器、桌機一致性。
4. 檢查 localStorage 清空後前台仍能正常顯示公開資料。
