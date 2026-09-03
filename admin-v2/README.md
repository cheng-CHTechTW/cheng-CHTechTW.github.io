# CH CMS V2 部署說明

## 架構
```
Cloudflare Pages  → 前台網站（靜態）
Pages Functions   → 後台 API（/api/*）
Cloudflare D1     → 資料庫（唯一資料來源 SSOT）
Cloudflare R2     → 圖片儲存（CDN）
GitHub            → 版本控制 + 觸發部署
```

## 部署步驟

### 1. 安裝 Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. 建立 D1 資料庫
```bash
wrangler d1 create ch-cms-db
# 複製輸出的 database_id 填入 wrangler.toml

wrangler d1 execute ch-cms-db --file=schema/d1_schema.sql
```

### 3. 建立 R2 儲存桶
```bash
wrangler r2 bucket create ch-cms-media
# Cloudflare Dashboard → R2 → 設定自訂域名（如 media.chuang-c.com）
```

### 4. 設定環境變數
在 Cloudflare Pages Dashboard → Settings → Environment Variables：
```
JWT_SECRET     = 隨機 32 字元以上字串
R2_PUBLIC_URL  = https://media.chuang-c.com
GITHUB_TOKEN   = GitHub Personal Access Token（repo 權限）
ALLOWED_ORIGIN = https://chuang-c.com
```

### 5. 部署到 Cloudflare Pages
```bash
# 連結 GitHub 倉庫到 Cloudflare Pages
# Build command: （空白，純靜態）
# Build output: /
# Root directory: /
```

### 6. 初始化管理員密碼
第一次登入使用 `chengchuang1012@gmail.com` / `123456`
系統會要求立即更改密碼。

## 目錄結構
```
ch-cms-v2/
├── admin/
│   └── index.html      # 後台入口（/admin/）
├── functions/
│   └── api/
│       ├── _middleware.js  # JWT + CORS + 工具
│       ├── auth.js         # 登入/改密碼
│       ├── company.js      # 公司資料（SSOT）
│       ├── users.js        # 帳號管理 + LOG
│       ├── media.js        # R2 圖片
│       ├── github.js       # GitHub 狀態
│       └── forms.js        # 表單回覆
├── schema/
│   └── d1_schema.sql   # 資料庫結構
└── wrangler.toml       # Cloudflare 設定
```

## SSOT 原則
**所有 LINE URL、公司名稱、QR 圖片路徑只存一個地方：**
```
D1: company_profiles 表
```
任何前台讀取：呼叫 `/api/company/:siteId` → 前台 JS 注入到所有元素

## 前台整合
在 `index.html` 和 `ihome.html` 加入：
```html
<script>
// 從 API 讀取公司資料（一次性，取代所有 localStorage 讀取）
fetch('/api/company/chtech')
  .then(r => r.json())
  .then(({ data }) => {
    // LINE
    document.querySelectorAll('[data-line]').forEach(el => el.href = data.line_url);
    document.querySelectorAll('a[href*="line"]').forEach(el => el.href = data.line_url);
    // QR
    const qr = document.getElementById('lineQrImgEl');
    if (qr) qr.src = data.line_qr_url;
    // 公司名稱
    document.querySelectorAll('[data-company-name]').forEach(el => el.textContent = data.company_name);
  });
</script>
```
這樣前台永遠讀最新的資料，不再有快取問題。
