# 008 DEV Site Plan

任務名稱：第五階段建立 DEV JSON 測試站  
分支：`codex/002-json-sync-prototype`  
PR：#2

## 一、目標

建立獨立 DEV 測試頁，驗證 JSON 同步資料是否能被瀏覽器讀取，不修改正式網站。

本階段不修改：

```text
index.html
ihome.html
admin.html
```

本階段不做：

```text
不合併 main
不修改正式站讀取流程
不串 GitHub Token
不串 Firebase 金鑰
不儲存客戶資料
```

## 二、本階段新增檔案

```text
dev-index.html
dev-ihome.html
assets/js/dev-json-loader.js
outputs/008_dev_site_plan.md
outputs/009_dev_site_test_report.md
```

## 三、DEV 測試頁用途

### `dev-index.html`

用途：驗證誠創科技主站 JSON 資料讀取。

顯示內容：

```text
資料來源：JSON 或 data.js
版本號
讀取時間
網站標題
電話
LINE
最新消息數
關係企業數
FAQ 數
表單設定數
```

### `dev-ihome.html`

用途：驗證愛家居公開資料是否可從 `site-data.json` 讀取。

顯示內容：

```text
資料來源：JSON 或 data.js
版本號
讀取時間
愛家居品牌名稱
愛家居電話
愛家居作品數
共用主站資料摘要
```

## 四、DEV Loader 設計

檔案：

```text
assets/js/dev-json-loader.js
```

讀取順序：

```text
assets/data/site-data.json
assets/data/news.json
assets/data/partners.json
assets/data/faq.json
assets/data/forms-config.json
↓ 任一 JSON 失敗
assets/js/data.js 的 window.DEFAULT_DATA
```

資料來源顯示：

```text
JSON
或
data.js
```

## 五、為什麼不用正式頁測試

正式 `index.html` / `ihome.html` 目前仍是正式站入口。第五階段只建立可審查的 DEV 測試站，不應讓使用者或客戶誤入尚未完整驗證的同步流程。

下一階段若要接正式流程，應先建立 dev render mapping，再進行手機、LINE、桌機測試。

## 六、DEV 測試網址

PR 分支檔案：

```text
https://github.com/cheng-CHTechTW/cheng-CHTechTW.github.io/blob/codex/002-json-sync-prototype/dev-index.html
https://github.com/cheng-CHTechTW/cheng-CHTechTW.github.io/blob/codex/002-json-sync-prototype/dev-ihome.html
```

可嘗試用 CDN 預覽分支 HTML：

```text
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-index.html
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-ihome.html
```

注意：正式 GitHub Pages 通常只服務指定發布分支，因此 PR 分支上的 DEV 頁不一定會出現在正式網域。合併前請以 PR 檔案或 CDN 分支預覽為主。

## 七、DEV 使用說明

1. 開啟 `dev-index.html` 測主站資料。
2. 確認「資料來源」顯示 `JSON`。
3. 確認版本號顯示 `006_v33`。
4. 確認最新消息數為 3。
5. 確認關係企業數為 2。
6. 確認 FAQ 數為 4。
7. 確認表單設定數為 5。
8. 開啟 `dev-ihome.html` 測愛家居資料。
9. 確認愛家居品牌、電話、作品數可顯示。
10. 若資料來源顯示 `data.js`，代表至少一個 JSON 讀取失敗，需要檢查檔案路徑或部署環境。
