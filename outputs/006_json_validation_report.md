# 006 JSON Validation Report

任務名稱：第三階段 JSON 同步架構驗證  
檢查對象：PR #2 / branch `codex/002-json-sync-prototype`  
基準資料：`main` branch 的 `assets/js/data.js`  
檢查日期：2026-06-14

## 一、總結

目前 PR #2 的 JSON 檔案與 `cloud-data-loader.js` 可作為「JSON 同步測試架構」骨架，但尚未完整對應目前正式 `assets/js/data.js`。

結論：

```text
目前狀態：可審查的 prototype
不可直接接正式 index.html / ihome.html
不可視為完整正式網站資料
```

主要原因：

1. `site-data.json` 只包含 `_meta`、`site`、`sync`，未包含 `data.js` 的完整網站內容欄位。
2. `news.json`、`partners.json`、`faq.json` 只有測試資料，未完整搬移 `data.js` 內的正式資料。
3. `forms-config.json` 作為公開表單設定合理，但尚未覆蓋現有 `data.js` 的 `formConfig` 發布設定。
4. `cloud-data-loader.js` 語法與方向可接受，但目前沒有版本比對、快取版本更新策略，也尚未接正式渲染流程。
5. 本 PR 沒有修改正式 `index.html` / `ihome.html`，符合限制。

## 二、檢查項目結果

| 項目 | 結果 | 說明 |
|---|---|---|
| `site-data.json` 是否完整對應 `data.js` | 未完成 | 目前只是一份 prototype metadata / site / sync 設定，不含主要渲染內容。 |
| `news.json` 是否完整 | 未完成 | 目前只有 1 筆測試消息，`data.js` 內有正式 `newsTitle`、`newsDisplay`、`news` 資料。 |
| `partners.json` 是否完整 | 未完成 | 目前只有簡化 partner 欄位，缺少正式圖片、電話、LINE、Facebook、display 設定等。 |
| `faq.json` 是否完整 | 未完成 | 目前只有 2 筆測試 FAQ，且欄位命名與 `data.js` 的 `faqs` 使用 `q` / `a` 不一致。 |
| `forms-config.json` 是否合理 | 部分合理 | 公開 schema 與狀態設定合理，但不可取代後端表單資料庫，也未完整整合 `data.js.formConfig`。 |
| `cloud-data-loader.js` 是否有錯誤 | 靜態檢查通過，但需補強 | 結構可讀、JSON-first 方向正確，但尚未接入正式頁，且缺版本更新策略。 |
| 是否支援版本號與快取更新 | 不完整 | JSON 有 `_meta.version`，loader 有 `cache: no-store`，但沒有版本比對、session/local 快取更新或 stale handling。 |
| 是否修改正式 `index.html` / `ihome.html` | 未修改 | Compare 顯示本 PR 變更 9 個檔案，不包含 `index.html` / `ihome.html`。 |

## 三、`site-data.json` 對應 `data.js` 完整度

目前 `site-data.json`：

```text
_meta
site
sync
```

目前 `data.js` 至少包含以下正式站資料：

```text
siteVersion
statsVisible
shippingVisible
siteTitle
adminUsers
adminConfig
appearanceConfig
editEntry
headerVisibility
navLabels
footerVisibility
contactFields
contact
quickToolVisibility
socialVisibility
socialIconVisibility
formConfig
hero
servicesTitle
servicesSubtitle
services
industriesTitle
industries
solutionsTitle
solutions
shippingTitle
shipping
stats
about
details
casesTitle
casesDisplay
cases
partnersTitle
partnersDisplay
partners
newsTitle
newsDisplay
news
faqTitle
faqDisplay
faqs
ihomeConfig
ihomeCases
```

### 需要排除的敏感資料

`data.js` 目前包含以下不應進公開 JSON 的資料：

```text
adminUsers
adminConfig.username
adminConfig.password
adminUsers.password
adminUsers.permissions
```

