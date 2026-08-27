# SEO / Google Ads 設定（V55）

已完成：

- 首頁 Title / Description / Canonical
- News 頁 Title / Description / Canonical
- Open Graph / LINE 分享
- Organization / WebSite / Service JSON-LD
- Breadcrumb JSON-LD
- robots.txt
- sitemap.xml
- admin noindex
- site.webmanifest
- hreflang
- Googlebot indexing directives
- Google Analytics / Google Ads 預留設定

## Google Search Console
發布後將下列 Sitemap 提交到 Search Console：

https://www.chuang-c.com/sitemap.xml

## Google Ads / GA4
打開：

assets/js/tracking-config.js

填入自己的正式 ID，例如：

ga4MeasurementId: 'G-XXXXXXXXXX'
googleAdsId: 'AW-XXXXXXXXX'

沒有填 ID 時，網站不會載入 Google tracking script。

## 重要
SEO 可以提升搜尋理解、索引與落地頁品質，但 Google Ads 成效仍會受到：
- 關鍵字
- 廣告文案
- 出價
- 地區
- 轉換追蹤
- 頁面速度
- 使用者體驗
等因素影響。
