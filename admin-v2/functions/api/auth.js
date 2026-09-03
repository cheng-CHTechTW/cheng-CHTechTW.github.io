// CH CMS V2 — Auth API
import { signJWT, verifyPassword, hashPassword, json, log } from './_middleware.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  // POST /api/auth/login
  if (url.pathname.endsWith('/login')) {
    const { email, password } = await request.json();
    if (!email || !password) return json({ error: '請輸入帳號密碼' }, 400);

    const user = await env.DB.prepare(
      `SELECT u.*, GROUP_CONCAT(a.site_id) as sites
       FROM users u
       LEFT JOIN user_site_access a ON a.user_id = u.id
       WHERE u.email = ? AND u.enabled = 1
       GROUP BY u.id`
    ).bind(email.toLowerCase()).first();

    if (!user) return json({ error: '帳號不存在或已停用' }, 401);

    // 初次啟動時密碼是 INIT_RUN_SEED，允許明文 123456 登入
    let pwOk = false;
    if (user.password_hash === 'INIT_RUN_SEED' && password === '123456') {
      pwOk = true;
    } else {
      pwOk = await verifyPassword(password, user.password_hash);
    }
    if (!pwOk) return json({ error: '密碼錯誤' }, 401);

    // 取得細項權限
    const permsRows = await env.DB.prepare(
      `SELECT site_id, feature FROM user_permissions WHERE user_id = ?`
    ).bind(user.id).all();
    const perms = {};
    (permsRows.results || []).forEach(r => {
      if (!perms[r.site_id]) perms[r.site_id] = [];
      perms[r.site_id].push(r.feature);
    });

    const payload = {
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      mustChangePw: !!user.must_change_pw,
      sites: user.sites ? user.sites.split(',') : [],
      permissions: perms,
    };

    const token = await signJWT(payload, env.JWT_SECRET, 86400 * 7);

    await log(env.DB, {
      userId: user.id, userEmail: user.email,
      action: 'login', detail: { ok: true }, request
    });

    return json({ token, user: payload });
  }

  return json({ error: 'Not found' }, 404);
}

// POST /api/auth/change-password
export async function onRequestPut({ request, env, data }) {
  const { currentPassword, newPassword } = await request.json();
  const { userId, email } = data.user;

  if (!newPassword || newPassword.length < 6)
    return json({ error: '新密碼至少需要 6 個字元' }, 400);

  const user = await env.DB.prepare(
    `SELECT password_hash FROM users WHERE id = ?`
  ).bind(userId).first();

  // 驗證目前密碼（初次登入不需要）
  if (user.password_hash !== 'INIT_RUN_SEED') {
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) return json({ error: '目前密碼錯誤' }, 400);
  }

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_pw = 0, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(newHash, userId).run();

  await log(env.DB, {
    userId, userEmail: email,
    action: 'change_password', detail: {}, request
  });

  return json({ ok: true, message: '密碼已更新' });
}
