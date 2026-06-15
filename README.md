# 誠創科技 CMS V1

## 正式版網站
- 誠創官網：`index.html`（data-site-id="chtech"）
- 愛家居官網：`ihome.html`（data-site-id="ihome"）
- 後台管理：`admin-v2.html`（Firebase Auth 登入）

## CMS 架構
```
前台樣式固定 → 資料從 Firebase 讀取 → 圖片從 assets/sites/ 取用
後台 admin-v2.html → 修改 Firebase → 前台自動更新
```

## 檔案結構
```
assets/
├── css/
│   ├── style.css          前台主樣式
│   ├── admin.css          舊版後台樣式（admin.html 使用）
│   └── admin-v2.css       新版後台樣式
├── js/
│   ├── main.js            前台主邏輯
│   ├── data.js            前台資料（localStorage）
│   ├── admin.js           舊版後台邏輯
│   ├── firebase-config.js Firebase 設定
│   ├── cms-loader.js      前台 Firebase 資料載入
│   ├── form-renderer.js   表單自動產生
│   ├── admin-cms.js       新版後台邏輯
│   └── init-default-sites.js 初始化預設資料
├── images/                現有圖片資源
└── sites/
    ├── chtech/            誠創圖片（CMS V1 用）
    └── ihome/             愛家居圖片（CMS V1 用）
```

## Firebase 資料結構
```
sites/
├── chtech/  siteInfo, hero, services, partners, news, faq, shippingFlow, formConfig, formSubmissions, billing, modules
└── ihome/   siteInfo, hero, services, cases, news, faq, formConfig, formSubmissions, billing, modules
```

## 部署步驟
1. 設定 `assets/js/firebase-config.js` 填入真實 Firebase 資訊
2. 開啟 `admin-v2.html` 登入
3. 點「初始化 CMS」一鍵建立預設資料
4. 在 `index.html` body 加上 `data-site-id="chtech"`
5. 在 `ihome.html` body 加上 `data-site-id="ihome"`
