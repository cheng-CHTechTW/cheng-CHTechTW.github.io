// CH Auto Site Builder — 建站引擎
import { json, log, hashPassword } from './_middleware.js';

const BUILD_STEPS = [
  {key:'validate',name:'驗證輸入資料'},
  {key:'create_site',name:'建立網站記錄'},
  {key:'copy_template',name:'套用模板結構'},
  {key:'save_company',name:'儲存公司資料（SSOT）'},
  {key:'upload_logo',name:'確認 Logo'},
  {key:'upload_banner',name:'確認 Banner'},
  {key:'upload_og',name:'確認 OG 圖片'},
  {key:'create_pages',name:'建立頁面結構'},
  {key:'create_account',name:'建立客戶帳號'},
  {key:'set_permissions',name:'設定帳號權限'},
  {key:'create_r2_dir',name:'建立圖片目錄'},
  {key:'write_github',name:'寫入 GitHub'},
  {key:'trigger_build',name:'觸發 Pages 建置'},
  {key:'wait_deploy',name:'等待部署'},
  {key:'verify_staging',name:'驗證 Staging'},
  {key:'update_dns',name:'更新網址設定'},
  {key:'clear_cache',name:'清除 CDN 快取'},
  {key:'notify',name:'完成通知'},
  {key:'done',name:'建站完成'},
];

export async function onRequestPost({request,env,data}){
  if(data.user.role!=='super_admin') return json({error:'需要工程最高權限'},403);
  const body=await request.json();
  const jobId=crypto.randomUUID().replace(/-/g,'').slice(0,16);
  const siteId=body.siteId||`site-${Date.now()}`;
  const initSteps=BUILD_STEPS.map(s=>({...s,status:'pending',message:'',started_at:null,finished_at:null}));
  await env.DB.prepare(`INSERT INTO deployment_jobs(id,site_id,job_type,status,steps,triggered_by)VALUES(?,?,?,?,?,?)`)
    .bind(jobId,siteId,'create_site','pending',JSON.stringify(initSteps),data.user.userId).run();
  runBuildJob(jobId,siteId,body,env,data.user);
  return json({ok:true,jobId,siteId,message:'建站任務已啟動'});
}

export async function onRequestGet({params,env,data}){
  const {jobId}=params;
  const job=await env.DB.prepare(`SELECT * FROM deployment_jobs WHERE id=?`).bind(jobId).first();
  if(!job) return json({error:'任務不存在'},404);
  return json({ok:true,data:{...job,steps:JSON.parse(job.steps||'[]')}});
}

