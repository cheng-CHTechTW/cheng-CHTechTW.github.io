-- CH CMS V2 Staging Schema
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'staging',
  template_id TEXT,
  color_primary TEXT DEFAULT '#2563eb',
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  staging_url TEXT,
  production_url TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_profiles (
  site_id TEXT PRIMARY KEY REFERENCES sites(id),
  company_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  line_url TEXT DEFAULT '',
  line_id TEXT DEFAULT '',
  line_qr_r2key TEXT DEFAULT '',
  fb_url TEXT DEFAULT '',
  ig_url TEXT DEFAULT '',
  copyright TEXT DEFAULT '',
  logo_r2key TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'site_admin',
  must_change_pw INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_site_access (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  supports_form INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id TEXT REFERENCES sites(id),
  form_type TEXT NOT NULL DEFAULT 'contact',
  data TEXT NOT NULL,
  ip TEXT,
  read_status INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT,
  user_email TEXT,
  site_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deployment_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'create_site',
  status TEXT NOT NULL DEFAULT 'pending',
  steps TEXT NOT NULL DEFAULT '[]',
  triggered_by TEXT,
  started_at TEXT,
  finished_at TEXT,
  error_msg TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS github_sync (
  site_id TEXT PRIMARY KEY,
  last_commit_sha TEXT,
  last_commit_msg TEXT,
  last_push_at TEXT,
  deploy_status TEXT DEFAULT 'unknown',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 預設資料
INSERT OR IGNORE INTO sites VALUES
  ('chtech','誠創科技','https://chuang-c.com','','active',NULL,'#2563eb',
   'cheng-CHTechTW/cheng-CHTechTW.github.io','main',NULL,'https://chuang-c.com','master',datetime('now'),datetime('now')),
  ('ihome','愛家居系統樿櫃','https://chuang-c.com','/ihome.html','active',NULL,'#c5a880',
   'cheng-CHTechTW/cheng-CHTechTW.github.io','main',NULL,'https://chuang-c.com/ihome.html','master',datetime('now'),datetime('now'));

INSERT OR IGNORE INTO company_profiles
  (site_id,company_name,line_url,line_id,copyright)
  VALUES
  ('chtech','誠創科技','https://lin.ee/RbGc5o5',(SELECT CAST('' AS TEXT)),'© 2024 誠創科技'),
  ('ihome','愛家居系統樿櫃','https://line.me/ti/p/srXWyJcOCT','srXWyJcOCT','© 2024 愛家居系統樿櫃');

INSERT OR IGNORE INTO users
  (id,email,display_name,password_hash,role,must_change_pw)
  VALUES ('master','chengchuang1012@gmail.com','誠創工程師','INIT_SEED','super_admin',0);

INSERT OR IGNORE INTO user_site_access VALUES ('master','chtech'),('master','ihome');

INSERT OR IGNORE INTO templates (id,name,category,description) VALUES
  ('tpl-tech','科技企業','tech','POS、IT、軟體公司'),
  ('tpl-home','居家裝修','home','系統樿、室內設計'),
  ('tpl-landing','一頁式 Landing','landing','行銀活動專用');

INSERT OR IGNORE INTO github_sync (site_id) VALUES ('chtech'),('ihome');
