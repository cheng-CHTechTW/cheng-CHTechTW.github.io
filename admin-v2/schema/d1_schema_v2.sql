-- CH CMS V2 + Auto Site Builder
-- 完整資料庫結構（D1 SQLite）

PRAGMA journal_mode = WAL;

-- ════════════════════════════════════════════
-- 核心：多網站
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sites (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand_name      TEXT,
  domain          TEXT NOT NULL,
  path            TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'staging',
  -- staging | active | suspended | building
  template_id     TEXT,
  color_primary   TEXT DEFAULT '#2563eb',
  color_secondary TEXT DEFAULT '#1e293b',
  font_heading    TEXT DEFAULT 'Noto Serif TC',
  font_body       TEXT DEFAULT 'Noto Sans TC',
  github_repo     TEXT,
  github_branch   TEXT DEFAULT 'main',
  staging_url     TEXT,
  production_url  TEXT,
  created_by      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 模板系統
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS templates (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  -- tech|food|home|beauty|retail|funeral|landing|multipage
  description     TEXT,
  preview_r2key   TEXT,
  supports_multipage  INTEGER DEFAULT 0,
  supports_form       INTEGER DEFAULT 1,
  supports_seo        INTEGER DEFAULT 1,
  is_active       INTEGER DEFAULT 1,
  created_by      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- 模板頁面（一套模板可以有多個頁面）
CREATE TABLE IF NOT EXISTS template_pages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  page_key    TEXT NOT NULL, -- 'home'|'about'|'service'|'case'|'faq'|'contact'
  name        TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  html_template   TEXT NOT NULL DEFAULT '', -- Handlebars 語法
  css_template    TEXT NOT NULL DEFAULT '',
  UNIQUE(template_id, page_key)
);

-- 模板區塊（每個頁面有多個可編輯區塊）
CREATE TABLE IF NOT EXISTS template_sections (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  page_id      TEXT NOT NULL REFERENCES template_pages(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  name         TEXT NOT NULL,
  sort_order   INTEGER DEFAULT 0,
  field_schema TEXT NOT NULL DEFAULT '[]', -- JSON array 定義可編輯欄位
  -- [{"key":"title","type":"text","label":"標題","required":true},...]
  default_data TEXT DEFAULT '{}'
);

-- 色系設定（綁定模板）
CREATE TABLE IF NOT EXISTS template_themes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_primary   TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_accent    TEXT,
  color_bg        TEXT,
  color_text      TEXT,
  is_default  INTEGER DEFAULT 0
);

-- ════════════════════════════════════════════
-- 每個網站的頁面（從模板複製，獨立存在）
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_pages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id     TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_key    TEXT NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL DEFAULT '',
  is_enabled  INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  seo_title   TEXT,
  seo_desc    TEXT,
  og_image_r2key TEXT,
  template_page_id TEXT REFERENCES template_pages(id),
  UNIQUE(site_id, page_key)
);

-- 每個網站每個區塊的實際內容
CREATE TABLE IF NOT EXISTS site_sections (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id      TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id      TEXT NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  is_enabled   INTEGER DEFAULT 1,
  sort_order   INTEGER DEFAULT 0,
  content_data TEXT NOT NULL DEFAULT '{}', -- JSON，實際內容
  UNIQUE(site_id, page_id, section_key)
);

