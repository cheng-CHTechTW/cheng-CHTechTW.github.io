# V69 engineer 登入驗證修復

目前出現「帳號或密碼不正確，或管理員已停用」時：

1. 將 V69 的 `google-apps-script/Code.gs` 完整更新到 Apps Script。
2. 儲存。
3. 在函式選單選擇：

`resetEngineerLogin`

4. 按「執行」。
5. 打開 Apps Script 的「執行記錄」。
6. 會看到：

- 帳號：engineer
- 一次性新密碼：16 碼
- 啟用：TRUE
- 權限代碼：ENGINEER

7. 再執行一次 Apps Script 新版本部署。
8. 回網站用新密碼登入。

注意：
- 不要把「密碼雜湊」當成登入密碼。
- 試算表不會保存明文密碼。
- `setup()` 在管理員已存在時不會重新產生密碼，所以登入失敗時使用 `resetEngineerLogin()`。
