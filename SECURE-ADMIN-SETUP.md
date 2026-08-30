# V66 Google 試算表與工程師管理員設定

## setup() 會建立的 7 個頁籤

1. 最新消息
2. 客戶表單
3. 常見問題
4. 公司資訊
5. 管理人員
6. 管理權限
7. 驗證紀錄

## 公司資訊預設內容

會在「公司資訊」自動建立：

- 誠創科技工作室
- CH 誠創 科技·設計
- https://chuang-c.com/
- service@chuang-c.com
- (02) 6623-7091
- @905dqqgw
- https://lin.ee/N8TErfC
- 新北市淡水區水源街二段177巷104號6樓
- 週一～週五 09:00～18:00
- chuang-c.com
- www.chuang-c.com
- POS系統、電子發票、多元支付、網站設計、客製系統、雲端服務
- © CH 誠創科技工作室

## 管理權限預設內容

只建立一組：

- 權限代碼：ENGINEER
- 權限名稱：工程師管理
- 所有後台模組：TRUE

## 管理人員預設內容

全新的「管理人員」頁籤只建立一位：

- 管理員ID：ADMIN-ENG-001
- 姓名：系統工程師
- 帳號：engineer
- 啟用：TRUE
- 權限代碼：ENGINEER

密碼鹽值與密碼雜湊由 Apps Script 自動產生。

明文密碼不會寫入 Google 試算表。

## 第一次執行

1. 將 V66 的 google-apps-script/Code.gs 完整貼到 Apps Script。
2. 儲存。
3. 執行 `setup()` 一次。
4. 打開 Apps Script「執行記錄」。
5. 找到：
   - 帳號：engineer
   - 一次性初始密碼：xxxxxxxxxxxxxxxx
6. 保存一次性密碼。
7. 部署 → 管理部署作業 → 編輯 → 新版本 → 部署。
8. 使用網站頁尾方形後台 ICON 登入。

## 已有舊管理資料時

為避免刪除既有帳號，`setup()` 不會覆蓋已存在的「管理人員 / 管理權限 / 公司資訊」。

若你確定要把這三個頁籤重建成 V66 的預設內容，可在 Apps Script 手動執行：

`resetSecurityDefaultsV66()`

注意：這個函式會清除既有管理人員、管理權限、公司資訊與驗證紀錄後重建，請確認後才執行。

## 驗證紀錄

只記錄：

- 驗證時間
- 帳號
- TRUE / FALSE
- 備註

不會記錄使用者輸入的密碼。
