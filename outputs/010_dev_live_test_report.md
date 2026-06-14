# 010 DEV Live Test Report

任務名稱：第六階段 DEV JSON 測試站實際網址驗證  
分支：`codex/002-json-sync-prototype`  
PR：#2  
測試日期：2026-06-14

## 一、實際可測試網址

### 1. DEV 誠創科技網址

```text
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-index.html
```

### 2. DEV 愛家居網址

```text
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-ihome.html
```

## 二、為什麼不用 jsDelivr 作為主要測試網址

同時測試過 jsDelivr：

```text
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-index.html
https://cdn.jsdelivr.net/gh/cheng-CHTechTW/cheng-CHTechTW.github.io@codex/002-json-sync-prototype/dev-ihome.html
```

HTTP 狀態是 200，但 HTML 檔案回傳：

```text
Content-Type: text/plain; charset=utf-8
```

這可能導致部分瀏覽器把頁面當純文字顯示。因此本階段實際測試網址改用 `raw.githack.com`，該服務回傳：

```text
Content-Type: text/html; charset=utf-8
```

較適合作為 PR 分支 HTML 預覽。

## 三、網站是否正常開啟

| 頁面 | URL | HTTP 狀態 | Content-Type | 結果 |
|---|---|---:|---|---|
| DEV 誠創科技 | `raw.githack ... /dev-index.html` | 200 | `text/html; charset=utf-8` | 通過 |
| DEV 愛家居 | `raw.githack ... /dev-ihome.html` | 200 | `text/html; charset=utf-8` | 通過 |

結論：兩個 DEV 頁面都可用公開網址開啟。

## 四、是否成功讀取 JSON

實測 JSON 檔案：

| 檔案 | HTTP 狀態 | Content-Type | 結果 |
|---|---:|---|---|
| `assets/data/site-data.json` | 200 | `application/json; charset=utf-8` | 通過 |
| `assets/data/news.json` | 200 | `application/json; charset=utf-8` | 通過 |
| `assets/data/partners.json` | 200 | `application/json; charset=utf-8` | 通過 |
| `assets/data/faq.json` | 200 | `application/json; charset=utf-8` | 通過 |
| `assets/data/forms-config.json` | 200 | `application/json; charset=utf-8` | 通過 |

JSON 內容驗證：

```text
siteVersion: 006_v33
news: 3
partners: 2
faq: 4
forms: 5
ihomeTitle: 愛家居系統櫥櫃
ihomePhone: 0955-149-470
ihomeCases: 25
```

結論：JSON 檔案可公開讀取，資料數量符合第四階段萃取結果。

## 五、是否顯示 JSON Source

DEV 頁面包含：

```html
<div class="value source" id="dataSource">讀取中</div>
```

`assets/js/dev-json-loader.js` 在 JSON 成功時會設定：

```text
source: JSON
```

本次實測確認：

1. 兩個 DEV 頁可開啟。
2. 五個 JSON 都回傳 200。
3. DEV loader 存在且可公開讀取。
4. 頁面有載入 `assets/js/dev-json-loader.js`。
5. 頁面有載入 `assets/js/data.js` 作 fallback。

因此正常情況下頁面應顯示：

```text
資料來源：JSON
```

限制說明：本次環境的瀏覽器自動化工具啟動失敗，因此未能在真實瀏覽器 DOM 執行後截圖；以上為公開 HTTP 與 loader 邏輯驗證。

## 六、JSON 損壞時是否 fallback 到 data.js

未破壞實際 JSON 檔案。

本次使用不存在的 JSON 路徑做 fallback 條件測試：

```text
assets/data/not-found-fallback-test.json
```

結果：

```text
HTTP 404
```

`assets/js/dev-json-loader.js` 使用 `Promise.all()` 讀取 JSON。任一 JSON 失敗時會進入：

```js
loadJsonBundle().catch(fallbackBundle)
```

fallback 後資料來源會變成：

```text
data.js
```

且使用：

```js
window.DEFAULT_DATA
```

結論：fallback 條件與程式邏輯成立。未進行破壞性 JSON 損壞測試，符合「不要刪除資料、不要破壞正式網站」限制。

## 七、手機版是否正常

靜態與 HTTP 檢查結果：

| 項目 | dev-index | dev-ihome | 結果 |
|---|---|---|---|
| `viewport` meta | 有 | 有 | 通過 |
| responsive grid | 有 | 有 | 通過 |
| 無表單提交 | 是 | 是 | 通過 |
| 無 localStorage 寫入 | 是 | 是 | 通過 |
| 只讀 JSON / data.js | 是 | 是 | 通過 |

兩個頁面都有：

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

並使用：

```css
grid-template-columns: repeat(auto-fit, minmax(...))
```

結論：手機版基礎相容性通過。仍建議使用實機手機開啟 raw.githack URL 進行最終目視確認。

## 八、LINE 內建瀏覽器是否正常

本環境無法啟動真實 LINE App 內建瀏覽器，因此無法完成真正 LINE App 實機測試。

已完成的 LINE WebView 相容性預檢：

1. 使用 HTTPS URL。
2. 無登入需求。
3. 無表單送出。
4. 無 popup。
5. 無下載行為。
6. 無相機、位置、麥克風權限。
7. 有 mobile viewport。
8. 只使用基本 HTML / CSS / fetch / DOM API。

結論：LINE 內建瀏覽器相容性預檢通過，但仍需使用手機 LINE App 實際點開以下網址確認：

```text
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-index.html
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-ihome.html
```

## 九、DEV 使用說明

### DEV 誠創科技

1. 開啟：

```text
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-index.html
```

2. 檢查「資料來源」是否顯示：

```text
JSON
```

3. 檢查數量：

```text
最新消息數：3
關係企業數：2
FAQ 數：4
表單設定數：5
```

### DEV 愛家居

1. 開啟：

```text
https://raw.githack.com/cheng-CHTechTW/cheng-CHTechTW.github.io/codex/002-json-sync-prototype/dev-ihome.html
```

2. 檢查「資料來源」是否顯示：

```text
JSON
```

3. 檢查內容：

```text
品牌：愛家居系統櫥櫃
電話：0955-149-470
作品數：25
```

## 十、正式頁保護確認

本階段未修改：

```text
index.html
ihome.html
admin.html
```

本階段未合併：

```text
main
```

PR #2 仍為 open 狀態。

## 十一、結論

1. DEV 誠創科技與 DEV 愛家居都有實際可測試網址。
2. raw.githack 預覽網址可正常開啟 HTML。
3. 五個 JSON 檔案都可公開讀取。
4. loader 已具備 JSON source 顯示與 data.js fallback 邏輯。
5. 手機版基礎相容性通過。
6. LINE 內建瀏覽器完成相容性預檢，但仍需手機 LINE App 實測。
7. 正式 `index.html`、`ihome.html`、`admin.html` 未修改。
8. PR 未合併 main。
