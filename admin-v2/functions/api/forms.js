// CH CMS V2 — Forms API
import { json, log, canAccessSite } from './_middleware.js';

export async function onRequestPost({params,request,env}){
  const {siteId}=params;
  const site=await env.DB.prepare(`SELECT id FROM sites WHERE id=?`).bind(siteId).first();
  if(!site) return json({error:'網站不存在'},404);
  const body=await request.json().catch(()=>({}));
  if(!Object.keys(body).length) return json({error:'請填入表單資料'},400);
  const ip=request.headers.get('CF-Connecting-IP')||'';
  const ua=request.headers.get('User-Agent')?.slice(0,200)||'';
  const formType=body._formType||'contact';
  delete body._formType;
  await env.DB.prepare(`INSERT INTO form_submissions(site_id,form_type,data,ip,user_agent)VALUES(?,?,?,?,?)`)
    .bind(siteId,formType,JSON.stringify(body),ip,ua).run();
  return json({ok:true,message:'感謝您的填寫，我們將盡快與您聯繫'});
}

export async function onRequestGet({params,request,env,data}){
  const {siteId}=params;
  if(!canAccessSite(data.user,siteId)) return json({error:'無此網站存取權限'},403);
  const url=new URL(request.url);
  const limit=parseInt(url.searchParams.get('limit')||'100');
  const dateStart=url.searchParams.get('from')||'';
  const dateEnd=url.searchParams.get('to')||'';
  const keyword=url.searchParams.get('q')||'';
  let q=`SELECT * FROM form_submissions WHERE site_id=?`;
  const b=[siteId];
  if(dateStart){q+=` AND created_at>=?`;b.push(dateStart);}
  if(dateEnd){q+=` AND created_at<=?`;b.push(dateEnd+'T23:59:59');}
  if(keyword){q+=` AND data LIKE ?`;b.push(`%${keyword}%`);}
  q+=` ORDER BY created_at DESC LIMIT ?`;b.push(limit);
  const rows=await env.DB.prepare(q).bind(...b).all();
  const total=await env.DB.prepare(`SELECT COUNT(*) as n FROM form_submissions WHERE site_id=?`).bind(siteId).first();
  return json({ok:true,data:(rows.results||[]).map(r=>({...r,data:JSON.parse(r.data||'{}')})),total:total?.n||0});
}

export async function onRequestDelete({params,env,data,request}){
  const {siteId,formId}=params;
  if(!canAccessSite(data.user,siteId)) return json({error:'無此網站存取權限'},403);
  await env.DB.prepare(`DELETE FROM form_submissions WHERE id=? AND site_id=?`).bind(formId,siteId).run();
  await log(env.DB,{userId:data.user.userId,userEmail:data.user.email,siteId,action:'delete_form',detail:{formId},request});
  return json({ok:true});
}
