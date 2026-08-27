# V73 客戶表單多 Email 收件者

## 功能
- 保留 V72 忘記密碼 Email 重設功能。
- 客戶送出表單後仍寫入 Google 試算表「客戶表單」。
- 同一份完整客戶資訊可同時寄給多個指定 Email。
- 後台「公司資訊」新增「客戶表單 Email 接收者」管理區。
- 可新增、移除收件者，再按「儲存至 Google 試算表」。
- Google 試算表仍使用 `公司資訊` 的 `inquiry_email` 一列，值以逗號分隔。
- 忘記密碼只寄給該管理人員自己的 Email，不會寄給客戶表單群組。

## 試算表範例
inquiry_email | 客戶表單接收Email（可多位） | service@chuang-c.com,sales@chuang-c.com,admin@chuang-c.com | FALSE

## Apps Script
V73 有修改 Code.gs，因此更新後：
1. 儲存 Code.gs
2. 執行 setup() 一次
3. 重新部署 Web App「新版本」
4. 網站的 google-sheets-config.js 繼續使用部署後的 /exec URL
