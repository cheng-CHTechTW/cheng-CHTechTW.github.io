# 誠創科技 GitHub Pages 形象網站

這是一套純靜態、可直接部署到 GitHub Pages 的形象網站。

## 專案內容

- `index.html`：網站首頁
- `assets/css/style.css`：全站版型與 RWD
- `assets/js/content.js`：服務、產品、公告、FAQ 等文字資料
- `assets/js/app.js`：選單、產品切換、FAQ、表單、動畫等互動
- `news/index.html`：最新公告頁（手風琴展開，一次只開一則）
- `admin/index.html`：靜態內容編輯工具，可下載新的 `content.js`
- `.github/workflows/pages.yml`：GitHub Pages 自動部署工作流程
- `.nojekyll`：避免 GitHub Pages 以 Jekyll 處理

## GitHub 部署方式

1. 在 GitHub 建立新的 repository。
2. 把本資料夾全部檔案上傳到 repository 根目錄。
3. 確認預設分支為 `main`。
4. GitHub → `Settings` → `Pages` → `Build and deployment`。
5. `Source` 選擇 **GitHub Actions**。
6. Push / Commit 後等待 `Actions` 的 Deploy GitHub Pages 完成。
7. 完成後 Pages 頁面會顯示網站網址。

## 修改內容

主要文字資料放在：

```text
assets/js/content.js
```

也可以打開：

```text
/admin/
```

使用內容編輯工具，修改 JSON 後下載新的 `content.js`，再覆蓋原檔並 commit。

## 聯絡表單

目前 GitHub Pages 是靜態網站，因此送出表單會開啟使用者的 Email 軟體，收件者為：

```text
service@chuang-c.com
```

如果要做到「網站直接送出 → 後台有客戶資料 → 寄通知信」，建議第二階段接 Cloudflare Pages Functions + D1 / Google Sheet / 自有 API。

## 自訂網域

若要綁定自訂網域，可在 GitHub Pages 設定 `Custom domain`，並依 GitHub 提示設定 DNS。


## 首頁圖片與公司 LOGO（V4）
請把以下兩個 SVG 檔放在 Repository 根目錄（與 `index.html` 同一層）：

- `chlogo.svg`：公司 LOGO，會顯示於導覽列與頁尾。
- `converted.svg`：首頁主視覺，會使用 `object-fit: cover` 鋪滿整個首頁 Hero 主視覺區。

> 檔名大小寫必須完全一致。GitHub Pages 為 Linux 環境，`CHLogo.svg` 與 `chlogo.svg` 會被視為不同檔案。


## 後台預覽
- 路徑：`/admin/`
- 介面預覽帳號：`admin`
- 介面預覽密碼：`1234`
- 此登入只供 GitHub Pages 靜態介面預覽，不是正式安全驗證。
- 正式後台請接伺服器端登入、Session/Token 與資料庫。

- 後台請使用明確網址：`admin/index.html#dashboard`，避免本機或伺服器顯示資料夾索引。

- 後台「查看前台 / 預覽網站」固定導向 `../index.html`，避免資料夾索引畫面。


## Google 試算表串接（V36 / V27 基準）

本版由 V27 回退後新增 Google Sheets 串接。

同一份試算表使用：
- 最新消息
- 客戶表單
- 常見問題

設定方式請看：
`google-apps-script/README.md`
