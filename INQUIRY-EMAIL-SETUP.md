# V71 客戶表單 Email 通知

Google 試算表「公司資訊」會新增：

- 欄位代碼：inquiry_email
- 欄位名稱：主要接收Email
- 預設內容：service@chuang-c.com
- 公開：FALSE

客戶提交表單時：

1. 寫入「客戶表單」
2. 自動寄 Email 到 inquiry_email
3. Email 內容包含：
   - 店名
   - 聯絡人
   - 聯絡電話
   - LINE ID
   - Email
   - 營業狀態
   - 需求
   - 備註
   - 提交時間
   - 表單編號

## 更改主要接收信箱

直接在 Google 試算表「公司資訊」頁籤修改：

`inquiry_email | 主要接收Email | 你的信箱 | FALSE`

## Apps Script 權限

第一次使用 MailApp 時，Google 會要求寄信權限。

請：
1. 儲存 Code.gs
2. 執行 setup()
3. 允許 Apps Script 的郵件傳送權限
4. 重新部署 Web App 新版本
