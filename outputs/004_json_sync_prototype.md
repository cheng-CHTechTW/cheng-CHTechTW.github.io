# 004 JSON Sync Prototype

任務名稱：002_JSON_Sync_Prototype  
來源：GitHub Issue #1 最新留言  
狀態：dev 測試架構，尚未接入正式 index.html / ihome.html

## 本次新增與調整

新增測試資料檔：

```text
assets/data/news.json
assets/data/partners.json
assets/data/faq.json
assets/data/forms-config.json
```

更新既有測試資料檔：

```text
assets/data/site-data.json
```

新增資料載入器：

```text
assets/js/cloud-data-loader.js
```

新增文件：

```text
outputs/004_json_sync_prototype.md
outputs/005_sync_architecture.md
```

## 現行架構問題

目前正式站歷史上曾依賴 `localStorage` 儲存網站內容與圖片，例如：

```text
cc_full_site_data
cc_full_site_images
```

這會造成：

1. 手機、LINE 內建瀏覽器、桌機各自有不同 localStorage。
2. 管理員修改後，其他人的瀏覽器不一定同步。
3. LINE 內建瀏覽器常被視為另一個獨立環境。
4. 清除瀏覽資料或換設備後內容可能不一致。

## JSON 同步測試架構

本次建立 `assets/data/` 作為公開正式內容的測試來源：

```text
assets/data/site-data.json
assets/data/news.json
assets/data/partners.json
assets/data/faq.json
assets/data/forms-config.json
```

讀取順序：

```text
GitHub Pages JSON
↓ 讀取失敗
assets/js/data.js 的 window.DEFAULT_DATA
```

`localStorage` 在此測試載入器中只保留：

```text
cc_admin_draft
cc_admin_preview
```

用途：

1. 後台草稿。
2. 後台預覽。
3. dev 測試期間的人工確認。

## 尚未接正式站

本次依 Issue 限制，不修改：

```text
index.html
ihome.html
```

因此 `assets/js/cloud-data-loader.js` 目前只是可審查、可測試、可接入的同步載入器，尚未影響正式網站顯示。

## 下一步如何接入 index.html / ihome.html

等使用者確認本 PR 後，下一階段可在 dev 分支做：

1. 在 `index.html` 引入 `assets/js/cloud-data-loader.js`。
2. 在 `ihome.html` 引入 `assets/js/cloud-data-loader.js`。
3. 在現有 render 流程前呼叫：

```js
window.ChengChuangCloudData.loadOfficialData().then(function (bundle) {
  // 將 bundle.siteData / bundle.news / bundle.partners / bundle.faq 套入現有渲染流程
});
```

4. 確認正式前台不再優先讀 `cc_full_site_data` / `cc_full_site_images`。
5. 保留 `assets/js/data.js` 作為 JSON 失敗時的預設資料。

## 如何避免手機、LINE、桌機顯示不同

1. 正式資料以 GitHub Pages JSON 為唯一公開來源。
2. 前台每次載入使用 `fetch(..., { cache: "no-store" })` 取得最新 JSON。
3. localStorage 不再作為正式資料庫。
4. 後台發布時只更新 JSON 或未來 Firebase，不直接要求每台裝置自己保存內容。
5. 若 JSON 讀取失敗，只回到 `data.js` 預設資料，不使用其他裝置的舊 localStorage 當正式內容。

## Firebase 預留位置

目前不需要 Firebase 金鑰。後續可將以下資料移入 Firebase：

```text
form_submissions
users
roles
audit_logs
site_versions
notifications
```

公開內容仍可保留在 GitHub Pages JSON，敏感資料不可放 GitHub。

## GitHub 發布流程

建議流程：

```text
GitHub Issue
↓
Codex / AI 工程師建立 dev branch
↓
新增或修改測試架構
↓
提交 Pull Request
↓
使用者在 GitHub PR 審核
↓
確認後才合併到 main
```

本次 PR 只建立 dev 測試架構，不正式發布。

## 表單中心提醒

`forms-config.json` 只放公開表單欄位設定，不存任何客戶送出資料。

禁止放入 GitHub 的資料：

```text
客戶表單資料
內部備註
報價紀錄
管理員帳密
GitHub Token
Firebase Secret
```

正式表單資料需存：

```text
Google Sheet / Firebase Firestore / 後端資料庫
```
