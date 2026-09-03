// CH CMS V2 — Company Profile API（SSOT）
// 這是所有網站所有位置的唯一資料來源
// 右側懸浮LINE、Footer LINE、QR、公司名稱全從這裡讀取

import { json, log, canAccessSite, hasPermission } from './_middleware.js';

// GET /api/company/:siteId
export async function onRequestGet({ params, env, data }) {
  const { siteId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);

  const profile = await env.DB.prepare(
    `SELECT c.*, s.name as site_name, s.domain, s.path, s.status
     FROM company_profiles c
     JOIN sites s ON s.id = c.site_id
     WHERE c.site_id = ?`
  ).bind(siteId).first();

  if (!profile) return json({ error: '網站不存在' }, 404);

  // R2 圖片轉為 CDN URL
  const r2Url = (key) => key ? `${env.R2_PUBLIC_URL}/${key}` : '';
  profile.logo_url      = r2Url(profile.logo_r2key);
  profile.favicon_url   = r2Url(profile.favicon_r2key);
  profile.line_qr_url   = r2Url(profile.line_qr_r2key);
  profile.og_image_url  = r2Url(profile.og_image_r2key);

  return json({ ok: true, data: profile });
}

// PUT /api/company/:siteId
export async function onRequestPut({ params, request, env, data }) {
  const { siteId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);
  if (!hasPermission(data.user, siteId, 'company_info'))
    return json({ error: '無公司資料編輯權限' }, 403);

  const body = await request.json();

  // 只允許更新安全欄位（禁止注入 site_id）
  const allowed = [
    'company_name','brand_name','phone','email','address','business_hours',
    'line_url','line_id','line_qr_r2key',
    'fb_url','ig_url','youtube_url',
    'copyright','footer_text',
    'seo_title','seo_description',
    'og_title','og_description','og_image_r2key',
    'logo_r2key','favicon_r2key',
  ];

  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (!fields.length) return json({ error: '無有效欄位' }, 400);

  fields.push(`updated_at = datetime('now')`);
  values.push(siteId);

  await env.DB.prepare(
    `UPDATE company_profiles SET ${fields.join(', ')} WHERE site_id = ?`
  ).bind(...values).run();

  await log(env.DB, {
    userId: data.user.userId,
    userEmail: data.user.email,
    siteId,
    action: 'save_company_profile',
    detail: { fields: Object.keys(body).filter(k => allowed.includes(k)) },
    request,
  });

  // 觸發 GitHub 同步（如果有 GitHub Token）
  if (env.GITHUB_TOKEN) {
    await triggerGitHubSync(siteId, env).catch(() => {});
  }

  return json({ ok: true, message: '公司資料已儲存，所有網站連結已同步更新' });
}

// 觸發 GitHub Actions 重新部署
async function triggerGitHubSync(siteId, env) {
  const site = await env.DB.prepare(
    `SELECT github_repo, github_branch FROM sites WHERE id = ?`
  ).bind(siteId).first();
  if (!site?.github_repo) return;

  // 更新 D1 同步狀態
  await env.DB.prepare(
    `UPDATE github_sync SET deploy_status = 'building', updated_at = datetime('now')
     WHERE site_id = ?`
  ).bind(siteId).run();

  // 呼叫 GitHub API 觸發 workflow
  const resp = await fetch(
    `https://api.github.com/repos/${site.github_repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'cms_update', client_payload: { site_id: siteId } }),
    }
  );
  if (resp.ok) {
    await env.DB.prepare(
      `UPDATE github_sync SET deploy_status = 'triggered', last_push_at = datetime('now')
       WHERE site_id = ?`
    ).bind(siteId).run();
  }
}