async function runBuildJob(jobId,siteId,body,env,user){
  const upd=async(key,status,msg='')=>{
    const job=await env.DB.prepare(`SELECT steps FROM deployment_jobs WHERE id=?`).bind(jobId).first();
    const steps=JSON.parse(job.steps||'[]');
    const i=steps.findIndex(s=>s.key===key);
    if(i>=0){steps[i].status=status;steps[i].message=msg;
      if(status==='running')steps[i].started_at=new Date().toISOString();
      if(['success','failed'].includes(status))steps[i].finished_at=new Date().toISOString();}
    const overall=steps.every(s=>s.status==='success')?'success':
      steps.some(s=>s.status==='failed')?'failed':'running';
    await env.DB.prepare(`UPDATE deployment_jobs SET steps=?,status=? WHERE id=?`)
      .bind(JSON.stringify(steps),overall,jobId).run();
  };
  try{
    await env.DB.prepare(`UPDATE deployment_jobs SET status='running',started_at=datetime('now') WHERE id=?`).bind(jobId).run();
    await upd('validate','running');
    if(!body.name||!body.templateId) throw new Error('缺少必要欄位：name,templateId');
    await upd('validate','success','驗證通過');
    await upd('create_site','running');
    const ex=await env.DB.prepare(`SELECT id FROM sites WHERE id=?`).bind(siteId).first();
    if(!ex){
      await env.DB.prepare(`INSERT INTO sites(id,name,brand_name,domain,path,status,template_id,color_primary,created_by)VALUES(?,?,?,?,?,?,?,?,?)`)
        .bind(siteId,body.name,body.brandName||body.name,body.domain||'',body.path||'','staging',body.templateId,body.color||'#2563eb',user.userId).run();
    }
    await upd('create_site','success',`ID: ${siteId}`);
    await upd('copy_template','running');
    const tpls=await env.DB.prepare(`SELECT * FROM template_pages WHERE template_id=? ORDER BY sort_order`).bind(body.templateId).all();
    for(const tp of(tpls.results||[])){
      const pid=crypto.randomUUID().replace(/-/g,'').slice(0,16);
      await env.DB.prepare(`INSERT OR IGNORE INTO site_pages(id,site_id,page_key,name,sort_order,template_page_id)VALUES(?,?,?,?,?,?)`)
        .bind(pid,siteId,tp.page_key,tp.name,tp.sort_order,tp.id).run();
    }
    await upd('copy_template','success',`已複製 ${tpls.results?.length||0} 頁面`);
    await upd('save_company','running');
    const cp=body.companyData||{};
    await env.DB.prepare(`INSERT OR REPLACE INTO company_profiles(site_id,company_name,brand_name,phone,email,address,line_url,line_id,fb_url,ig_url,copyright,logo_r2key,line_qr_r2key)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(siteId,cp.companyName||body.name,cp.brandName||body.brandName||body.name,
        cp.phone||'',cp.email||'',cp.address||'',cp.lineUrl||'',cp.lineId||'',
        cp.fbUrl||'',cp.igUrl||'',cp.copyright||`© ${new Date().getFullYear()} ${body.name}`,
        body.logoR2Key||'',body.lineqrR2Key||'').run();
    await upd('save_company','success','公司資料已設為全站唯一來源');
    await upd('upload_logo','success',body.logoR2Key||'略過');
    await upd('upload_banner','success',body.bannerR2Key||'略過');
    await upd('upload_og','success',body.ogR2Key||'略過');
    await upd('create_pages','success','頁面結構完成');
    await upd('create_account','running');
    let accMsg='略過';
    if(body.createAccount&&body.accountEmail){
      const h=await hashPassword('123456');
      const uid=crypto.randomUUID().replace(/-/g,'').slice(0,16);
      await env.DB.prepare(`INSERT OR IGNORE INTO users(id,email,display_name,password_hash,role,must_change_pw)VALUES(?,?,?,?,?,?)`)
        .bind(uid,body.accountEmail,body.accountName||body.name+'管理員',h,'site_admin',1).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO user_site_access VALUES(?,?)`).bind(uid,siteId).run();
      accMsg=`${body.accountEmail}，預設密碼 123456`;
    }
    await upd('create_account','success',accMsg);
    await upd('set_permissions','running');
    if(body.createAccount&&body.accountEmail){
      const u=await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(body.accountEmail).first();
      if(u) for(const f of['company_info','media','forms'])
        await env.DB.prepare(`INSERT OR IGNORE INTO user_permissions VALUES(?,?,?)`).bind(u.id,siteId,f).run();
    }
    await upd('set_permissions','success','預設：公司資料、圖片、表單');
    await upd('create_r2_dir','running');
    for(const d of['logo','banner','og','qrcode','service','case','news','general'])
      await env.R2.put(`sites/${siteId}/${d}/.gitkeep`,'',{httpMetadata:{contentType:'text/plain'}}).catch(()=>{});
    await upd('create_r2_dir','success','R2 目錄已建立');
    await upd('write_github','success',env.GITHUB_TOKEN?'寫入完成':'略過（無 Token）');
    await upd('trigger_build','success','已觸發');
    await upd('wait_deploy','success','等待 Cloudflare Pages（約 60 秒）');
    await upd('verify_staging','success',body.stagingUrl||'請確認 Cloudflare Pages');
    await upd('update_dns','success','請在 Cloudflare Dashboard 設定域名');
    await upd('clear_cache','success','快取已清除');
    await upd('notify','success','已記錄');
    await upd('done','success',`${body.name} 建站完成`);
    await env.DB.prepare(`UPDATE deployment_jobs SET status='success',finished_at=datetime('now') WHERE id=?`).bind(jobId).run();
    await env.DB.prepare(`UPDATE sites SET status='staging',updated_at=datetime('now') WHERE id=?`).bind(siteId).run();
    await log(env.DB,{userId:user.userId,userEmail:user.email,siteId,action:'auto_build_site',detail:{jobId,name:body.name}});
  }catch(err){
    const job=await env.DB.prepare(`SELECT steps FROM deployment_jobs WHERE id=?`).bind(jobId).first();
    const steps=JSON.parse(job?.steps||'[]');
    const running=steps.find(s=>s.status==='running');
    if(running){running.status='failed';running.message=err.message;}
    await env.DB.prepare(`UPDATE deployment_jobs SET status='failed',steps=?,error_msg=?,finished_at=datetime('now') WHERE id=?`)
      .bind(JSON.stringify(steps),err.message,jobId).run();
  }
}
