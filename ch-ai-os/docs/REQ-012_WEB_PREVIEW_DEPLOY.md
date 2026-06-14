# REQ-012：CH AI OS Web Preview 部署

## 基本資料

| 項目 | 內容 |
|---|---|
| 需求編號 | REQ-012 |
| 版本 | DEV-v0.3.0 |
| Checkpoint | Checkpoint-002 |
| Rule | DEV-RULE-v1.0 |
| 狀態 | DEV Web Preview Deployed |

## 目標

讓手機可以用 HTTPS 網址開啟 CH AI OS DEV-v0.3.0，不再使用本機路徑。

## 預覽網址

```text
https://cheng-chtechtw.github.io/ch-ai-os/
```

## 部署範圍

來源：`deploy/os/`

部署目標：`cheng-CHTechTW/cheng-CHTechTW.github.io`

部署路徑：`ch-ai-os/`

## 驗收項目

| 項目 | 狀態 | 備註 |
|---|---|---|
| HTTPS 預覽網址產生 | 已完成 | GitHub Pages 子路徑 |
| 不使用本機路徑 | 已完成 | 手機請使用 HTTPS |
| 手機可開啟 | 待 CEO 實機驗收 | 請用手機開啟網址 |
| iPhone Safari 可開啟 | 待 CEO 實機驗收 | Codex 無實體 iPhone |
| LINE 內建瀏覽器可開啟 | 待 CEO 實機驗收 | 請將網址貼到 LINE 測試 |

## 手機驗收方式

1. 用手機開啟 `https://cheng-chtechtw.github.io/ch-ai-os/`。
2. 確認 Landing Page 出現。
3. 點擊「登入系統」。
4. 確認 CEO 總控台可閱讀。
5. 點擊「開始 CEO 驗收」。
6. 把網址貼到 LINE，用 LINE 內建瀏覽器開啟。

## 限制

- 不上正式 `os.chuang-c.com`。
- 不接 Firebase。
- 不改正式官網。
- 不刪資料。
- 僅部署 DEV 預覽版。

## 備註

目前 Web Preview 重點是手機可開啟與 UAT 視覺驗收。完整 LocalStorage 任務/Bug 編輯功能仍以本機 DEV 包與後續完整部署包為準。