這些資料未來應移到 Firebase Auth / Firestore / 後端權限資料庫，不應放進 `site-data.json`。

### 建議拆分

建議未來不要把 `data.js` 全部塞進單一 JSON，而是拆分：

```text
assets/data/site-data.json       公開主站內容與版面設定
assets/data/news.json            最新消息
assets/data/partners.json        關係企業
assets/data/faq.json             FAQ
assets/data/ihome-data.json      愛家居內容
assets/data/forms-config.json    公開表單欄位設定
```

敏感資料改放：

```text
Firebase Auth / Firestore / 後端資料庫
```

## 四、`news.json` 檢查

目前 `news.json` 有：

```text
_meta
items[1]
```

`data.js` 目前有：

```text
newsTitle
newsDisplay
news[3]
```

缺口：

1. 缺 `newsTitle`。
2. 缺 `newsDisplay.visible`。
3. 缺 `newsDisplay.limit`。
4. 缺 `newsDisplay.mode`。
5. 正式消息有 3 筆，目前 JSON 只有 1 筆 prototype。
6. 欄位命名未完全確認能直接接現有 render 流程。

建議 schema：

```json
{
  "_meta": {},
  "title": "最新消息",
  "display": {
    "visible": true,
    "limit": 3,
    "mode": "more"
  },
  "items": []
}
```

## 五、`partners.json` 檢查

目前 `partners.json` 有 2 筆簡化資料。

`data.js` 目前 partners 相關資料包含：

```text
partnersTitle
partnersDisplay
partners[].visible
partners[].image
partners[].companyName
partners[].phone
partners[].lineUrl
partners[].facebookUrl
partners[].websiteUrl
partners[].description
```

缺口：

1. 缺 `partnersTitle`。
2. 缺 `partnersDisplay`。
3. 部分 partner 缺 `image`。
4. 部分 partner 缺 `phone`、`lineUrl`、`facebookUrl`。
5. 尚未確認愛家居資料是否應從 `partners.json` 或未來 `ihome-data.json` 讀取。

建議 schema：

```json
{
  "_meta": {},
  "title": "關係企業・一條龍服務",
  "display": {
    "visible": true,
    "limit": 4,
    "mode": "more"
  },
  "items": []
}
```

## 六、`faq.json` 檢查

目前 `faq.json` 有：

```text
items[].question
items[].answer
```

`data.js` 目前 FAQ 使用：

```text
faqTitle
faqDisplay
faqs[].q
faqs[].a
```

缺口：

1. 缺 `faqTitle`。
2. 缺 `faqDisplay`。
3. 欄位命名 `question/answer` 與現有 `q/a` 不一致。
4. 正式 FAQ 有 4 筆，目前 JSON 只有 2 筆 prototype。

建議二選一：

1. JSON 改成現有 render 可直接使用的 `q` / `a`。
2. loader 加 mapping，把 `question` / `answer` 轉成 `q` / `a`。

## 七、`forms-config.json` 檢查

目前 `forms-config.json` 包含：

```text
_meta
storagePolicy
statuses
forms
```

判斷：

1. 作為公開表單欄位 schema 合理。
2. 有明確寫出客戶資料不可放 GitHub，方向正確。
3. 狀態值包含：未處理、已聯絡、報價中、已成交、未成交、已結案，符合需求。

缺口：

1. 目前沒有 `repair` 維修申請表單。
2. 目前沒有 `customer_request` 客戶需求表單。
3. 未包含欄位驗證規則，如 required、type、label、maxLength。
4. 未與 `data.js.formConfig.googleScriptUrl`、`sheetUrl`、`notifyEmail` 做分工。

建議：

```text
forms-config.json 只保留公開欄位、label、required、type、options
Google Apps Script URL / Firebase endpoint 應由安全設定或後端配置管理
表單提交紀錄不可放 GitHub
```

