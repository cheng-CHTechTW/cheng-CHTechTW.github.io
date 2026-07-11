// CH CMS V2 — GitHub Sync API
import { json, canAccessSite } from './_middleware.js';

// GET /api/github/:siteId/status
export async function onRequestGet({ params, env, data }) {
  const { siteId } = params;
  if (!canAccessSite(data.user, siteId))
    return json({ error: '無此網站存取權限' }, 403);

  const site = await env.DB.prepare(
    `SELECT s.github_repo, s.github_branch, g.*
     FROM sites s LEFT JOIN github_sync g ON g.site_id = s.id
     WHERE s.id = ?`
  ).bind(siteId).first();
  if (!site) return json({ error: '網站不存在' }, 404);

  // 即時查 GitHub API
  let ghData = null;
  if (site.github_repo && env.GITHUB_TOKEN) {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${site.github_repo}/commits/${site.github_branch}`,
        { headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CH-CMS-V2',
        }}
      );
      if (resp.ok) {
        const d = await resp.json();
        ghData = {
          sha: d.sha?.slice(0, 7),
          full_sha: d.sha,
          message: d.commit?.message?.split('\n')[0],
          author: d.commit?.author?.name,
          time: d.commit?.author?.date,
          url: d.html_url,
        };

        // 更新 D1 同步狀態
        await env.DB.prepare(
          `UPDATE github_sync SET
             last_commit_sha = ?, last_commit_msg = ?, last_push_at = ?,
             deploy_status = 'ok', updated_at = datetime('now')
           WHERE site_id = ?`
        ).bind(ghData.full_sha, ghData.message, ghData.time, siteId).run();
      }
    } catch {}
  }

  // 計算距離最後 push 多久
  const lastPushAt = ghData?.time || site.last_push_at;
  const minutesAgo = lastPushAt
    ? Math.round((Date.now() - new Date(lastPushAt)) / 60000)
    : null;

  return json({
    ok: true,
    data: {
      siteId,
      repo: site.github_repo,
      branch: site.github_branch,
      commit: ghData || {
        sha: site.last_commit_sha?.slice(0, 7),
        message: site.last_commit_msg,
        time: site.last_push_at,
      },
      deployStatus: site.deploy_status || 'unknown',
      minutesAgo,
      synced: minutesAgo !== null && minutesAgo < 10,
    }
  });
}

// POST /api/github/:siteId/trigger — 手動觸發部署
export async function onRequestPost({ params, env, data, request }) {
  const { siteId } = params;
  if (data.user.role !== 'super_admin')
    return json({ error: '需要工程最高權限' }, 403);

  const site = await env.DB.prepare(
    `SELECT github_repo, github_branch FROM sites WHERE id = ?`
  ).bind(siteId).first();
  if (!site?.github_repo) return json({ error: '此網站未設定 GitHub 倉庫' }, 400);

  const resp = await fetch(
    `https://api.github.com/repos/${site.github_repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CH-CMS-V2',
      },
      body: JSON.stringify({
        event_type: 'manual_deploy',
        client_payload: { site_id: siteId, triggered_by: data.user.email }
      }),
    }
  );

  if (!resp.ok) return json({ error: '觸發部署失敗' }, 500);

  await env.DB.prepare(
    `UPDATE github_sync SET deploy_status = 'building', updated_at = datetime('now')
     WHERE site_id = ?`
  ).bind(siteId).run();

  return json({ ok: true, message: '部署已觸發，約 30-60 秒後生效' });
}
