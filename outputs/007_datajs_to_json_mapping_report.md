# 007 Data.js to JSON Mapping Report

任務名稱：第四階段完整資料萃取與 JSON 對應  
PR：#2  
分支：`codex/002-json-sync-prototype`  
資料來源：`assets/js/data.js` 的 `window.DEFAULT_DATA`  
狀態：已補齊公開資料 JSON，未修改正式 `index.html` / `ihome.html`

## 一、data.js 主要資料區塊

`assets/js/data.js` 目前主要包含以下區塊：

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

## 二、已對應到哪個 JSON

### `assets/data/site-data.json`

已對應公開主站與愛家居公開內容：

```text
siteVersion
siteTitle
statsVisible
shippingVisible
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
ihomeConfig
ihomeCases
```

同時新增：

```text
_meta
extractedToSeparateFiles
excludedSensitiveKeys
```

用途：標記版本、來源、拆分關係與已排除的敏感欄位。

### `assets/data/news.json`

已對應：

```text
newsTitle -> title
newsDisplay -> display
news -> items
```

已保留正式資料：

```text
全新智能 POS 系統正式上市
耗材專區優惠活動開跑
線上支援服務升級
```

### `assets/data/partners.json`

已對應：

```text
partnersTitle -> title
partnersDisplay -> display
partners -> items
```

已保留正式資料：

```text
誠創科技
愛家居系統櫥櫃
```

並保留圖片、電話、LINE、Facebook、網站 URL、描述等欄位。

### `assets/data/faq.json`

已對應：

```text
faqTitle -> title
faqDisplay -> display
faqs -> items
```

欄位命名保留 `data.js` 既有結構：

```text
q
a
```

這樣後續接現有 render 流程時比較少轉換成本。

### `assets/data/forms-config.json`

已補齊公開表單 schema：

```text
publicSubmitConfig
storagePolicy
statuses
commonFields
forms
recordFieldsNotPublicData
```

已包含 5 種表單：

```text
contact
quote
registration
repair
customer_request
```

注意：此檔只保存公開欄位設定，不保存客戶送出資料。

## 三、尚未能對應的資料

以下資料刻意不放入公開 JSON：

```text
adminUsers
adminConfig
adminUsers.password
adminUsers.permissions
adminConfig.username
adminConfig.password
```

原因：

1. 這些是帳號、密碼或權限資料。
2. GitHub Pages JSON 是公開檔案。
3. 未來應移到 Firebase Auth、Firestore 或後端資料庫。

其他尚未拆分的資料：

```text
ihomeConfig
ihomeCases
```

目前先放在 `site-data.json`，因本階段只要求四個主要 JSON。下一階段若要支援愛家居獨立權限，建議拆成：

```text
assets/data/ihome-data.json
```

## 四、風險與注意事項

1. `site-data.json` 已比 prototype 完整很多，但現有正式渲染流程尚未接此 JSON。
2. 本次未修改 `index.html` / `ihome.html`，所以前台正式畫面不會因本次變更而改變。
3. `cloud-data-loader.js` 目前仍是 dev 測試載入器，尚未 mapping 到 `main.js` 的實際 render 流程。
4. `forms-config.json` 只能存公開欄位設定，不可存表單紀錄、內部備註、報價資料。
5. `data.js` 原本含有管理員帳密，本次已排除；後續不可把這些資料重新寫入公開 JSON。
6. `ihomeConfig` 與 `ihomeCases` 目前放在 `site-data.json`，未來做公司權限時應拆分，避免誠創科技主站與愛家居子站資料耦合。
7. 圖片路徑已保留原本相對路徑，但後續 dev 測試仍需確認 GitHub Pages 實際載入是否正常。

## 五、下一階段是否可以建立 dev 測試頁

可以。

建議下一階段任務名稱：

```text
005_JSON_Dev_Test_Page
```

建議內容：

1. 建立 dev 測試頁，不修改正式 `index.html` / `ihome.html`。
2. 引入 `assets/js/data.js` 作為 fallback。
3. 引入 `assets/js/cloud-data-loader.js`。
4. 顯示 JSON bundle 載入狀態、版本號、主要區塊筆數。
5. 驗證 `site-data.json`、`news.json`、`partners.json`、`faq.json` 是否可被瀏覽器讀取。
6. 驗證手機、LINE 內建瀏覽器、桌機讀到相同 JSON。
7. 再決定是否進入正式頁 dev 接入。

## 六、本階段遵守限制

- 未修改正式 `index.html`。
- 未修改正式 `ihome.html`。
- 未修改正式站讀取流程。
- 未合併 PR。
- 未刪除任何資料。
- 只提交到目前 PR #2 分支。