-- ════════════════════════════════════════════
-- 公司基本資料（SSOT - 唯一來源）
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_profiles (
  site_id         TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL DEFAULT '',
  brand_name      TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  business_hours  TEXT DEFAULT '',
  line_url        TEXT DEFAULT '',  -- 唯一來源：全站所有 LINE 按鈕讀這裡
  line_id         TEXT DEFAULT '',
  line_qr_r2key   TEXT DEFAULT '',  -- 唯一來源：QR 圖片
  fb_url          TEXT DEFAULT '',
  ig_url          TEXT DEFAULT '',
  youtube_url     TEXT DEFAULT '',
  copyright       TEXT DEFAULT '',
  footer_text     TEXT DEFAULT '',
  seo_title       TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  og_title        TEXT DEFAULT '',
  og_description  TEXT DEFAULT '',
  og_image_r2key  TEXT DEFAULT '',
  logo_r2key      TEXT DEFAULT '',
  favicon_r2key   TEXT DEFAULT '',
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 帳號系統
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'site_admin',
  -- super_admin | site_admin | client
  must_change_pw  INTEGER NOT NULL DEFAULT 1,
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_login_at   TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_site_access (
  user_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
  site_id  TEXT REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
  site_id  TEXT REFERENCES sites(id) ON DELETE CASCADE,
  feature  TEXT NOT NULL,
  -- company_info|banner|seo|forms|media|github|users|templates
  PRIMARY KEY (user_id, site_id, feature)
);

-- ════════════════════════════════════════════
-- 媒體資產
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS media_assets (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id     TEXT REFERENCES sites(id),
  r2_key      TEXT NOT NULL UNIQUE,
  public_url  TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER,
  width       INTEGER,
  height      INTEGER,
  category    TEXT,
  alt_text    TEXT DEFAULT '',
  uploaded_by TEXT REFERENCES users(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 表單
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_submissions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id     TEXT REFERENCES sites(id),
  form_type   TEXT NOT NULL DEFAULT 'contact',
  data        TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  read_status INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 部署任務（建站流程 19 步驟）
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployment_jobs (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id     TEXT NOT NULL REFERENCES sites(id),
  job_type    TEXT NOT NULL DEFAULT 'create_site',
  -- create_site | update_site | publish | rollback
  status      TEXT NOT NULL DEFAULT 'pending',
  -- pending | running | success | failed
  steps       TEXT NOT NULL DEFAULT '[]', -- JSON array of step results
  triggered_by TEXT REFERENCES users(id),
  started_at  TEXT,
  finished_at TEXT,
  error_msg   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 部署步驟記錄
CREATE TABLE IF NOT EXISTS deployment_logs (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  job_id      TEXT NOT NULL REFERENCES deployment_jobs(id) ON DELETE CASCADE,
  step_key    TEXT NOT NULL,
  step_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  message     TEXT,
  started_at  TEXT,
  finished_at TEXT
);

-- ════════════════════════════════════════════
-- GitHub 同步狀態
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS github_sync (
  site_id         TEXT PRIMARY KEY REFERENCES sites(id),
  last_commit_sha TEXT,
  last_commit_msg TEXT,
  last_push_at    TEXT,
  deploy_status   TEXT DEFAULT 'unknown',
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 審計 LOG
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id     TEXT,
  user_email  TEXT,
  site_id     TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════════
-- 預設資料
-- ════════════════════════════════════════════
INSERT OR IGNORE INTO sites VALUES
  ('chtech','誠創科技','誠創科技','https://chuang-c.com','','active',
   NULL,'#2563eb','#0f172a','Noto Sans TC','Noto Sans TC',
   'cheng-CHTechTW/cheng-CHTechTW.github.io','main',
   NULL,'https://chuang-c.com','master',datetime('now'),datetime('now')),
  ('ihome','愛家居系統櫥櫃','愛家居','https://chuang-c.com','/ihome.html','active',
   NULL,'#c5a880','#0a0c10','Noto Serif TC','Noto Sans TC',
   'cheng-CHTechTW/cheng-CHTechTW.github.io','main',
   NULL,'https://chuang-c.com/ihome.html','master',datetime('now'),datetime('now'));

INSERT OR IGNORE INTO company_profiles
  (site_id,company_name,line_url,line_id,copyright)
  VALUES
  ('chtech','誠創科技','https://lin.ee/RbGc5o5','',
   '© 2024 誠創科技'),
  ('ihome','愛家居系統櫥櫃','https://line.me/ti/p/srXWyJcOCT','srXWyJcOCT',
   '© 2024 愛家居系統櫥櫃');

INSERT OR IGNORE INTO users
  (id,email,display_name,password_hash,role,must_change_pw)
  VALUES ('master','chengchuang1012@gmail.com','誠創工程師','INIT_SEED','super_admin',0);

INSERT OR IGNORE INTO user_site_access VALUES
  ('master','chtech'),('master','ihome');

INSERT OR IGNORE INTO github_sync (site_id) VALUES ('chtech'),('ihome');

-- 預設模板
INSERT OR IGNORE INTO templates
  (id,name,category,description,supports_multipage,supports_form,is_active)
  VALUES
  ('tpl-tech','科技企業形象網站','tech','POS、IT、軟體公司專用，深色科技風',1,1,1),
  ('tpl-home','居家裝修形象網站','home','系統櫃、室內設計、裝潢，暗金奢華風',1,1,1),
  ('tpl-food','餐飲店家網站','food','餐廳、咖啡廳、手搖飲，溫暖食品風',1,1,1),
  ('tpl-beauty','美業形象網站','beauty','美容、美甲、美睫，粉嫩輕奢風',1,1,1),
  ('tpl-landing','一頁式 Landing Page','landing','快速建站，單頁，行銷活動專用',0,1,1);
