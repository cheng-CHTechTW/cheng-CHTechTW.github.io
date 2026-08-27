# V75 Email接收設定

新增獨立 Google 試算表頁籤：

Email接收設定

欄位：

ID | Email | 接收客戶表單 | 啟用 | 建立時間 | 更新時間

後台「公司資訊」中的客戶表單 Email 接收者直接讀寫這個頁籤。

修正：
Can't find variable: sessionToken

客戶表單只寄給：
- 接收客戶表單 = TRUE
- 啟用 = TRUE

忘記密碼仍使用「管理人員」頁籤的 Email，只寄給該管理員本人。

更新方式：
1. 更新 V75 Code.gs
2. 儲存
3. 執行 setup() 一次
4. 確認出現 Email接收設定 頁籤
5. 重新部署 Apps Script 新版本
