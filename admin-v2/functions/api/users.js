// CH CMS V2 — Users API
import { json, log, hashPassword, canAccessSite } from './_middleware.js';

function isSuperAdmin(user) { return user.role === 'super_admin'; }

// GET /api/users — 列出全部帳號（super_admin）
export async function onRequestGet({ env, data }) {
  if (!isSuperAdmin(data.user))
    return json({ error: '需要工程最高權限' }, 403);

  const users = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.role, u.must_change_pw, u.enabled,
            u.created_at, u.updated_at,
            GROUP_CONCAT(a.site_id) as sites
     FROM users u
     LEFT JOIN user_site_access a ON a.user_id = u.id
     GROUP BY u.id ORDER BY u.created_at DESC`
  ).all();

  // 不回傳密碼 hash
  const result = (users.results || []).map(u => ({
    ...u,
    sites: u.sites ? u.sites.split(',') : [],
    password_hash: undefined,
  }));

  return json({ ok: true, data: result });
}

// POST /api/users — 建立帳號
export async function onRequestPost({ request, env, data }) {
  if (!isSuperAdmin(data.user))
    return json({ error: '需要工程最高權限' }, 403);

  const { email, displayName, role, sites, mustChangePw } = await request.json();
  if (!email || !displayName) return json({ error: '請填入必要欄位' }, 400);

  const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
    .bind(email.toLowerCase()).first();
  if (exists) return json({ error: '此 Email 已存在' }, 409);

  const initHash = await hashPassword('123456');
  const userId = crypto.randomUUID().replace(/-/g,'').slice(0, 16);

  await env.DB.prepare(
    `INSERT INTO users (id,email,display_name,password_hash,role,must_change_pw)
     VALUES (?,?,?,?,?,?)`
  ).bind(userId, email.toLowerCase(), displayName, initHash,
    role || 'site_admin', mustChangePw !== false ? 1 : 0).run();

  // 綁定可存取的網站
  if (Array.isArray(sites) && sites.length) {
    for (const siteId of sites) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO user_site_access VALUES (?,?)`
      ).bind(userId, siteId).run();
    }
  }

  await log(env.DB, {
    userId: data.user.userId, userEmail: data.user.email,
    action: 'create_user',
    detail: { newUserId: userId, email, role, sites },
    request,
  });

  return json({ ok: true, message: `帳號已建立，預設密碼 123456，首次登入需更改` });
}

// PUT /api/users/:userId/reset-password — 重設密碼（LOG必記）
export async function onRequestPut({ params, env, data, request }) {
  const url = new URL(request.url);
  const { userId } = params;

  if (url.pathname.endsWith('/reset-password')) {
    if (!isSuperAdmin(data.user))
      return json({ error: '需要工程最高權限' }, 403);

    const target = await env.DB.prepare(
      `SELECT id, email FROM users WHERE id = ?`
    ).bind(userId).first();
    if (!target) return json({ error: '帳號不存在' }, 404);

    const initHash = await hashPassword('123456');
    await env.DB.prepare(
      `UPDATE users SET password_hash = ?, must_change_pw = 1, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(initHash, userId).run();

    await log(env.DB, {
      userId: data.user.userId, userEmail: data.user.email,
      action: 'reset_password',
      detail: { targetUserId: userId, targetEmail: target.email, newPw: '123456' },
      request,
    });

    return json({ ok: true, message: `${target.email} 密碼已重設為 123456，下次登入需更改` });
  }

  // PUT /api/users/:userId/toggle — 啟用/停用
  if (url.pathname.endsWith('/toggle')) {
    if (!isSuperAdmin(data.user))
      return json({ error: '需要工程最高權限' }, 403);

    const { enabled } = await request.json();
    const target = await env.DB.prepare(
      `SELECT id, email FROM users WHERE id = ?`
    ).bind(userId).first();
    if (!target) return json({ error: '帳號不存在' }, 404);

    await env.DB.prepare(
      `UPDATE users SET enabled = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(enabled ? 1 : 0, userId).run();

    await log(env.DB, {
      userId: data.user.userId, userEmail: data.user.email,
      action: enabled ? 'enable_user' : 'disable_user',
      detail: { targetUserId: userId, targetEmail: target.email },
      request,
    });

    return json({ ok: true, message: `帳號已${enabled ? '啟用' : '停用'}` });
  }

  return json({ error: 'Not found' }, 404);
}

// GET /api/users/logs — 操作紀錄（super_admin）
// GET /api/logs/:siteId — 取得指定網站 LOG
export async function onRequestGetLogs({ params, request, env, data }) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const siteId = params.siteId;

  let stmt;
  if (isSuperAdmin(data.user)) {
    stmt = siteId
      ? env.DB.prepare(
          `SELECT * FROM audit_logs WHERE site_id = ? ORDER BY created_at DESC LIMIT ?`
        ).bind(siteId, limit)
      : env.DB.prepare(
          `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`
        ).bind(limit);
  } else {
    // 一般管理員只能看自己的
    stmt = env.DB.prepare(
      `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    ).bind(data.user.userId, limit);
  }

  const logs = await stmt.all();
  return json({ ok: true, data: logs.results || [] });
}
