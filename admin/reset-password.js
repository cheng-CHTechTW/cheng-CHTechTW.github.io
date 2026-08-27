(() => {
  const $=s=>document.querySelector(s);
  const url=String((window.GOOGLE_SHEETS_CONFIG||{}).webAppUrl||'').trim();
  const token=new URLSearchParams(location.search).get('token')||'';
  const intro=$('#resetIntro'), form=$('#resetPasswordForm'), msg=$('#resetMessage'), btn=$('#resetSubmitBtn');
  const get=async()=>{
    const r=await fetch(`${url}?action=passwordResetCheck&token=${encodeURIComponent(token)}&_=${Date.now()}`,{cache:'no-store',redirect:'follow'});
    const j=await r.json(); if(!j.ok)throw new Error(j.error||'invalid'); return j;
  };
  const post=async(data)=>{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'adminResetPassword',data}),cache:'no-store',redirect:'follow'});
    const j=await r.json(); if(!j.ok)throw new Error(j.error||'failed'); return j;
  };
  const explain=e=>{
    const m=String(e?.message||e);
    if(m.includes('expired'))return '此連結已過期，請重新申請忘記密碼。';
    if(m.includes('used')||m.includes('invalid'))return '此連結無效或已使用，請重新申請。';
    return `驗證失敗：${m}`;
  };
  (async()=>{
    if(!token){intro.textContent='缺少重設 Token。';return;}
    try{await get();intro.textContent='連結驗證成功，請設定新密碼。';form.hidden=false;}
    catch(e){intro.textContent=explain(e);}
  })();
  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    const password=$('#resetPassword').value, confirmPassword=$('#resetPasswordConfirm').value;
    if(password.length<8){msg.textContent='新密碼至少 8 碼。';return;}
    if(password!==confirmPassword){msg.textContent='兩次輸入的密碼不一致。';return;}
    btn.disabled=true;msg.textContent='重設中…';
    try{
      await post({token,password,confirmPassword});
      form.innerHTML='<div class="reset-success"><b>密碼已成功更新</b><p>請使用新密碼重新登入後台。</p><a href="index.html" class="primary reset-login-link">前往後台登入</a></div>';
      intro.textContent='密碼重設完成。';
    }catch(e){msg.textContent=explain(e);btn.disabled=false;}
  });
})();