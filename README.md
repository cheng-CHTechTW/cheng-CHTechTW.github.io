# 誠創科技 V27 基準版：Google 試算表完整串接

本版功能：

- 前台客戶諮詢表單 → Google 試算表 `客戶表單`
- 前台最新消息 ← Google 試算表 `最新消息`
- 前台常見問題 ← Google 試算表 `常見問題`
- 誠創後台直接管理三個頁籤

---

# 一、先建立 Google 試算表

1. 登入 Google。
2. 前往 Google 試算表。
3. 建立一份空白試算表。
4. 建議名稱：

   `誠創科技網站資料`

不需要先手動建立頁籤，Apps Script 第一次執行時會自動建立：

- 最新消息
- 客戶表單
- 常見問題

---

# 二、開啟 Apps Script

在剛建立的 Google 試算表：

1. 點上方「擴充功能」。
2. 點「Apps Script」。
3. 會開啟新的 Apps Script 編輯器。
4. 把原本的 `function myFunction()` 全部刪除。
5. 打開網站專案裡：

   `google-apps-script/Code.gs`

6. 全部複製。
7. 貼到 Apps Script 的 `Code.gs`。
8. 按儲存。

---

# 三、設定 Apps Script 時區

Apps Script：

1. 左側「專案設定」。
2. 時區設定為：

   `GMT+08:00 Taipei`

這樣提交時間與台灣時間一致。

---

# 四、執行 setup() 建立頁籤＋匯入目前網站內容

Apps Script 上方函式選擇：

`setup`

然後按「執行」。

`setup()` 會自動完成：

1. 建立 `最新消息`
2. 建立 `客戶表單`
3. 建立 `常見問題`
4. 將目前 V27 的預設最新消息寫進 `最新消息`
5. 將目前 V27 的預設常見問題寫進 `常見問題`

注意：

- 只有當頁籤目前沒有資料時才會匯入預設內容。
- 已經有資料時不會重複新增。

第一次執行會要求 Google 權限：

1. 點「審查權限」。
2. 選你的 Google 帳號。
3. 如出現未驗證警告：
   - 點「進階」
   - 點「前往專案名稱（不安全）」
4. 點「允許」。

執行後，回到 Google 試算表，確認三個頁籤都存在，而且：

- `最新消息` 已有網站目前公告資料
- `常見問題` 已有網站目前 FAQ
- `客戶表單` 目前只有欄位標題，等待客戶送表單

---

# 五、部署 Apps Script 為 Web App

Apps Script 右上：

1. 點「部署」。
2. 點「新增部署作業」。
3. 類型選「網頁應用程式」。
4. 描述可填：

   `誠創網站 API V1`

5. 執行身分：

   `我`

6. 誰可以存取：

   `任何人`

7. 點「部署」。
8. 再次授權。
9. 部署完成會取得 Web App 網址，例如：

```text
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

把這串網址複製起來。

---

# 六、把 Web App URL 填入網站

打開：

`assets/js/google-sheets-config.js`

找到：

```javascript
webAppUrl: '',
```

改成：

```javascript
webAppUrl: 'https://script.google.com/macros/s/你的ID/exec',
```

注意：

- 一定要保留 `/exec`
- 不要使用 `/dev`
- 不要多空格

---

# 七、上傳 GitHub Pages

把整個網站更新到 GitHub repository。

確認至少包含：

- `index.html`
- `admin/index.html`
- `assets/js/google-sheets-config.js`
- `assets/js/content.js`
- `assets/js/app.js`
- `admin/admin.js`
- `google-apps-script/Code.gs`

GitHub Pages 部署完成後重新整理正式網站。

---

# 八、測試 Google API

瀏覽器直接打開：

```text
你的WebApp網址?action=ping
```

正常應看到類似：

```json
{
  "ok": true,
  "service": "ChengChuang Google Sheets API"
}
```

---

# 九、測試前台客戶表單

誠創前台：

1. 點「聯絡我們」或諮詢按鈕。
2. 填：
   - 姓名 / 店名
   - 電話
   - Email
   - LINE ID
   - 需求項目
   - 需求內容
3. 點「送出」。

成功後：

Google 試算表 → `客戶表單`

會自動新增一列：

- 編號
- 提交時間
- 姓名/店名
- 電話
- Email
- LINE ID
- 需求項目
- 需求內容
- 未讀
- 未處理

---

# 十、後台管理客戶表單

登入：

`/admin/index.html`

預覽帳號：

- 帳號：`admin`
- 密碼：`1234`

進入：

`表單洽詢`

後台會直接讀取 Google 試算表 `客戶表單`。

可：

- 日期區間篩選
- 需求類別篩選
- 處理狀態篩選
- 關鍵字搜尋
- 點客戶查看完整填表內容
- 標記已讀
- 改成：
  - 未處理
  - 處理中
  - 已完成

這些操作會直接寫回 Google 試算表。

---

# 十一、後台管理最新消息

誠創後台：

`最新消息`

可：

- 新增
- 修改
- 刪除
- 啟用
- 停用

資料直接寫到：

`最新消息`

頁籤欄位：

- ID
- 發布日期
- 月日
- 標題
- 內容
- 啟用
- 更新時間

前台只讀取「啟用」的最新消息。

---

# 十二、後台管理常見問題

誠創後台：

`常見問題`

可：

- 新增
- 修改
- 刪除
- 排序
- 啟用
- 停用

資料寫到：

`常見問題`

欄位：

- ID
- 排序
- 問題
- 答案
- 啟用
- 更新時間

前台依「排序」顯示，並只顯示啟用項目。

---

# 十三、Google 試算表三頁籤用途

## 最新消息
後台管理，前台讀取。

## 客戶表單
客戶前台送入，誠創後台讀取與處理。

## 常見問題
後台管理，前台讀取。

---

# 十四、重要：修改 Apps Script 後要重新部署

如果以後修改：

`Code.gs`

要：

1. Apps Script → 部署。
2. 管理部署作業。
3. 編輯目前部署。
4. 版本選「新版本」。
5. 點部署。

網址通常不用改。

如果只是修改 GitHub 網站 JavaScript，不需要重新部署 Apps Script。

---

# 十五、正式安全建議

目前 GitHub Pages + Apps Script 是適合這種形象網站 / 表單 CMS 的輕量方案。

但因為 Web App 設定為「任何人」才能讓公開前台提交表單，因此不要在 Apps Script API 放：

- 密碼
- API Secret
- GitHub Token
- 客戶敏感資料
- 員工機密資料

本 API 只用於公開網站內容與一般洽詢表單。

如果未來需要會員、員工、客戶隱私資料或正式權限控管，應升級為 Cloudflare Functions / 自有 API + 資料庫。
