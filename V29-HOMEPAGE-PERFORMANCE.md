# V29｜CH-WEB 首頁行動版效能優化

本版依 PageSpeed Insights 行動版檢測結果進行效能調整，未修改首頁版面、文字內容、功能流程或電子發票頁內容。

## 已調整
- 首頁 LCP 封面圖：將 `converted.svg` 內嵌的原始 JPEG 原樣抽出為 `assets/img/hero/converted-hero.jpg`，畫面內容不變。
- LCP 圖片加入 `fetchpriority="high"` 與 `<link rel="preload">`。
- LCP 圖片加入明確 `width="1672" height="834"`。
- 移除不必要的社群分享圖瀏覽器 preload；OG/LINE 分享設定保留。
- 顯示用 LOGO 改為輕量 `assets/img/chlogo-display.webp`；原始 `chlogo.svg` 保留。
- favicon 改用輕量 `chlogo-favicon.png`，減少瀏覽器為頁籤圖示下載大型 SVG。
- `one-stop-pos.svg` 顯示改用 `assets/img/one-stop-pos.webp`，並設定 lazy loading；原始 SVG 保留。
- 動態產業與產品圖片補上尺寸及 `decoding="async"`。
- tracking / security scripts 改為 defer，保留原功能。

## 檢測
- 全部 `.js`：`node --check` PASS
- 全部 Google Apps Script `.gs`：轉 JS 後 `node --check` PASS
- `INV-07` Page 7 inline JavaScript：5 段全部 `node --check` PASS

## 上線後建議
重新用 PageSpeed Insights 測試 `https://www.chuang-c.com/` 行動裝置。Lighthouse 分數每次測試會波動，應主要比較 LCP、Speed Index、總下載量與診斷項目是否改善。
