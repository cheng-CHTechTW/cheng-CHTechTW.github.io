// CH CMS V2 — API Middleware
// Cloudflare Pages Functions middleware

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 公開路由不驗證 JWT
  const publicPaths = ['/api/auth/login', '/api/forms/submit'];
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    const resp = await next();
    Object.entries(corsHeaders).forEach(([k,v]) => resp.headers.set(k,v));
    return resp;
  }

  // JWT 驗證
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    ctx.data.user = payload;
  } catch {
    return json({ error: 'Invalid token' }, 401, corsHeaders);
  }

  const resp = await next();
  Object.entries(corsHeaders).forEach(([k,v]) => resp.headers.set(k,v));
  return resp;
}

// ── JWT 工具 ──────────────────────────────────────────────
export async function signJWT(payload, secret, expiresIn = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresIn };

  const encode = (obj) =>
    btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const signingInput = `${encode(header)}.${encode(claims)}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  return `${signingInput}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sig = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(signingInput));
  if (!valid) throw new Error('Invalid signature');

  const payload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/')));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired');
  return payload;
}

// ── bcrypt 替代（PBKDF2）──────────────────────────────────
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw),
    'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, key, 256);
  const hash = Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return `pbkdf2:${saltHex}:${hash}`;
}

export async function verifyPassword(pw, stored) {
  if (!stored.startsWith('pbkdf2:')) return false;
  const [, saltHex, storedHash] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b=>parseInt(b,16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw),
    'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, key, 256);
  const hash = Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return hash === storedHash;
}

// ── 工具 ─────────────────────────────────────────────────
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra }
  });
}

export async function log(db, { userId, userEmail, siteId, action, detail, request }) {
  const ip = request?.headers.get('CF-Connecting-IP') || '';
  const ua = request?.headers.get('User-Agent')?.slice(0, 200) || '';
  await db.prepare(
    `INSERT INTO audit_logs (user_id,user_email,site_id,action,detail,ip,user_agent)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(userId||'', userEmail||'', siteId||'', action, JSON.stringify(detail||{}), ip, ua).run();
}

export function canAccessSite(user, siteId) {
  if (user.role === 'super_admin') return true;
  return (user.sites || []).includes(siteId);
}

export function hasPermission(user, siteId, feature) {
  if (user.role === 'super_admin') return true;
  return (user.permissions?.[siteId] || []).includes(feature);
}
