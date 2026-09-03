// CH CMS V2 — Media API (Cloudflare R2)
import { json, log, canAccessSite, hasPermission } from './_middleware.js';

// POST /api/media/:siteId/upload
export async function onRequestPost({ params, request, env, data }) {
  const { siteId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);
  if (!hasPermission(data.user, siteId, 'media'))
    return json({ error: '無圖片上傳權限' }, 403);

  const formData = await request.formData();
  const file = formData.get('file');
  const category = formData.get('category') || 'general';

  if (!file) return json({ error: '請選擇檔案' }, 400);

  const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'];
  if (!allowedTypes.includes(file.type))
    return json({ error: '不支援的檔案格式' }, 400);

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize)
    return json({ error: '檔案大小超過 10MB 限制' }, 400);

  // 產生 R2 key：sites/{siteId}/{category}/{timestamp}-{filename}
  const ext = file.name.split('.').pop().toLowerCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 50);
  const r2Key = `sites/${siteId}/${category}/${Date.now()}-${safeName}`;

  // 上傳到 R2
  const arrayBuffer = await file.arrayBuffer();
  await env.R2.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    },
    customMetadata: {
      uploadedBy: data.user.email,
      siteId,
      category,
      originalName: file.name,
    },
  });

  // 記錄到 D1
  const assetId = crypto.randomUUID().replace(/-/g,'').slice(0, 16);
  await env.DB.prepare(
    `INSERT INTO media_assets (id,site_id,r2_key,filename,mime_type,size_bytes,category,uploaded_by)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(assetId, siteId, r2Key, file.name, file.type, file.size, category, data.user.userId).run();

  const publicUrl = `${env.R2_PUBLIC_URL}/${r2Key}`;

  await log(env.DB, {
    userId: data.user.userId, userEmail: data.user.email,
    siteId, action: 'upload_media',
    detail: { r2Key, filename: file.name, size: file.size, category },
    request,
  });

  return json({
    ok: true,
    data: { id: assetId, r2Key, url: publicUrl, filename: file.name, category }
  });
}

// GET /api/media/:siteId — 列出圖片
export async function onRequestGet({ params, request, env, data }) {
  const { siteId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);

  const url = new URL(request.url);
  const category = url.searchParams.get('category') || '';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let stmt;
  if (category) {
    stmt = env.DB.prepare(
      `SELECT * FROM media_assets WHERE site_id = ? AND category = ?
       ORDER BY created_at DESC LIMIT ?`
    ).bind(siteId, category, limit);
  } else {
    stmt = env.DB.prepare(
      `SELECT * FROM media_assets WHERE site_id = ?
       ORDER BY created_at DESC LIMIT ?`
    ).bind(siteId, limit);
  }

  const assets = await stmt.all();
  const result = (assets.results || []).map(a => ({
    ...a,
    url: `${env.R2_PUBLIC_URL}/${a.r2_key}`,
  }));

  return json({ ok: true, data: result });
}

// DELETE /api/media/:siteId/:assetId
export async function onRequestDelete({ params, env, data, request }) {
  const { siteId, assetId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);

  const asset = await env.DB.prepare(
    `SELECT * FROM media_assets WHERE id = ? AND site_id = ?`
  ).bind(assetId, siteId).first();
  if (!asset) return json({ error: '圖片不存在' }, 404);

  // 從 R2 刪除
  await env.R2.delete(asset.r2_key);

  // 從 D1 刪除
  await env.DB.prepare(`DELETE FROM media_assets WHERE id = ?`).bind(assetId).run();

  await log(env.DB, {
    userId: data.user.userId, userEmail: data.user.email,
    siteId, action: 'delete_media',
    detail: { assetId, r2Key: asset.r2_key, filename: asset.filename },
    request,
  });

  return json({ ok: true, message: '圖片已刪除' });
}