## 八、`cloud-data-loader.js` 檢查

### 通過項目

1. 使用 IIFE，未污染過多全域，只掛 `window.ChengChuangCloudData`。
2. 使用 `fetch(path, { cache: "no-store" })`，方向符合 JSON 同步需求。
3. JSON 讀取失敗時 fallback 到 `window.DEFAULT_DATA` / `window.CC_DEFAULT_SITE_DATA`。
4. localStorage 只讀：

```text
cc_admin_draft
cc_admin_preview
```

5. 未讀 `cc_full_site_data` 作為正式資料。
6. 未讀 `cc_full_site_images` 作為正式圖片。
7. 未包含 GitHub Token、Firebase Secret 或客戶資料。

### 需要補強

1. 沒有版本比對邏輯。
2. 沒有 `siteVersion` / `_meta.version` 的快取更新策略。
3. `Promise.all` 會在任一 JSON 失敗時整包 fallback，未支援部分資料成功、部分失敗。
4. 沒有 timeout，若網路卡住可能等待較久。
5. 沒有 schema validation。
6. 沒有把 JSON bundle mapping 回現有 `data.js` 既有資料結構。
7. 尚未接正式 `index.html` / `ihome.html`，所以無法驗證實際畫面渲染。

## 九、版本號與快取更新

目前支援程度：部分支援。

已具備：

```text
JSON 檔有 _meta.version
loader 使用 cache: no-store
bundle 有 loadedAt
```

尚缺：

```text
版本比對
版本變更後重繪策略
sessionStorage 快取 key
localStorage 舊快取清理策略
siteVersion 與 _meta.version 對應規則
JSON 檔案版本一致性檢查
```

建議下一階段補：

```js
function getBundleVersion(bundle) {
  return bundle.siteData && bundle.siteData._meta && bundle.siteData._meta.version;
}
```

並建立：

```text
cc_json_bundle_version
cc_json_bundle_cache
cc_json_bundle_loaded_at
```

但這些只能作為快取輔助，不可讓 localStorage 重新變成正式資料庫。

## 十、是否修改正式 index.html / ihome.html

根據 PR compare，本 PR 目前變更檔案為：

```text
assets/data/faq.json
assets/data/forms-config.json
assets/data/news.json
assets/data/partners.json
assets/data/site-data.json
assets/js/cloud-data-loader.js
outputs/004_json_sync_prototype.md
outputs/005_sync_architecture.md
outputs/006_json_validation_report.md
```

未包含：

```text
index.html
ihome.html
```

結論：符合「不要修改正式網站」限制。

## 十一、驗證結論

目前 PR #2 可以保留作為：

```text
JSON 同步架構 prototype
資料拆分方向展示
loader 審查基礎
下一階段 dev 接入前置工作
```

但不能直接進入正式接入，原因：

```text
JSON 內容不完整
schema 與現有 render 流程尚未完全對應
版本快取策略不足
未經 index.html / ihome.html dev 接入測試
```

## 十二、建議下一階段

下一階段建議任務名稱：

```text
004_JSON_Data_Migration_Map
```

執行內容：

1. 建立 `data.js` 到 JSON 的欄位對照表。
2. 明確標記公開資料與敏感資料。
3. 把 `news`、`partners`、`faqs` 完整搬入對應 JSON。
4. 建立 `ihome-data.json`，避免愛家居資料混在主站 JSON。
5. 補 loader 的版本比對與部分失敗 fallback。
6. 在 dev branch 才接入 `index.html` / `ihome.html` 測試。
7. 測試手機、LINE 內建瀏覽器、桌機一致性。

## 十三、本階段遵守限制

- 未修改正式 `index.html`。
- 未修改正式 `ihome.html`。
- 未合併 PR。
- 未刪除任何資料。
- 未加入 GitHub Token。
- 未加入 Firebase 金鑰。
- 只新增驗證報告。
