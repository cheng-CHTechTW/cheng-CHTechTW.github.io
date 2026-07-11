// CH CMS V2 — Templates API
import { json, log } from './_middleware.js';

export async function onRequestGet({request,env,data}){
  const url=new URL(request.url);
  const cat=url.searchParams.get('category')||'';
  const stmt=cat
    ?env.DB.prepare(`SELECT * FROM templates WHERE is_active=1 AND category=? ORDER BY name`).bind(cat)
    :env.DB.prepare(`SELECT * FROM templates WHERE is_active=1 ORDER BY category,name`);
  const r=await stmt.all();
  return json({ok:true,data:r.results||[]});
}

export async function onRequestPost({request,env,data}){
  if(data.user.role!=='super_admin') return json({error:'需要工程最高權限'},403);
  const body=await request.json();
  const {name,category,description,supportsMultipage,supportsForm,pages}=body;
  if(!name||!category) return json({error:'請填入模板名稱和分類'},400);
  const tplId=`tpl-${Date.now()}`;
  await env.DB.prepare(`INSERT INTO templates(id,name,category,description,supports_multipage,supports_form,created_by)VALUES(?,?,?,?,?,?,?)`)
    .bind(tplId,name,category,description||'',supportsMultipage?1:0,supportsForm?1:0,data.user.userId).run();
  if(Array.isArray(pages)&&pages.length){
    for(let pi=0;pi<pages.length;pi++){
      const p=pages[pi];
      const pageId=`${tplId}-${p.key}`;
      await env.DB.prepare(`INSERT INTO template_pages(id,template_id,page_key,name,sort_order,html_template,css_template)VALUES(?,?,?,?,?,?,?)`)
        .bind(pageId,tplId,p.key,p.name,pi,p.html||'',p.css||'').run();
      for(let si=0;si<(p.sections||[]).length;si++){
        const s=p.sections[si];
        await env.DB.prepare(`INSERT INTO template_sections(page_id,section_key,name,sort_order,field_schema,default_data)VALUES(?,?,?,?,?,?)`)
          .bind(pageId,s.key,s.name,si,JSON.stringify(s.fields||[]),JSON.stringify(s.defaults||{})).run();
      }
    }
  }
  await log(env.DB,{userId:data.user.userId,userEmail:data.user.email,action:'create_template',detail:{tplId,name,category}});
  return json({ok:true,data:{id:tplId,name,category}});
}

export async function onRequestPut({params,request,env,data}){
  if(data.user.role!=='super_admin') return json({error:'需要工程最高權限'},403);
  const {tplId}=params;
  const body=await request.json();
  const allowed=['name','category','description','supports_multipage','supports_form','is_active','preview_r2key'];
  const fields=[],values=[];
  for(const k of allowed) if(body[k]!==undefined){fields.push(`${k}=?`);values.push(body[k]);}
  if(!fields.length) return json({error:'無有效欄位'},400);
  fields.push(`updated_at=datetime('now')`);values.push(tplId);
  await env.DB.prepare(`UPDATE templates SET ${fields.join(',')} WHERE id=?`).bind(...values).run();
  await log(env.DB,{userId:data.user.userId,userEmail:data.user.email,action:'update_template',detail:{tplId}});
  return json({ok:true,message:'模板已更新'});
}
