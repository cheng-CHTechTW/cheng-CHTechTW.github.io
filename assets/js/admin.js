const DATA_KEY="cc_full_site_data";
const IMG_KEY="cc_full_site_images";

const TAB_LABELS = {
  basic:"基本資料", header:"頁首欄位", footer:"頁尾顯示", security:"登入密碼",
  users:"使用者權限", editEntry:"編輯入口", appearance:"手機/圖片顯示", hero:"主視覺", services:"服務項目",
  industries:"🏭 行業封面", details:"服務細節模組", cases:"成功案例", partners:"關係企業",
  ihome:"愛家居系統櫥櫃", news:"最新消息", faq:"常見問題",
  form:"表單設定", formRecords:"📋 表單紀錄", publish:"🚀 發布管理", backup:"備份/還原", masterAccount:"工程總帳號修改"
};
const PERMISSION_KEYS = Object.keys(TAB_LABELS).filter(k=>k!=="masterAccount").concat(["masterAccount"]).concat(["images"]);

let data = loadData();
let images = loadImages();
let currentTab = "basic";
let currentUser = null;
let userEditMode = "list";
let editingUserIndex = -1;
let originalData = clone(data);

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function merge(a,b){
  Object.keys(b||{}).forEach(k=>{
    if(b[k] && typeof b[k]==="object" && !Array.isArray(b[k]) && a[k]) merge(a[k], b[k]);
    else a[k] = b[k];
  });
  return a;
}
function loadData(){
  try{
    const saved = localStorage.getItem(DATA_KEY);
    return saved ? merge(clone(window.DEFAULT_DATA), JSON.parse(saved)) : clone(window.DEFAULT_DATA);
  }catch(err){
    console.warn("後台資料讀取失敗，已改用預設資料", err);
    localStorage.removeItem(DATA_KEY);
    return clone(window.DEFAULT_DATA);
  }
}
function loadImages(){
  try{
    return JSON.parse(localStorage.getItem(IMG_KEY) || "{}");
  }catch(err){
    localStorage.removeItem(IMG_KEY);
    return {};
  }
}
function ensureUsers(){
  if(!Array.isArray(data.adminUsers) || data.adminUsers.length===0){
    data.adminUsers = [{
      enabled:true,
      isMaster:true,
      username:"admin",
      password:"123456",
      displayName:"工程總帳號",
      email:(data.formConfig&&data.formConfig.notifyEmail)||"",
      permissions:Object.fromEntries(PERMISSION_KEYS.map(k=>[k,true]))
    }];
  }
  data.adminUsers.forEach((u,i)=>{
    if(i===0 && u.username==="admin") u.isMaster = true;
    if(!u.permissions) u.permissions = {};
    PERMISSION_KEYS.forEach(k=>{
      if(u.permissions[k]===undefined) u.permissions[k] = u.isMaster ? true : false;
    });
  });
}
function hasPerm(tab){
  if(!currentUser) return false;
  return currentUser.permissions && currentUser.permissions[tab] === true;
}
function refreshPermissionMenu(){
  document.querySelectorAll("aside button").forEach(btn=>{
    btn.style.display = hasPerm(btn.dataset.tab) ? "" : "none";
  });
}
function firstAllowedTab(){
  return Object.keys(TAB_LABELS).filter(k=>k!=="masterAccount").find(k=>hasPerm(k)) || "basic";
}
function logAdminChange(action, detail){
  const actor = currentUser ? (currentUser.displayName || currentUser.username) : "unknown";
  const username = currentUser ? currentUser.username : "";
  const record = {
    type:"adminLog", action, detail, actor, username,
    createdAt:new Date().toLocaleString("zh-TW",{hour12:false}),
    notifyEmail:(data.formConfig&&data.formConfig.notifyEmail)||""
  };
  const logs = JSON.parse(localStorage.getItem("cc_admin_audit_logs") || "[]");
  logs.unshift(record);
  localStorage.setItem("cc_admin_audit_logs", JSON.stringify(logs.slice(0,100)));
  const url = data.formConfig && data.formConfig.googleScriptUrl;
  if(url){
    fetch(url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(record)}).catch(()=>{});
  }
}

function compressImage(file, maxWidth, maxHeight, quality, shape, callback) {
  let actualShape = "square";
  let actualCallback = callback;
  if (typeof shape === "function") {
    actualCallback = shape;
  } else {
    actualShape = shape;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (actualShape === "circle") {
        ctx.beginPath();
        const radius = Math.min(width, height) / 2;
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.clip();
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Preserve transparency for PNG uploads or files with logo/png in name/dimensions
      const isPng = (file.type === "image/png") || 
                    (file.name && file.name.toLowerCase().endsWith(".png")) ||
                    (file.name && file.name.toLowerCase().includes("logo")) ||
                    (maxWidth <= 400) || (actualShape === "circle");
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const compressedBase64 = canvas.toDataURL(mimeType, mimeType === "image/png" ? undefined : quality);
      actualCallback(compressedBase64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function validateUser(u, p) {
  const uLower = String(u).trim().toLowerCase();
  return data.adminUsers.find(x => {
    if (x.enabled === false) return false;
    if (x.password !== p) return false;
    const usernameMatch = x.username.toLowerCase() === uLower;
    const emailPrefixMatch = x.email && x.email.includes("@") && x.email.split("@")[0].toLowerCase() === uLower;
    const rawEmailMatch = x.email && x.email.toLowerCase() === uLower;
    return usernameMatch || emailPrefixMatch || rawEmailMatch;
  });
}

function getDifference(oldVal, newVal) {
  const diffs = [];
  if (!oldVal || !newVal) return "變更網站設定";
  
  // Compare basic contact fields
  if (oldVal.contactFields && newVal.contactFields) {
    for (const key in newVal.contactFields) {
      const oldF = oldVal.contactFields[key];
      const newF = newVal.contactFields[key];
      if (oldF && newF) {
        if (oldF.value !== newF.value) {
          diffs.push(`修改 ${newF.label || key}: "${oldF.value}" ➜ "${newF.value}"`);
        }
        if (oldF.show !== newF.show) {
          diffs.push(`${newF.show ? "顯示" : "隱藏"} ${newF.label || key}`);
        }
      }
    }
  }
  
  // Compare social urls
  if (oldVal.contact && newVal.contact) {
    const keys = ["lineUrl", "facebookUrl", "instagramUrl", "youtubeUrl"];
    keys.forEach(k => {
      if (oldVal.contact[k] !== newVal.contact[k]) {
        diffs.push(`修改社群 ${k}: "${oldVal.contact[k] || ''}" ➜ "${newVal.contact[k] || ''}"`);
      }
    });
  }
  
  // Compare social device visibility
  if (oldVal.socialDeviceVisibility && newVal.socialDeviceVisibility) {
    for (const key in newVal.socialDeviceVisibility) {
      if (oldVal.socialDeviceVisibility[key] !== newVal.socialDeviceVisibility[key]) {
        diffs.push(`修改社群 ${key} 顯示裝置: "${oldVal.socialDeviceVisibility[key] || 'both'}" ➜ "${newVal.socialDeviceVisibility[key]}"`);
      }
    }
  }
  
  // Compare Hero Title/Subtitle
  if (oldVal.hero && newVal.hero) {
    if (oldVal.hero.title !== newVal.hero.title) diffs.push(`修改主視覺標題`);
    if (oldVal.hero.subtitle !== newVal.hero.subtitle) diffs.push(`修改主視覺副標題`);
    if (oldVal.hero.eyebrow !== newVal.hero.eyebrow) diffs.push(`修改主視覺小標`);
    if (JSON.stringify(oldVal.hero.points) !== JSON.stringify(newVal.hero.points)) diffs.push(`修改主視覺重點文字`);
  }
  
  // Compare appearanceConfig
  if (oldVal.appearanceConfig && newVal.appearanceConfig) {
    const keys = ["desktopLogoHeight", "mobileLogoHeight", "footerLineQrShow", "footerLineQrLabel", "versionLabel"];
    keys.forEach(k => {
      if (oldVal.appearanceConfig[k] !== newVal.appearanceConfig[k]) {
        diffs.push(`修改外觀 ${k}: "${oldVal.appearanceConfig[k]}" ➜ "${newVal.appearanceConfig[k]}"`);
      }
    });
  }
  
  // Compare simple array counts or updates
  const arrays = ["services", "cases", "partners", "news", "faqs"];
  const arrayLabels = {services:"服務項目", cases:"成功案例", partners:"關係企業", news:"最新消息", faqs:"常見問題"};
  arrays.forEach(arrName => {
    const oldArr = oldVal[arrName] || [];
    const newArr = newVal[arrName] || [];
    if (oldArr.length !== newArr.length) {
      diffs.push(`調整 ${arrayLabels[arrName] || arrName} 數量: 由 ${oldArr.length} ➜ ${newArr.length} 項`);
    } else {
      let changed = false;
      for (let i = 0; i < newArr.length; i++) {
        if (JSON.stringify(oldArr[i]) !== JSON.stringify(newArr[i])) {
          changed = true;
          break;
        }
      }
      if (changed) {
        diffs.push(`更新 ${arrayLabels[arrName] || arrName} 的項目內容`);
      }
    }
  });
  
  // Compare details (5 modules)
  if (oldVal.details && newVal.details) {
    for (const key in newVal.details) {
      if (JSON.stringify(oldVal.details[key]) !== JSON.stringify(newVal.details[key])) {
        diffs.push(`更新 ${newVal.details[key]?.title || key} 的詳細介紹`);
      }
    }
  }
  
  // Compare users
  if (oldVal.adminUsers && newVal.adminUsers) {
    if (oldVal.adminUsers.length !== newVal.adminUsers.length) {
      diffs.push(`調整人員帳號數量: ${oldVal.adminUsers.length} ➜ ${newVal.adminUsers.length}`);
    } else {
      let userChanges = [];
      newVal.adminUsers.forEach((u, idx) => {
        const ou = oldVal.adminUsers[idx];
        if (ou && JSON.stringify(ou) !== JSON.stringify(u)) {
          userChanges.push(u.username);
        }
      });
      if (userChanges.length > 0) {
        diffs.push(`更新人員資料或權限: ${userChanges.join(", ")}`);
      }
    }
  }

  // Compare ihomeConfig and ihomeCases
  if (oldVal.ihomeConfig && newVal.ihomeConfig) {
    if (JSON.stringify(oldVal.ihomeConfig) !== JSON.stringify(newVal.ihomeConfig)) {
      diffs.push(`更新愛家居系統櫥櫃頁面配置`);
    }
  }
  if (oldVal.ihomeCases && newVal.ihomeCases) {
    if (oldVal.ihomeCases.length !== newVal.ihomeCases.length) {
      diffs.push(`調整愛家居系統櫥櫃精選案例數量: 由 ${oldVal.ihomeCases.length} ➜ ${newVal.ihomeCases.length} 項`);
    } else if (JSON.stringify(oldVal.ihomeCases) !== JSON.stringify(newVal.ihomeCases)) {
      diffs.push(`更新愛家居系統櫥櫃精選案例內容`);
    }
  }
  
  return diffs.length > 0 ? diffs.join("; ") : "儲存網站設定 (未變更實質內容)";
}

function save(){
  // Auto increment version
  const timeVer = "v23_" + new Date().toISOString().replace(/[-:T.Z]/g, "").slice(2, 14);
  data.siteVersion = timeVer;
  if (!data.appearanceConfig) data.appearanceConfig = {};
  data.appearanceConfig.versionLabel = timeVer;

  const detail = getDifference(originalData, data);
  
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  localStorage.setItem(IMG_KEY, JSON.stringify(images));
  
  const url = data.formConfig && data.formConfig.googleScriptUrl;
  if(url && !url.includes("請貼上")){
    const saveBtn = document.getElementById("saveBtn");
    const originalText = saveBtn ? saveBtn.textContent : "儲存修改";
    if(saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "同步儲存中...";
    }
    
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        type: "saveConfig",
        data: data,
        images: images
      })
    })
    .then(() => {
      logAdminChange("儲存網站設定", detail + " (後台資料已儲存並同步至線上)");
      originalData = clone(data);
      if(saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
      alert("儲存成功！資料已同步寫入 Google 試算表，前台網站已完成同步。");
    })
    .catch(err => {
      console.error("同步失敗", err);
      logAdminChange("儲存網站設定", detail + " (後台資料已儲存，但線上同步失敗)");
      if(saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
      alert("本地儲存成功，但線上同步失敗（請檢查網路或 Google Apps Script 設定）。");
    });
  } else {
    logAdminChange("儲存網站設定", detail + " (後台資料已儲存於本機)");
    originalData = clone(data);
    alert("本地儲存成功！(尚未設定 Google Apps Script URL，無法進行線上多端同步。)");
  }
}

async function syncFromCloud(){
  const url = data.formConfig && data.formConfig.googleScriptUrl;
  if(url && !url.includes("請貼上")){
    try {
      const res = await fetch(url);
      const cloud = await res.json();
      if(cloud){
        let updated = false;
        if(cloud.data){
          data = merge(clone(window.DEFAULT_DATA), cloud.data);
          localStorage.setItem(DATA_KEY, JSON.stringify(data));
          updated = true;
        }
        if(cloud.images){
          images = cloud.images;
          localStorage.setItem(IMG_KEY, JSON.stringify(images));
          updated = true;
        }
        if(updated){
          console.log("已同步雲端設定資料至本地");
          originalData = clone(data);
        }
      }
    } catch(e) {
      console.warn("無法取得雲端設定資料，使用本地快取", e);
    }
  }
}

function showAdmin(){
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").classList.remove("locked");
  syncFromCloud().then(() => {
    render();
  });
}
function showLogin(){
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminApp").classList.add("locked");
}

function quickBindLoginFallback(){
  const loginBtn = document.getElementById("loginBtn");
  const loginUser = document.getElementById("loginUser");
  const loginPass = document.getElementById("loginPass");
  const loginMsg = document.getElementById("loginMsg");
  const eye = document.getElementById("toggleLoginPass");
  
  if(eye && loginPass && !eye.dataset.bound){
    eye.dataset.bound = "1";
    eye.onclick = function(){
      loginPass.type = loginPass.type === "password" ? "text" : "password";
      eye.textContent = loginPass.type === "password" ? "👁" : "🙈";
    };
  }
  
  if(loginPass && !loginPass.dataset.bound){
    loginPass.dataset.bound = "1";
    loginPass.addEventListener("keydown", e => {
      if(e.key === "Enter" && loginBtn) loginBtn.click();
    });
  }
  
  if(loginBtn && loginUser && loginPass && !loginBtn.dataset.bound){
    loginBtn.dataset.bound = "1";
    loginBtn.onclick = function(){
      try{
        data = loadData();
        ensureUsers();
        const u = loginUser.value.trim();
        const p = loginPass.value;
        const found = validateUser(u, p);
        if(found){
          currentUser = found;
          sessionStorage.setItem("cc_admin_logged_in","1");
          sessionStorage.setItem("cc_admin_user",found.username);
          sessionStorage.setItem("cc_admin_user_display",found.displayName||found.username);
          sessionStorage.setItem("cc_admin_siteId", found.siteId||"chengchuang");
          showAdmin();
          refreshPermissionMenu();
          // 登入後優先顯示「表單紀錄」（若有權限），否則第一個允許的 tab
          currentTab = hasPerm("formRecords") ? "formRecords" : firstAllowedTab();
          setActiveTabButton();
          logAdminChange("登入後台","使用者登入後台");
          render();
        }else{
          loginMsg.textContent = "帳號或密碼錯誤";
          loginPass.value = "";
        }
      }catch(err){
        console.error(err);
        loginMsg.textContent = "後台啟動錯誤，請清除瀏覽器快取後再試。";
      }
    };
  }
}

function initLogin(){
  quickBindLoginFallback();
  ensureUsers();

  const logged = sessionStorage.getItem("cc_admin_user");
  if(logged){
    currentUser = data.adminUsers.find(u=>u.username===logged && u.enabled!==false);
    if(currentUser){
      showAdmin();
      refreshPermissionMenu();
      currentTab = firstAllowedTab();
      setActiveTabButton();
      render();
    }else{
      showLogin();
    }
  }else{
    showLogin();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.onclick = () => {
      logAdminChange("登出後台","使用者登出後台");
      sessionStorage.removeItem("cc_admin_logged_in");
      sessionStorage.removeItem("cc_admin_user");
      currentUser = null;
      showLogin();
    };
  }
  initForgetPassword();
}

function initForgetPassword(){
  const forgetLink=document.getElementById("forgetPassLink");
  const backLink=document.getElementById("backToLoginLink");
  const loginForm=document.getElementById("loginFormArea");
  const forgetForm=document.getElementById("forgetPassArea");
  
  const step1=document.getElementById("forgetStep1");
  const step2=document.getElementById("forgetStep2");
  const step3=document.getElementById("forgetStep3");
  
  const forgetUser=document.getElementById("forgetUser");
  const ans1=document.getElementById("ans1");
  const ans2=document.getElementById("ans2");
  const engineeringPass=document.getElementById("engineeringPass");
  const toggleEngPass=document.getElementById("toggleEngPass");
  
  const next1=document.getElementById("forgetNext1Btn");
  const next2=document.getElementById("forgetNext2Btn");
  const submitBtn=document.getElementById("forgetSubmitBtn");
  
  const forgetMsg=document.getElementById("forgetMsg");
  const lblQ1=document.getElementById("lblQ1");
  const lblQ2=document.getElementById("lblQ2");
  
  let targetUserObj = null;
  
  if(toggleEngPass && engineeringPass){
    toggleEngPass.onclick = () => {
      engineeringPass.type = engineeringPass.type === "password" ? "text" : "password";
      toggleEngPass.textContent = engineeringPass.type === "password" ? "👁" : "🙈";
    };
  }
  
  if(forgetLink && backLink && loginForm && forgetForm){
    forgetLink.onclick = (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      forgetForm.style.display = "block";
      step1.style.display = "block";
      step2.style.display = "none";
      step3.style.display = "none";
      forgetUser.value = "";
      forgetMsg.textContent = "";
      targetUserObj = null;
    };
    backLink.onclick = (e) => {
      e.preventDefault();
      loginForm.style.display = "block";
      forgetForm.style.display = "none";
      forgetMsg.textContent = "";
    };
  }
  
  if(next1){
    next1.onclick = () => {
      const username = forgetUser.value.trim();
      if(!username){
        forgetMsg.textContent = "請輸入帳號";
        return;
      }
      data = loadData();
      ensureUsers();
      const found = data.adminUsers.find(x => x.username === username && x.enabled !== false);
      if(!found){
        forgetMsg.textContent = "驗證失敗：帳號不存在或已被停用";
        return;
      }
      targetUserObj = found;
      forgetMsg.textContent = "";
      step1.style.display = "none";
      step2.style.display = "block";
      
      lblQ1.textContent = "問題 1：" + (found.question1 || "您的出生地是？");
      lblQ2.textContent = "問題 2：" + (found.question2 || "您最喜歡的食物是？");
      ans1.value = "";
      ans2.value = "";
    };
  }
  
  if(next2){
    next2.onclick = () => {
      if(!targetUserObj) return;
      const userAns1 = ans1.value.trim();
      const userAns2 = ans2.value.trim();
      
      const realAns1 = (targetUserObj.answer1 || "台北").trim();
      const realAns2 = (targetUserObj.answer2 || "火鍋").trim();
      
      if(userAns1 !== realAns1 || userAns2 !== realAns2){
        forgetMsg.textContent = "安全問題回答錯誤，請重新回答。";
        return;
      }
      
      forgetMsg.textContent = "";
      step2.style.display = "none";
      step3.style.display = "block";
      engineeringPass.value = "";
    };
  }
  
  if(submitBtn){
    submitBtn.onclick = () => {
      if(!targetUserObj) return;
      const engPass = engineeringPass.value;
      const masterUser = data.adminUsers.find(x => x.isMaster === true);
      const masterPass = masterUser ? masterUser.password : "123456";
      
      if(engPass !== masterPass){
        forgetMsg.textContent = "工程密碼驗證失敗！無法進入後台。";
        return;
      }
      
      currentUser = targetUserObj;
      sessionStorage.setItem("cc_admin_logged_in", "1");
      sessionStorage.setItem("cc_admin_user", targetUserObj.username);
      sessionStorage.setItem("cc_admin_user_display", targetUserObj.displayName || targetUserObj.username);
      
      showAdmin();
      refreshPermissionMenu();
      currentTab = firstAllowedTab();
      setActiveTabButton();
      logAdminChange("安全驗證登入", `帳號 ${targetUserObj.username} 透過安全問題與工程密碼成功自動登入`);
      render();
      alert("安全驗證成功！已自動帶入帳號並登入後台。");
    };
  }
}

function setActiveTabButton(){
  document.querySelectorAll("aside button").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.tab===currentTab);
  });
}

function get(path){ return path.split(".").reduce((o,k)=>o&&o[k], data); }
function set(path,value){
  const parts = path.split(".");
  let o = data;
  parts.slice(0,-1).forEach(k=>{ if(!o[k]) o[k]={}; o=o[k]; });
  o[parts.at(-1)] = value;
}
function input(path,label,type="text"){
  const val = get(path) ?? "";
  if(type==="textarea") return `<label>${label}</label><textarea data-path="${path}">${val}</textarea>`;
  return `<label>${label}</label><input data-path="${path}" value="${String(val).replace(/"/g,"&quot;")}">`;
}
function markAdminDirty(){
  window.__ccDirty010 = true;
  const save = document.getElementById("saveBtn");
  if(save){
    save.classList.add("dirty");
    save.textContent = "儲存修改*";
  }
}
window.markAdminDirty = markAdminDirty;

function renderSocialSettingItem(key, label, path, defaultUrl) {
  if (!data.socialDeviceVisibility) {
    data.socialDeviceVisibility = {};
  }
  if (!data.socialDeviceVisibility[key]) {
    let oldVal = true;
    if (data.socialVisibility && data.socialVisibility[key] === false) oldVal = false;
    if (data.socialIconVisibility && data.socialIconVisibility[key] === false) oldVal = false;
    data.socialDeviceVisibility[key] = oldVal ? "both" : "hidden";
  }
  
  const val = path ? (get(path) ?? "") : "";
  const vis = data.socialDeviceVisibility[key];
  
  return `
    <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #1e293b;">
      <label style="font-weight: 800; color: #60a5fa; display: block; margin-bottom: 8px;">${label}</label>
      ${path ? `<label style="font-size:13px; color:#94a3b8; display:block; margin-bottom:4px;">連結網址</label>
      <input data-path="${path}" value="${String(val).replace(/"/g,"&quot;")}" style="width:100%; padding:8px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:6px; margin-bottom:8px; display:block;">` : ''}
      <label style="font-size:13px; color:#94a3b8; display:block; margin-bottom:4px;">顯示設定（桌機/手機）</label>
      <select data-social-vis="${key}" style="width:100%; padding:8px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:6px; font-weight:800; display:block;">
        <option value="both" ${vis === "both" ? "selected" : ""}>🖥️ 桌機 + 📱 手機 顯示</option>
        <option value="desktop" ${vis === "desktop" ? "selected" : ""}>🖥️ 只在桌機顯示</option>
        <option value="mobile" ${vis === "mobile" ? "selected" : ""}>📱 只在手機顯示</option>
        <option value="hidden" ${vis === "hidden" ? "selected" : ""}>❌ 隱藏 / 不顯示</option>
      </select>
    </div>
  `;
}

function bindInputs(){
  document.querySelectorAll("[data-path]").forEach(el=>{
    const handler = () => {
      set(el.dataset.path, el.value);
      markAdminDirty();
    };
    el.oninput = handler;
    el.onchange = handler;
  });
  document.querySelectorAll("[data-social-vis]").forEach(el=>{
    el.onchange = () => {
      if (!data.socialDeviceVisibility) data.socialDeviceVisibility = {};
      data.socialDeviceVisibility[el.dataset.socialVis] = el.value;
      markAdminDirty();
    };
  });
}
window.toggleListExpand = function(arrName, i) {
  const key = arrName + "_" + i;
  window.expandedListItems = window.expandedListItems || {};
  window.expandedListItems[key] = !window.expandedListItems[key];
  render();
};

window.toggleDetailCard = function(k) {
  window.expandedDetailCards = window.expandedDetailCards || {};
  window.expandedDetailCards[k] = !window.expandedDetailCards[k];
  render();
};

window.moveDetailItem = function(k, idx, dir) {
  const arr = data.details[k].items;
  const target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  render();
};

window.deleteDetailItem = function(k, idx) {
  if (confirm("確定要刪除此特色項目嗎？")) {
    data.details[k].items.splice(idx, 1);
    render();
  }
};

window.addDetailItem = function(k) {
  if (!data.details[k].items) data.details[k].items = [];
  data.details[k].items.push("新特色說明");
  render();
};

window.moveQuickTool = function(idx, dir) {
  const arr = data.quickTools;
  const target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  window.__ccDirty010 = true;
  render();
};

window.deleteQuickTool = function(idx) {
  if (confirm("確定要刪除此快捷按鈕嗎？")) {
    data.quickTools.splice(idx, 1);
    window.__ccDirty010 = true;
    render();
  }
};

function move(arr,i,dir){
  const j = i + dir;
  if(j<0 || j>=arr.length) return;
  [arr[i],arr[j]] = [arr[j],arr[i]];
  render();
}

function renderList(arrName, fields, template){
  const arr = data[arrName] || [];
  window.expandedListItems = window.expandedListItems || {};
  const arrayLabels = {services:"服務項目", cases:"成功案例", partners:"關係企業", news:"最新消息", faqs:"常見問題"};
  
  return arr.map((it, i) => {
    const isExpanded = !!window.expandedListItems[arrName + "_" + i];
    const itemTitle = it.title || it.companyName || it.q || "新項目";
    
    return `
      <div class="list-accordion-item ${isExpanded ? 'expanded' : 'collapsed'}" style="border: 1px solid #334155; border-radius: 8px; margin-bottom: 12px; background: #1e293b; overflow: hidden;">
        <div class="list-accordion-header" style="padding: 12px 16px; background: #0f172a; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;" onclick="toggleListExpand('${arrName}', ${i})">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px; color: #64748b;">#${i+1}</span>
            <strong style="color: #f8fafc;">${itemTitle}</strong>
            <span style="font-size: 11px; background: ${it.visible!==false ? '#16a34a' : '#ef4444'}; color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">
              ${it.visible!==false ? '顯示' : '隱藏'}
            </span>
            ${arrName==='news' && it.pinned ? '<span style="font-size:11px; background:#3b82f6; color:#fff; padding:2px 6px; border-radius:4px;">置頂</span>' : ''}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="move-btn-mini" data-move-mini="${arrName}" data-i="${i}" data-dir="-1" style="background:#334155; border:0; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;" onclick="event.stopPropagation(); move(data['${arrName}'], ${i}, -1)">▲</button>
            <button class="move-btn-mini" data-move-mini="${arrName}" data-i="${i}" data-dir="1" style="background:#334155; border:0; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;" onclick="event.stopPropagation(); move(data['${arrName}'], ${i}, 1)">▼</button>
            <span class="accordion-arrow" style="color: #94a3b8; transition: transform 0.2s; display: inline-block; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0)'};">▼</span>
          </div>
        </div>
        
        <div class="list-accordion-content" style="padding: 16px; border-top: 1px solid #334155; display: ${isExpanded ? 'block' : 'none'};">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <button class="danger" data-del="${arrName}" data-i="${i}" style="padding: 5px 10px; font-size: 13px;">刪除此項目</button>
          </div>
          <label class="check-row" style="margin-bottom: 12px; display: block; cursor: pointer;">
            <input type="checkbox" data-arr="${arrName}" data-i="${i}" data-f="visible" ${it.visible!==false ? "checked" : ""}> 顯示此項目
          </label>
          ${arrName==="news" ? `
            <label class="check-row" style="margin-bottom: 12px; display: block; cursor: pointer;">
              <input type="checkbox" data-arr="${arrName}" data-i="${i}" data-f="pinned" ${it.pinned===true ? "checked" : ""}> 置頂顯示於最新消息最上方
            </label>
          ` : ""}
          
          ${fields.map(f => {
            const isImageField = f.k === "image";
            let listHint = "";
            if (isImageField) {
              if (arrName === "ihomeCases" || arrName === "cases") {
                listHint = " <span style='font-size:11px; color:#64748b; font-weight:normal;'>(建議尺寸: 800 x 500 像素，黃金 8:5 比例)</span>";
              } else if (arrName === "partners") {
                listHint = " <span style='font-size:11px; color:#64748b; font-weight:normal;'>(建議尺寸: 400 x 250 像素，建議白底或透明 PNG)</span>";
              } else if (arrName === "news") {
                listHint = " <span style='font-size:11px; color:#64748b; font-weight:normal;'>(建議尺寸: 800 x 500 像素)</span>";
              }
            }
            return `
              <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #94a3b8;">${f.l}${listHint}</label>
                ${isImageField ? `
                  <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px;">
                    <div style="flex: 1;">
                      <input data-arr="${arrName}" data-i="${i}" data-f="${f.k}" value="${String(it[f.k]||"").replace(/"/g,"&quot;")}" style="width: 100%;">
                    </div>
                    <div style="flex-shrink: 0; width: 80px; height: 50px; border: 1px solid #334155; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #0f172a;">
                      <img id="img_preview_${arrName}_${i}" src="${images[arrName === 'cases' ? 'case' + i : (arrName === 'partners' ? 'partner' + i : arrName + '_' + i + '_' + f.k)] || it[f.k] || 'assets/images/case-1.svg'}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                  </div>
                  <input type="file" accept="image/*" data-img-upload-arr="${arrName}" data-img-upload-idx="${i}" data-img-upload-field="${f.k}" style="margin-top: 6px; font-size: 12px;">
                ` : (f.t==="textarea" 
                  ? `<textarea data-arr="${arrName}" data-i="${i}" data-f="${f.k}" style="width: 100%; height: 80px;">${it[f.k]||""}</textarea>`
                  : `<input data-arr="${arrName}" data-i="${i}" data-f="${f.k}" value="${String(it[f.k]||"").replace(/"/g,"&quot;")}" style="width: 100%;">`
                )}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("") + `<button class="add-btn" data-add="${arrName}">新增項目</button>`;
}

function bindList(arrName, template){
  document.querySelectorAll(`[data-arr="${arrName}"]`).forEach(el=>{
    el.oninput = el.onchange = () => {
      data[arrName][+el.dataset.i][el.dataset.f] = el.type==="checkbox" ? el.checked : el.value;
    };
  });
  document.querySelectorAll(`[data-del="${arrName}"]`).forEach(btn=>{
    btn.onclick = () => {
      if (confirm("確定要刪除此項目嗎？")) {
        data[arrName].splice(+btn.dataset.i,1);
        render();
      }
    };
  });
  document.querySelectorAll(`[data-move="${arrName}"]`).forEach(btn=>{
    btn.onclick = () => move(data[arrName], +btn.dataset.i, +btn.dataset.dir);
  });
  
  // Bind list item image uploads with compression
  document.querySelectorAll(`[data-img-upload-arr="${arrName}"]`).forEach(inp => {
    inp.onchange = e => {
      const file = e.target.files[0];
      if(!file) return;
      const idx = +inp.dataset.imgUploadIdx;
      const field = inp.dataset.imgUploadField;
      
      compressImage(file, 800, 800, 0.82, (compressedBase64) => {
        const imgKey = arrName === "cases" ? "case" + idx : (arrName === "partners" ? "partner" + idx : arrName + "_" + idx + "_" + field);
        images[imgKey] = compressedBase64;
        
        // Update input
        const pathInput = document.querySelector(`input[data-arr="${arrName}"][data-i="${idx}"][data-f="${field}"]`);
        if (pathInput) {
          pathInput.value = imgKey;
        }
        data[arrName][idx][field] = imgKey;
        
        const imgPreview = document.getElementById(`img_preview_${arrName}_${idx}`);
        if (imgPreview) {
          imgPreview.src = compressedBase64;
        }
        
        save();
        render();
      });
    };
  });

  const add = document.querySelector(`[data-add="${arrName}"]`);
  if(add){
    add.onclick = () => {
      data[arrName].push(clone(template));
      render();
    };
  }
}

function displaySettings(objName,title){
  const obj = data[objName] || {};
  return `
    <div class="item">
      <h3>${title}</h3>
      <label class="check-row"><input type="checkbox" data-display="${objName}.visible" ${obj.visible!==false?"checked":""}> 顯示整個區塊</label>
      <label>主頁顯示數量</label>
      <select data-display="${objName}.limit">
        ${[3,4,6,8,10,12].map(n=>`<option value="${n}" ${(+obj.limit||4)===n?"selected":""}>${n}</option>`).join("")}
      </select>
      <label>超過數量時</label>
      <select data-display="${objName}.mode">
        <option value="more" ${obj.mode!=="carousel"?"selected":""}>顯示更多按鈕彈跳視窗</option>
        <option value="carousel" ${obj.mode==="carousel"?"selected":""}>輪播/預留</option>
      </select>
    </div>`;
}

function bindDisplay(){
  document.querySelectorAll("[data-display]").forEach(el=>{
    el.onchange = () => {
      const [obj,key] = el.dataset.display.split(".");
      if(!data[obj]) data[obj] = {};
      data[obj][key] = el.type==="checkbox" ? el.checked : (key==="limit" ? +el.value : el.value);
    };
  });
}

function getImageSpec(key) {
  let name = "圖片說明";
  let size = "不限";
  let formats = ".png, .jpg, .jpeg, .webp";
  let usage = "一般版面示意圖";
  
  if (key === "logo") {
    name = "前台網站商標 Logo";
    size = "400 x 100 或 300 x 80 像素 (寬度 400px 以內)";
    formats = ".png, .jpg, .jpeg, .svg (建議去背透明 PNG)";
    usage = "首頁左上角固定導覽列、頁尾左側商標及登入畫面";
  } else if (key === "ihome_banner_logoImage") {
    name = "愛家居網站商標 Logo";
    size = "300 x 80 像素 (高度 56px 比例)";
    formats = ".png, .jpg, .jpeg, .svg (建議去背透明 PNG)";
    usage = "愛家居頁首左側商標與英文副標題並排";
  } else if (key === "lineQr") {
    name = "前台 LINE 官方 QR Code";
    size = "150 x 150 至 300 x 300 像素 (1:1 正方形)";
    formats = ".png, .jpg, .jpeg, .svg";
    usage = "前台頁尾最右側浮動區與 LINE 客服對接";
  } else if (key === "ihome_contact_lineQr") {
    name = "愛家居 LINE 客服 QR Code";
    size = "150 x 150 至 300 x 300 像素 (1:1 正方形)";
    formats = ".png, .jpg, .jpeg, .svg";
    usage = "愛家居預約聯絡區塊官方 LINE 客戶端連結";
  } else if (key === "heroBg") {
    name = "前台主視覺 Banner 背景";
    size = "1920 x 1080 或 1920 x 800 像素 (寬螢幕比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "首頁頂部大圖背景";
  } else if (key === "ihome_banner_bgImage") {
    name = "愛家居大圖 Banner 背景";
    size = "1920 x 1080 像素";
    formats = ".jpg, .jpeg, .png";
    usage = "愛家居頂部大圖 Banner 背景";
  } else if (key === "ihome_philosophy_bgImage") {
    name = "愛家居收納理念背景圖";
    size = "900 x 600 或 800 x 800 像素";
    formats = ".jpg, .jpeg, .png";
    usage = "愛家居空間收納理念區塊實景展示圖";
  } else if (key === "siteFavicon") {
    name = "前台網址列標籤圖示 (Favicon)";
    size = "32 x 32 或 64 x 64 像素 (1:1)";
    formats = ".ico, .png, .jpg (建議去背 PNG)";
    usage = "瀏覽器標籤頁與書籤列之網址列 Icon";
  } else if (key === "ihomeFavicon") {
    name = "愛家居網址列標籤圖示 (Favicon)";
    size = "32 x 32 或 64 x 64 像素 (1:1)";
    formats = ".ico, .png, .jpg (建議去背 PNG)";
    usage = "愛家居分頁瀏覽器標籤列之 Icon";
  } else if (key === "siteOgImage") {
    name = "前台分享網址預覽圖 (OG Image)";
    size = "1200 x 630 像素 (1.91:1 黃金比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "分享網站連結至 LINE 或 FB 時顯示的預覽縮圖";
  } else if (key === "ihomeOgImage") {
    name = "愛家居分享網址預覽圖 (OG Image)";
    size = "1200 x 630 像素 (1.91:1 黃金比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "分享愛家居頁面連結時在社群顯示的預覽縮圖";
  } else if (key.startsWith("case")) {
    name = "成功案例封面圖";
    size = "800 x 500 像素 (黃金 8:5 比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "首頁成功案例區卡片封面";
  } else if (key.startsWith("partner")) {
    name = "合作夥伴企業 Logo";
    size = "400 x 250 像素";
    formats = ".png, .jpg, .jpeg (建議白底或透明 PNG)";
    usage = "首頁合作夥伴商標輪播/卡片";
  } else if (key.startsWith("news")) {
    name = "最新消息封面圖";
    size = "800 x 500 像素 (8:5 比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "最新消息列表卡片封面";
  } else if (key.startsWith("services")) {
    name = "服務項目卡片封面";
    size = "800 x 500 像素 (8:5 比例)";
    formats = ".jpg, .jpeg, .png";
    usage = "服務項目大圖卡片";
  }
  
  return `名稱：${name}\n建議尺寸：${size}\n支援格式：${formats}\n套用位置：${usage}`;
}
window.getImageSpec = getImageSpec;

function copyTextToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("網址已成功複製到剪貼簿！\n" + text);
  }).catch(err => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      alert("網址已成功複製到剪貼簿！\n" + text);
    } catch (e) {
      alert("複製失敗，請手動複製：" + text);
    }
    document.body.removeChild(textarea);
  });
}
window.copyTextToClipboard = copyTextToClipboard;

function cancelPreUpload(key) {
  const panel = document.getElementById("pre-upload-" + key);
  const fileInp = document.getElementById("file-input-" + key);
  if (panel) panel.style.display = "none";
  if (fileInp) fileInp.value = "";
}
window.cancelPreUpload = cancelPreUpload;

// 圖片 key → 對應的主要讀取檔名
const IMG_KEY_NAMES = {
  logo:"logo.png", siteLogo:"logo.png", lineQr:"line-qr.jpg", siteFavicon:"favicon.png",
  siteOgImage:"og-image.jpg", heroBg:"hero-bg.jpg",
  industry0:"industry-food.jpg", industry1:"industry-retail.jpg",
  industry2:"industry-foodcourt.jpg", industry3:"industry-district.jpg", industry4:"industry-snack.jpg",
  ihomeFavicon:"ihome-favicon.png", ihomeOgImage:"ihome-og.jpg"
};
function getImgTargetName(key){ return IMG_KEY_NAMES[key] || (key.replace(/(\d+)$/,(m)=>"-"+m) + ".jpg"); }

function imgUpload(key, label, src) {
  const s = images[key] || src || "";
  const spec = getImageSpec(key);
  
  const favShape = (key === "siteFavicon") ? ((data.appearanceConfig && data.appearanceConfig.siteFaviconShape) || "square") : (((data.ihomeConfig && data.ihomeConfig.faviconShape) || "square"));
  const isFav = key === "siteFavicon" || key === "ihomeFavicon";
  const borderRadius = (isFav && favShape === "circle") ? "50%" : "0%";
  
  return `
    <div class="item">
      <h3>
        ${label}
        <span class="info-tooltip" data-tooltip="${spec}">ℹ️</span>
      </h3>
      
      ${s ? `<img class="preview-img" id="current-preview-${key}" src="${s}" style="max-height:160px; object-fit:contain; display:block; margin-bottom:8px; border-radius:${borderRadius};">` : ""}
      
      <div class="file-upload-wrapper" id="upload-wrapper-${key}">
        <input type="file" accept="image/*" data-imgkey="${key}" style="display:none;" id="file-input-${key}">
        <button type="button" class="btn-select-file" onclick="document.getElementById('file-input-${key}').click()" style="background:#475569; color:#fff; border:0; border-radius:6px; padding:8px 16px; font-weight:800; cursor:pointer; font-size:13px; display:inline-block; margin-bottom:8px;">選擇檔案...</button>
        
        <!-- Pre-upload panel (hidden by default) -->
        <div class="pre-upload-panel" id="pre-upload-${key}" style="display:none; margin-top: 10px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(45, 156, 255, 0.25); border-radius: 6px;">
          <div class="file-info" style="font-size:13px; color:#cbd5e1; margin-bottom: 8px; line-height: 1.8;">
            <strong>選取檔案：</strong><span class="file-name" id="file-name-${key}">-</span><br>
            <strong>儲存為（覆蓋）：</strong><span style="color:#4ade80;font-weight:bold">${getImgTargetName(key)}</span><br>
            <strong>格式：</strong><span class="file-ext" id="file-ext-${key}">-</span>
          </div>
          <img class="temp-preview" id="temp-preview-${key}" style="max-height:100px; object-fit:contain; display:block; margin-bottom:8px; border-radius: ${borderRadius}; border:1px solid rgba(255,255,255,0.1);">
          
          <div class="progress-bar-container" id="progress-container-${key}" style="display:none; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 6px; position:relative;">
            <div class="progress-bar" id="progress-bar-${key}" style="width: 0%; height: 100%; background: #2d9cff; transition: width 0.1s ease;"></div>
          </div>
          <span class="progress-text" id="progress-text-${key}" style="font-size:12px; color:#2d9cff; display:none; margin-bottom: 8px; font-weight:bold;">0%</span>
          
          <div class="upload-actions">
            <button type="button" class="btn-confirm-upload" id="btn-confirm-${key}" style="background:#1688ef; color:#fff; border:0; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:800; cursor:pointer;">確認正式上傳</button>
            <button type="button" class="btn-cancel-upload" id="btn-cancel-${key}" onclick="cancelPreUpload('${key}')" style="background:#475569; color:#fff; border:0; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:800; cursor:pointer; margin-left:8px;">取消</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindImg() {
  document.querySelectorAll("[data-imgkey]").forEach(inp => {
    inp.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      
      const key = inp.dataset.imgkey;
      const panel = document.getElementById(`pre-upload-${key}`);
      const nameEl = document.getElementById(`file-name-${key}`);
      const extEl = document.getElementById(`file-ext-${key}`);
      const prevEl = document.getElementById(`temp-preview-${key}`);
      const confirmBtn = document.getElementById(`btn-confirm-${key}`);
      const cancelBtn = document.getElementById(`btn-cancel-${key}`);
      const progContainer = document.getElementById(`progress-container-${key}`);
      const progBar = document.getElementById(`progress-bar-${key}`);
      const progText = document.getElementById(`progress-text-${key}`);
      
      if (!panel || !nameEl || !extEl || !prevEl || !confirmBtn) return;
      
      nameEl.textContent = file.name;
      const dotIndex = file.name.lastIndexOf('.');
      extEl.textContent = dotIndex !== -1 ? file.name.substring(dotIndex).toUpperCase() : "未知";
      
      const tempReader = new FileReader();
      tempReader.onload = (ev) => {
        prevEl.src = ev.target.result;
        panel.style.display = "block";
      };
      tempReader.readAsDataURL(file);
      
      confirmBtn.onclick = () => {
        confirmBtn.style.display = "none";
        cancelBtn.style.display = "none";
        progContainer.style.display = "block";
        progText.style.display = "block";
        
        let percent = 0;
        const interval = setInterval(() => {
          percent += 10;
          progBar.style.width = `${percent}%`;
          progText.textContent = `${percent}% 上傳中...`;
          
          if (percent >= 100) {
            clearInterval(interval);
            
            const isLogo = key === "logo" || key === "lineQr" || key === "ihome_banner_logoImage" || key === "ihome_contact_lineQr" || key === "siteFavicon" || key === "ihomeFavicon";
            const maxWidth = isLogo ? 400 : 1024;
            const maxHeight = isLogo ? 400 : 1024;
            const quality = 0.82;
            
            let shape = "square";
            if (key === "siteFavicon") {
              shape = (data.appearanceConfig && data.appearanceConfig.siteFaviconShape) || "square";
            } else if (key === "ihomeFavicon") {
              shape = (data.ihomeConfig && data.ihomeConfig.faviconShape) || "square";
            }
            compressImage(file, maxWidth, maxHeight, quality, shape, (compressedBase64) => {
              images[key] = compressedBase64;
              if (key === "logo") {
                images.siteLogo = compressedBase64;
                images.headerLogo = compressedBase64;
              }
              // 行業封面：同步更新 data.industries[i].image
              const industryMatch = key.match(/^industry(\d+)$/);
              if(industryMatch){
                const idx = parseInt(industryMatch[1]);
                if(data.industries && data.industries[idx]) data.industries[idx].image = compressedBase64;
              }
              // 案例封面：同步更新 data.cases[i].image
              const caseMatch = key.match(/^case(\d+)$/);
              if(caseMatch){
                const idx = parseInt(caseMatch[1]);
                if(data.cases && data.cases[idx]) data.cases[idx].image = compressedBase64;
              }
              // 關係企業封面：同步更新 data.partners[i].image
              const partnerMatch = key.match(/^partner(\d+)$/);
              if(partnerMatch){
                const idx = parseInt(partnerMatch[1]);
                if(data.partners && data.partners[idx]) data.partners[idx].image = compressedBase64;
              }

              progText.textContent = "✓ 上傳成功！已覆蓋 " + getImgTargetName(key);
              progText.style.color = "#4ade80";
              progBar.style.background = "#4ade80";
              // 立即更新後台當前預覽圖
              const curPreview = document.getElementById("current-preview-" + key);
              if(curPreview){ curPreview.src = compressedBase64; curPreview.style.display = "block"; }
              // 隱藏 pre-upload panel，回到正常狀態
              const prePanel = document.getElementById("pre-upload-" + key);
              if(prePanel){ setTimeout(()=>{ prePanel.style.display="none"; }, 1200); }
              markAdminDirty();
              setTimeout(() => {
                syncAdminLogoImages();
                ccV16AdminEnhance();
                render();
              }, 600);
            });
          }
        }, 80);
      };
    };
  });
}
function render(){
  if(currentUser && !hasPerm(currentTab)){
    currentTab = firstAllowedTab();
    setActiveTabButton();
    updateMobileCurrentTab();
  }
  const c = document.getElementById("adminContent");

  if(currentTab==="basic"){
    const f = data.contactFields;
    c.innerHTML = `<div class="group"><h2>基本資料</h2><p>可設定欄位名稱、內容與是否顯示。</p>
      ${Object.keys(f).map(k=>`
        <div class="item">
          <label class="check-row"><input type="checkbox" data-cf="${k}.show" ${f[k].show!==false?"checked":""}> 顯示 ${f[k].label}</label>
          <label>顯示名稱</label><input data-cf="${k}.label" value="${f[k].label||""}">
          <label>內容</label><textarea data-cf="${k}.value">${f[k].value||""}</textarea>
        </div>`).join("")}
      
      <h3>社群與聯絡工具連結與顯示設定</h3>
      <p class="small" style="color: #94a3b8; margin-bottom: 12px;">可在此設定各社群連結，並選擇顯示於「桌機」、「手機」、「兩者」或「隱藏」。<br>※ 若網址無輸入或為預設值，前台會自動隱藏圖示。</p>
      ${renderSocialSettingItem("line", "LINE 連結", "contact.lineUrl", "")}
      ${renderSocialSettingItem("facebook", "Facebook / 粉絲專頁", "contact.facebookUrl", "https://facebook.com/")}
      ${renderSocialSettingItem("instagram", "Instagram (IG)", "contact.instagramUrl", "https://instagram.com/")}
      ${renderSocialSettingItem("youtube", "YouTube 頻道", "contact.youtubeUrl", "https://youtube.com/")}
      ${renderSocialSettingItem("email", "Email / 聯絡表單圖示", "", "")}
    </div>`;
    bindInputs();
    document.querySelectorAll("[data-cf]").forEach(el=>{
      el.oninput = el.onchange = () => {
        const [k,fld] = el.dataset.cf.split(".");
        data.contactFields[k][fld] = el.type==="checkbox" ? el.checked : el.value;
        if(fld==="value" && data.contact[k]!==undefined) data.contact[k] = el.value;
        markAdminDirty();
      };
    });
  }

  if(currentTab==="header"){
    const labels = data.navLabels, vis = data.headerVisibility;
    c.innerHTML = `<div class="group"><h2>頁首欄位顯示與名稱</h2>
      ${Object.keys(labels).map(k=>`
        <div class="item">
          <label class="check-row"><input type="checkbox" data-hv="${k}" ${vis[k]!==false?"checked":""}> 顯示</label>
          <label>頁籤名稱</label><input data-navlabel="${k}" value="${labels[k]}">
        </div>`).join("")}
    </div>`;
    document.querySelectorAll("[data-hv]").forEach(el=>el.onchange=()=>data.headerVisibility[el.dataset.hv]=el.checked);
    document.querySelectorAll("[data-navlabel]").forEach(el=>el.oninput=()=>data.navLabels[el.dataset.navlabel]=el.value);
  }

  if(currentTab==="footer"){
    c.innerHTML = `<div class="group"><h2>頁尾顯示</h2>
      ${["company","contact","services","quickLinks","qr","social"].map(k=>{
        const label={company:"公司資訊 / Logo",contact:"聯絡資訊",services:"服務項目",quickLinks:"快速連結",qr:"官方 LINE QR",social:"社群按鈕"}[k];
        return `<label class="check-row"><input type="checkbox" data-fv="${k}" ${data.footerVisibility[k]!==false?"checked":""}> ${label}</label>`;
      }).join("")}
    </div>`;
    document.querySelectorAll("[data-fv]").forEach(el=>el.onchange=()=>data.footerVisibility[el.dataset.fv]=el.checked);
  }

  if(currentTab==="security"){
    c.innerHTML = `<div class="group"><h2>後台帳號密碼</h2>
      <label>後台帳號</label><input id="adminUserInput" value="${currentUser.username||"admin"}">
      <label>舊密碼</label><div class="password-wrap"><input id="oldPass" type="password"><button type="button" class="eye-btn" data-eye="oldPass">👁</button></div>
      <label>新密碼</label><div class="password-wrap"><input id="newPass" type="password"><button type="button" class="eye-btn" data-eye="newPass">👁</button></div>
      <label>確認新密碼</label><div class="password-wrap"><input id="confirmPass" type="password"><button type="button" class="eye-btn" data-eye="confirmPass">👁</button></div>
      <button class="add-btn" id="changePasswordBtn">儲存變更帳號密碼</button>
      <div id="passwordMsg"></div>
    </div>`;
    document.querySelectorAll("[data-eye]").forEach(btn=>{
      btn.onclick = () => {
        const inp = document.getElementById(btn.dataset.eye);
        inp.type = inp.type==="password" ? "text" : "password";
        btn.textContent = inp.type==="password" ? "👁" : "🙈";
      };
    });
    changePasswordBtn.onclick = () => {
      if(oldPass.value !== currentUser.password){
        passwordMsg.textContent = "舊密碼錯誤";
        passwordMsg.style.color = "#fca5a5";
        return;
      }
      if(!newPass.value || newPass.value !== confirmPass.value){
        passwordMsg.textContent = "新密碼與確認密碼不一致";
        passwordMsg.style.color = "#fca5a5";
        return;
      }
      currentUser.username = adminUserInput.value.trim() || currentUser.username;
      currentUser.password = newPass.value;
      sessionStorage.setItem("cc_admin_user", currentUser.username);
      sessionStorage.setItem("cc_admin_user_display", currentUser.displayName || currentUser.username);
      logAdminChange("變更後台密碼","修改自己的登入帳號或密碼");
      save();
      passwordMsg.textContent = "已變更";
      passwordMsg.style.color = "#86efac";
    };
  }

  if(currentTab==="users"){
    ensureUsers();
    const logs = JSON.parse(localStorage.getItem("cc_admin_audit_logs")||"[]").slice(0,8);
    const userRows = data.adminUsers.map((u,i)=>({u,i})).filter(x=>!x.u.isMaster || hasPerm("masterAccount"));
    
    if(userEditMode === "list"){
      c.innerHTML = `<div class="group">
        <h2>使用者權限管理</h2>
        ${!hasPerm("masterAccount")?`<div class="master-hidden-note">工程總帳號已隱藏。只有具備「工程總帳號修改」權限的使用者可以查看與修改。</div>`:""}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <button class="add-btn" id="goAddUserBtn">+ 新增使用者</button>
          <div style="display:flex; gap:8px;">
            <button class="move-btn" id="batchEnableBtn" style="background:#16a34a;">批次啟用</button>
            <button class="move-btn" id="batchDisableBtn" style="background:#e11d48;">批次停用</button>
            <button class="move-btn" id="batchDeleteBtn" style="background:#dc2626;">批次刪除</button>
          </div>
        </div>
        
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; background:#0f172a; border-radius:10px; overflow:hidden;">
            <thead>
              <tr style="background:#1e293b; color:#cbd5e1; border-bottom:1px solid #334155;">
                <th style="padding:14px; width:48px; text-align:center;"><input type="checkbox" id="selectAllUsersCheckbox"></th>
                <th style="padding:14px;">姓名 / 帳號</th>
                <th style="padding:14px;">Email</th>
                <th style="padding:14px; width:100px;">狀態</th>
                <th style="padding:14px; width:100px;">安全問題</th>
                <th style="padding:14px; width:220px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${userRows.map(({u,i})=> {
                const isEnabled = u.enabled !== false;
                const hasQuestions = u.question1 && u.answer1 && u.question2 && u.answer2;
                return `
                  <tr style="border-bottom:1px solid #334155; transition:background 0.2s; ${!isEnabled?'opacity:0.45; background:rgba(0,0,0,0.15);':''}">
                    <td style="padding:14px; text-align:center;"><input type="checkbox" class="user-select-checkbox" data-idx="${i}" ${u.isMaster?'disabled':''}></td>
                    <td style="padding:14px; font-weight:800;">
                      ${u.displayName || u.username} <span style="font-size:12px; color:#64748b; font-weight:normal;">(${u.username})</span>
                      ${u.isMaster?'<span style="font-size:11px; background:#475569; color:#fff; padding:2px 6px; border-radius:4px; margin-left:6px;">總帳號</span>':''}
                    </td>
                    <td style="padding:14px; color:#94a3b8; font-size:14px;">${u.email || '未填寫'}</td>
                    <td style="padding:14px;">
                      <span style="color:${isEnabled?'#22c55e':'#ef4444'}; font-weight:800; font-size:14px;">${isEnabled?'● 啟用':'● 停用'}</span>
                    </td>
                    <td style="padding:14px; font-size:14px;">
                      <span style="color:${hasQuestions?'#22c55e':'#eab308'}; font-weight:800;">${hasQuestions?'已設定':'未設定'}</span>
                    </td>
                    <td style="padding:14px;">
                      <div style="display:flex; gap:6px;">
                        <button class="move-btn" style="background:#2563eb; padding:5px 10px; font-size:13px;" data-user-edit="${i}">編輯</button>
                        ${u.isMaster ? '' : `
                          <button class="move-btn" style="background:#475569; padding:5px 10px; font-size:13px;" data-user-toggle-status="${i}">
                            ${isEnabled?'停用':'啟用'}
                          </button>
                          <button class="danger" style="padding:5px 10px; font-size:13px;" data-user-delete-btn="${i}">刪除</button>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="group">
        <h2>最近使用者變更紀錄</h2>
        ${logs.length?logs.map(l=>`<div class="item"><b>${l.createdAt}</b>｜${l.actor||""}｜${l.action}<br><span class="small">${l.detail||""}</span></div>`).join(""):"<p>尚無紀錄</p>"}
      </div>`;
      
      const selectAll = document.getElementById("selectAllUsersCheckbox");
      if(selectAll){
        selectAll.onclick = () => {
          document.querySelectorAll(".user-select-checkbox:not(:disabled)").forEach(cb => {
            cb.checked = selectAll.checked;
          });
        };
      }
      
      document.getElementById("goAddUserBtn").onclick = () => {
        userEditMode = "new";
        editingUserIndex = -1;
        render();
      };
      
      document.getElementById("batchEnableBtn").onclick = () => {
        const selected = [...document.querySelectorAll(".user-select-checkbox:checked")].map(cb => +cb.dataset.idx);
        if(selected.length===0){ alert("請先勾選使用者！"); return; }
        selected.forEach(idx => data.adminUsers[idx].enabled = true);
        logAdminChange("批次變更","批次啟用 "+selected.length+" 位使用者");
        render();
      };
      
      document.getElementById("batchDisableBtn").onclick = () => {
        const selected = [...document.querySelectorAll(".user-select-checkbox:checked")].map(cb => +cb.dataset.idx);
        if(selected.length===0){ alert("請先勾選使用者！"); return; }
        selected.forEach(idx => data.adminUsers[idx].enabled = false);
        logAdminChange("批次變更","批次停用 "+selected.length+" 位使用者");
        render();
      };
      
      document.getElementById("batchDeleteBtn").onclick = () => {
        const selected = [...document.querySelectorAll(".user-select-checkbox:checked")].map(cb => +cb.dataset.idx).sort((a,b)=>b-a);
        if(selected.length===0){ alert("請先勾選使用者！"); return; }
        if(confirm("確定要刪除這 "+selected.length+" 位使用者嗎？")){
          selected.forEach(idx => {
            data.adminUsers.splice(idx, 1);
          });
          logAdminChange("批次變更","批次刪除 "+selected.length+" 位使用者");
          render();
        }
      };
      
      document.querySelectorAll("[data-user-edit]").forEach(btn => {
        btn.onclick = () => {
          userEditMode = "edit";
          editingUserIndex = +btn.dataset.userEdit;
          render();
        };
      });
      
      document.querySelectorAll("[data-user-toggle-status]").forEach(btn => {
        btn.onclick = () => {
          const idx = +btn.dataset.userToggleStatus;
          const u = data.adminUsers[idx];
          u.enabled = u.enabled === false;
          logAdminChange("變更使用者狀態", `變更帳號 ${u.username} 的狀態為 ${u.enabled?'啟用':'停用'}`);
          render();
        };
      });
      
      document.querySelectorAll("[data-user-delete-btn]").forEach(btn => {
        btn.onclick = () => {
          const idx = +btn.dataset.userDeleteBtn;
          const name = data.adminUsers[idx].username;
          if(confirm(`確定要刪除帳號 ${name} 嗎？`)){
            data.adminUsers.splice(idx, 1);
            logAdminChange("刪除使用者", `刪除使用者：${name}`);
            render();
          }
        };
      });
      
    } else {
      const isNew = userEditMode === "new";
      let u = null;
      if(isNew){
        u = {
          enabled: true, isMaster: false, username: "", password: "", displayName: "", email: "",
          question1: "您的出生地是？", answer1: "台北",
          question2: "您最喜歡的食物是？", answer2: "火鍋",
          permissions: {basic:true,header:false,footer:false,security:false,users:false,editEntry:false,appearance:false,hero:true,services:true,cases:true,partners:true,news:true,faq:true,form:false,images:true,backup:false}
        };
      } else {
        u = data.adminUsers[editingUserIndex];
      }
      
      c.innerHTML = `<div class="group">
        <h2>${isNew ? '✨ 新增使用者' : '✏️ 編輯使用者資料'}</h2>
        
        <div class="wide-grid" style="margin-bottom:12px;">
          <div>
            <label>帳號 (登入名稱)</label>
            <input id="formUser" value="${u.username}" ${(!isNew && u.isMaster) ? 'disabled':''}>
          </div>
          <div>
            <label>登入密碼</label>
            <div class="password-wrap">
              <input id="formPass" type="password" value="${u.password}" ${(!isNew && u.isMaster && !hasPerm("masterAccount")) ? 'disabled':''}>
              <button type="button" id="toggleFormPass" class="eye-btn">👁</button>
            </div>
          </div>
          <div>
            <label>顯示名稱 / 員工姓名</label>
            <input id="formDisplayName" value="${u.displayName}">
          </div>
        </div>
        
        <div class="grid" style="margin-bottom:12px;">
          <div>
            <label>電子郵件 Email</label>
            <input id="formEmail" type="email" value="${u.email}">
          </div>
          <div>
            <label class="check-row" style="margin-top:36px; cursor:pointer;">
              <input type="checkbox" id="formEnabled" ${u.enabled!==false ? 'checked':''} ${u.isMaster ? 'disabled':''}> 啟用此帳號
            </label>
          </div>
        </div>
        
        <div style="border:1px solid #334155; border-radius:10px; padding:16px; margin:20px 0; background:rgba(30,41,59,0.35);">
          <h3 style="margin-top:0; color:#3b82f6;">🛡️ 安全問題驗證設定 (用於忘記密碼)</h3>
          <p class="small" style="color:#94a3b8; margin-bottom:14px;">請輸入兩個安全防護問題與正確答案，以供忘記密碼時回答比對。</p>
          <div class="grid">
            <div>
              <label>安全問題 1 題目</label>
              <input id="formQ1" value="${u.question1 || '您的出生地是？'}">
              <label style="margin-top:8px;">回答 1</label>
              <input id="formA1" value="${u.answer1 || '台北'}">
            </div>
            <div>
              <label>安全問題 2 題目</label>
              <input id="formQ2" value="${u.question2 || '您最喜歡的食物是？'}">
              <label style="margin-top:8px;">回答 2</label>
              <input id="formA2" value="${u.answer2 || '火鍋'}">
            </div>
          </div>
        </div>
        
        <div style="border:1px solid #334155; border-radius:10px; padding:16px; margin:20px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0;">👥 權限勾選設定</h3>
            <button type="button" class="move-btn" style="background:#2563eb; padding:6px 12px; font-size:13px;" id="formSelectAllBtn">全選 / 全不選</button>
          </div>
          <div class="perm-grid">
            ${PERMISSION_KEYS.filter(p=>p!=="masterAccount" || hasPerm("masterAccount")).map(k=>`
              <label class="check-row" style="cursor:pointer;">
                <input type="checkbox" class="form-perm-checkbox" data-perm="${k}" ${u.permissions?.[k] ? 'checked':''}> ${TAB_LABELS[k]}
              </label>
            `).join("")}
          </div>
        </div>
        
        <div style="display:flex; gap:12px; margin-top:24px;">
          <button class="add-btn" id="formSaveBtn" style="flex:1; padding:12px;">儲存資料</button>
          <button class="danger" id="formCancelBtn" style="background:#475569; flex:1; padding:12px;">取消並返回</button>
        </div>
      </div>`;
      
      const formPass = document.getElementById("formPass");
      const toggleFormPass = document.getElementById("toggleFormPass");
      if(toggleFormPass && formPass){
        toggleFormPass.onclick = () => {
          formPass.type = formPass.type === "password" ? "text" : "password";
          toggleFormPass.textContent = formPass.type === "password" ? "👁" : "🙈";
        };
      }
      
      const formSelectAll = document.getElementById("formSelectAllBtn");
      if(formSelectAll){
        formSelectAll.onclick = () => {
          const cbs = document.querySelectorAll(".form-perm-checkbox");
          const allChecked = [...cbs].every(cb => cb.checked);
          cbs.forEach(cb => cb.checked = !allChecked);
        };
      }
      
      document.getElementById("formCancelBtn").onclick = () => {
        userEditMode = "list";
        render();
      };
      
      document.getElementById("formSaveBtn").onclick = () => {
        const u = isNew ? {enabled:true,isMaster:false,permissions:{}} : data.adminUsers[editingUserIndex];
        u.username = document.getElementById("formUser").value;
        u.password = document.getElementById("formPass").value;
        u.displayName = document.getElementById("formDisplayName").value;
        u.email = document.getElementById("formEmail").value;
        u.enabled = document.getElementById("formEnabled").checked;
        u.question1 = document.getElementById("formQ1").value;
        u.answer1 = document.getElementById("formA1").value;
        u.question2 = document.getElementById("formQ2").value;
        u.answer2 = document.getElementById("formA2").value;
        const perms = {};
        document.querySelectorAll(".form-perm-checkbox").forEach(cb => perms[cb.dataset.perm] = cb.checked);
        u.permissions = perms;
        if(isNew) data.adminUsers.push(u);
        logAdminChange(isNew?"新增使用者":"編輯使用者", `帳號: ${u.username}`);
        userEditMode = "list";
        render();
      };
    }
  }

  if(currentTab==="editEntry"){
    c.innerHTML = `<div class="group"><h2>主網頁後台入口</h2>
      <label class="check-row"><input type="checkbox" id="editShow" ${data.editEntry.show!==false?"checked":""}> 顯示在網站上</label>
      ${input("editEntry.icon","入口 ICON")}
      ${input("editEntry.title","提示文字")}
      <label>位置</label>
      <select id="editPosition"><option value="bottom-left">左下</option><option value="bottom-right">右下</option><option value="top-left">左上</option><option value="top-right">右上</option></select>
    </div>`;
    bindInputs();
    editShow.onchange = e => data.editEntry.show=e.target.checked;
    editPosition.value = data.editEntry.position || "bottom-left";
    editPosition.onchange = e => data.editEntry.position=e.target.value;
  }

  if(currentTab==="appearance"){
  if(!data.appearanceConfig)data.appearanceConfig={desktopLogoHeight:56,mobileLogoHeight:64,adminLoginLogoHeight:58,footerLineQrShow:true,footerLineQrLabel:"顯示 LINE",footerLineQrImage:"assets/images/line-qr.png",footerLineQrSize:150,animationDuration:1.2,animationType:"fadeInUp",siteFaviconShape:"square"};
  const animTypeVal = data.appearanceConfig.animationType || "fadeInUp";
  const siteFavShape = data.appearanceConfig.siteFaviconShape || "square";
  c.innerHTML=`<div class="group"><h2>商標 / 圖片位置設定</h2>
  <p>調整前台與後台 Logo 大小，以及設定 LINE QR 圖片顯示。</p>
  
  <div class="item">
    <h3>Logo 大小與位置</h3>
    ${input("appearanceConfig.desktopLogoHeight","桌機 Logo 高度 px")}
    ${input("appearanceConfig.mobileLogoHeight","手機 Logo 高度 px")}
    ${input("appearanceConfig.adminLoginLogoHeight","後台登入 Logo 高度 px")}
    ${imgUpload("logo","首頁 Logo 圖片","assets/images/logo.png")}
  </div>
  
  <div class="item">
    <h3>頁尾 LINE QR 與設定</h3>
    <label class="check-row"><input type="checkbox" id="footerLineQrShow" ${data.appearanceConfig.footerLineQrShow!==false?"checked":""}> 顯示 LINE QR</label>
    ${input("appearanceConfig.footerLineQrLabel","QR 顯示標題")}
    ${input("appearanceConfig.footerLineQrImage","QR 圖片路徑，例如 assets/images/line-qr.png")}
    ${input("appearanceConfig.footerLineQrSize","QR 圖片大小 px")}
    ${input("appearanceConfig.lineJoinUrl","點選 QR / LINE ID 對應之 LINE 加入好友連結")}
    ${input("appearanceConfig.versionLabel","版本號文字")}
    ${imgUpload("lineQr","LINE QR 圖片","assets/images/line-qr.png")}
  </div>

  <div class="item">
    <h3>網頁載入區塊動畫設定</h3>
    ${input("appearanceConfig.animationDuration","動畫播放秒數 (秒)", "number")}
    <label>動畫展開方式</label>
    <select data-path="appearanceConfig.animationType" style="width:100%; padding:10px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#fff; font-size:14px; margin-bottom:12px;">
      <option value="fadeInUp" ${animTypeVal === "fadeInUp" ? "selected" : ""}>向上漸入 (fadeInUp)</option>
      <option value="fadeInDown" ${animTypeVal === "fadeInDown" ? "selected" : ""}>向下漸入 (fadeInDown)</option>
      <option value="zoomIn" ${animTypeVal === "zoomIn" ? "selected" : ""}>縮放微擴 (zoomIn)</option>
      <option value="fade" ${animTypeVal === "fade" ? "selected" : ""}>純淡入 (fade)</option>
    </select>
  </div>

  <div class="item">
    <h3>網址、圖示與分享預覽 (Favicon / OG Image)</h3>
    <div style="margin-bottom:12px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:space-between;">
      <div>
        <strong style="color:#cbd5e1; font-size:13.5px;">前台首頁網址：</strong>
        <span style="color:#94a3b8; font-size:12.5px;" id="frontend-url-text">-</span>
      </div>
      <button type="button" onclick="copyTextToClipboard(document.getElementById('frontend-url-text').textContent)" style="background:#2d9cff; color:#fff; border:0; border-radius:4px; padding:6px 12px; font-size:12px; font-weight:800; cursor:pointer;">一鍵複製網址</button>
    </div>
    ${imgUpload("siteFavicon","網址列標籤圖示 (Favicon)","assets/images/logo.png")}
    <label>網址列標籤圖示形狀</label>
    <select data-path="appearanceConfig.siteFaviconShape" style="width:100%; padding:10px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#fff; font-size:14px; margin-bottom:12px;" id="siteFaviconShapeInp">
      <option value="square" ${siteFavShape === "square" ? "selected" : ""}>方形 (Square)</option>
      <option value="circle" ${siteFavShape === "circle" ? "selected" : ""}>圓形 (Circle)</option>
    </select>
    ${imgUpload("siteOgImage","分享連結預覽圖 (OG Image)","assets/images/hero-bg.jpg")}
  </div>
  </div>`;
  
  bindInputs();
  bindImg();

  setTimeout(() => {
    const siteFavInp = document.getElementById("siteFaviconShapeInp");
    if (siteFavInp) {
      siteFavInp.addEventListener("change", () => {
        const prev = document.getElementById("current-preview-siteFavicon");
        const tempPrev = document.getElementById("temp-preview-siteFavicon");
        const radius = siteFavInp.value === "circle" ? "50%" : "0%";
        if (prev) prev.style.borderRadius = radius;
        if (tempPrev) tempPrev.style.borderRadius = radius;
      });
    }
    const frontText = document.getElementById("frontend-url-text");
    if (frontText) frontText.textContent = location.origin + location.pathname.replace("admin.html", "index.html");
  }, 50);
}
if(currentTab==="hero"){
    c.innerHTML = `<div class="group"><h2>主視覺</h2>
      ${input("hero.eyebrow","小標")}
      ${input("hero.title","主標題","textarea")}
      ${input("hero.subtitle","副標題","textarea")}
      <label>重點文字，用逗號分隔</label><input id="hp" value="${data.hero.points.join(",")}">
      ${imgUpload("heroBg","首頁主圖","assets/images/hero-bg.jpg")}
    </div>`;
    bindInputs();
    bindImg();
    hp.oninput = e => data.hero.points=e.target.value.split(",").map(x=>x.trim()).filter(Boolean);
  }

  if(currentTab==="details"){
    const details = data.details || {};
    const keys = ["posDetail", "hardwareDetail", "invoiceDetail", "paymentDetail", "customDetail"];
    window.expandedDetailCards = window.expandedDetailCards || {};
    
    c.innerHTML = `
      <div class="group">
        <h2>服務細節模組編輯</h2>
        <p>編輯前台點擊「了解更多」時所對應的 5 個核心服務細節內容。</p>
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${keys.map(k => {
            const m = details[k] || { title: k, headline: "", text: "", items: [] };
            const isExpanded = !!window.expandedDetailCards[k];
            return `
              <div class="detail-accordion-card" style="border:1px solid #334155; border-radius:10px; background:#1e293b; overflow:hidden;">
                <div class="detail-accordion-header" style="padding:14px 18px; background:#0f172a; cursor:pointer; display:flex; justify-content:space-between; align-items:center; user-select:none;" onclick="toggleDetailCard('${k}')">
                  <strong style="font-size:16px; color:#3b82f6;">${m.title || k} (${k})</strong>
                  <span class="detail-accordion-arrow" style="color:#94a3b8; transition:transform 0.2s; transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0)'};">▼</span>
                </div>
                
                <div class="detail-accordion-content" style="padding:18px; border-top:1px solid #334155; display:${isExpanded ? 'block' : 'none'};">
                  <div style="margin-bottom:12px;">
                    <label>模組名稱 (前台小標籤)</label>
                    <input data-detail-key="${k}" data-detail-field="title" value="${String(m.title||"").replace(/"/g,"&quot;")}" style="width:100%;">
                  </div>
                  <div style="margin-bottom:12px;">
                    <label>主標題</label>
                    <input data-detail-key="${k}" data-detail-field="headline" value="${String(m.headline||"").replace(/"/g,"&quot;")}" style="width:100%;">
                  </div>
                  <div style="margin-bottom:12px;">
                    <label>內文說明</label>
                    <textarea data-detail-key="${k}" data-detail-field="text" style="width:100%; height:80px;">${m.text||""}</textarea>
                  </div>
                  
                  <div style="margin-top:16px; border-top:1px dashed #334155; padding-top:14px;">
                    <h4 style="margin:0 0 10px 0; color:#cbd5e1;">特色項目清單 (點擊外部打勾圖示列出的項目)</h4>
                    <div id="detail_items_list_${k}" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                      ${(m.items || []).map((item, idx) => `
                        <div style="display:flex; gap:8px; align-items:center;">
                          <span style="font-size:13px; color:#64748b; width:24px;">#${idx+1}</span>
                          <input data-detail-item-key="${k}" data-detail-item-idx="${idx}" value="${String(item||"").replace(/"/g,"&quot;")}" style="flex:1;">
                          <button type="button" class="move-btn-mini" onclick="moveDetailItem('${k}', ${idx}, -1)" style="padding:4px 8px; font-size:11px;">▲</button>
                          <button type="button" class="move-btn-mini" onclick="moveDetailItem('${k}', ${idx}, 1)" style="padding:4px 8px; font-size:11px;">▼</button>
                          <button type="button" class="danger" onclick="deleteDetailItem('${k}', ${idx})" style="padding:4px 8px; font-size:11px;">刪除</button>
                        </div>
                      `).join("")}
                    </div>
                    <button type="button" class="add-btn" onclick="addDetailItem('${k}')" style="margin-top:8px;">+ 新增特色項目</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
    
    // Bind detail fields
    document.querySelectorAll("[data-detail-key]").forEach(el => {
      el.oninput = () => {
        const k = el.dataset.detailKey;
        const field = el.dataset.detailField;
        if(!data.details) data.details = {};
        if(!data.details[k]) data.details[k] = { title: k, headline: "", text: "", items: [] };
        data.details[k][field] = el.value;
      };
    });
    
    document.querySelectorAll("[data-detail-item-key]").forEach(el => {
      el.oninput = () => {
        const k = el.dataset.detailItemKey;
        const idx = +el.dataset.detailItemIdx;
        data.details[k].items[idx] = el.value;
      };
    });
  }

  if(currentTab==="services"){
    c.innerHTML = `<div class="group"><h2>服務項目</h2>
      ${input("servicesTitle","標題")}
      ${input("servicesSubtitle","副標")}
      ${renderList("services",[
        {k:"title",l:"標題"},{k:"text",l:"文字",t:"textarea"},
        {k:"icon",l:"圖示 monitor/printer/invoice/payment/code/headset"},
        {k:"target",l:"點擊區塊ID"}
      ],{visible:true,icon:"monitor",title:"新服務",text:"說明",target:"contact"})}
    </div>`;
    bindInputs();
    bindList("services",{visible:true,icon:"monitor",title:"新服務",text:"說明",target:"contact"});
  }

  if(currentTab==="cases"){
    c.innerHTML = `<div class="group"><h2>成功案例</h2>
      ${input("casesTitle","區塊標題")}
      ${displaySettings("casesDisplay","顯示設定")}
      <p style="color:#94a3b8;font-size:13px;margin-bottom:8px">💡 封面圖可在下方直接上傳，或填入網址路徑</p>
      ${renderList("cases",[
        {k:"title",l:"標題"},{k:"subtitle",l:"小標題"},{k:"text",l:"內文",t:"textarea"},
        {k:"image",l:"封面圖路徑（可上傳後自動填入）"},{k:"url",l:"網址"}
      ],{visible:false,title:"新案例",subtitle:"",text:"",image:"assets/images/case-1.svg",url:""})}
      <h3 style="margin-top:20px">📷 案例封面圖上傳</h3>
      <div id="case-img-uploads">
        ${(data.cases||[]).map((_,i)=>imgUpload("case"+i,"案例 "+(i+1)+" 封面","assets/images/case-1.svg")).join("")}
      </div>
    </div>`;
    bindInputs(); bindDisplay();
    bindList("cases",{visible:false,title:"新案例",subtitle:"",text:"",image:"assets/images/case-1.svg",url:""});
    bindImg();
  }

  if(currentTab==="partners"){
    c.innerHTML = `<div class="group"><h2>關係企業</h2>
      ${input("partnersTitle","區塊標題")}
      ${displaySettings("partnersDisplay","顯示設定")}
      <p style="color:#94a3b8;font-size:13px;margin-bottom:8px">💡 封面圖可在下方直接上傳，或填入路徑</p>
      ${renderList("partners",[
        {k:"companyName",l:"公司名稱"},{k:"phone",l:"電話"},{k:"lineUrl",l:"LINE網址"},
        {k:"facebookUrl",l:"粉專網址"},{k:"websiteUrl",l:"形象網站"},
        {k:"image",l:"封面圖路徑（可上傳後自動填入）"},{k:"description",l:"介紹",t:"textarea"}
      ],{visible:false,image:"assets/images/case-1.svg",companyName:"新關係企業",phone:"",lineUrl:"",facebookUrl:"",websiteUrl:"",description:""})}
      <h3 style="margin-top:20px">📷 關係企業封面圖上傳</h3>
      <div id="partner-img-uploads">
        ${(data.partners||[]).map((_,i)=>imgUpload("partner"+i,"關係企業 "+(i+1)+" 封面","assets/images/case-1.svg")).join("")}
      </div>
    </div>`;
    bindInputs(); bindDisplay();
    bindList("partners",{visible:false,image:"assets/images/case-1.svg",companyName:"新關係企業",phone:"",lineUrl:"",facebookUrl:"",websiteUrl:"",description:""});
    bindImg();
  }

  if(currentTab==="industries"){
    if(!data.industries) data.industries=[];
    c.innerHTML = `<div class="group"><h2>🏭 多元產業封面</h2>
      ${input("industriesTitle","區塊標題")}
      <p style="color:#94a3b8;font-size:13px;margin-bottom:16px">上傳各產業封面圖（建議 4:3 比例，JPG 或 PNG）</p>
      ${(data.industries||[]).map((ind,i)=>`
        <div class="item" style="border:1px solid #334155;padding:12px;border-radius:8px;margin-bottom:12px">
          <h3>${ind.title||"產業 "+(i+1)}</h3>
          <label>標題</label><input data-industry-title="${i}" value="${ind.title||""}">
          <label>副標題</label><input data-industry-sub="${i}" value="${ind.subtitle||""}">
          ${imgUpload("industry"+i,"封面圖",ind.image||"assets/images/industry-food.jpg")}
        </div>
      `).join("")}
    </div>`;
    bindImg();
    // 綁定 title/subtitle
    c.querySelectorAll("[data-industry-title]").forEach(inp=>{
      inp.oninput=e=>{const i=+inp.dataset.industryTitle;if(data.industries[i])data.industries[i].title=e.target.value;markAdminDirty();};
    });
    c.querySelectorAll("[data-industry-sub]").forEach(inp=>{
      inp.oninput=e=>{const i=+inp.dataset.industrySub;if(data.industries[i])data.industries[i].subtitle=e.target.value;markAdminDirty();};
    });
  }

  if(currentTab==="ihome"){
  if(!data.ihomeConfig)data.ihomeConfig={};
  if(!data.ihomeConfig.faviconShape)data.ihomeConfig.faviconShape="square";
  const ihomeFavShape = data.ihomeConfig.faviconShape || "square";
    c.innerHTML = `
      <div class="group">
  <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
    <h3 style="color: #3b82f6; margin-top: 0;">0. 網址、圖示與分享預覽 (Favicon / OG Image)</h3>
    <div style="margin-bottom:12px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:space-between;">
      <div>
        <strong style="color:#cbd5e1; font-size:13.5px;">愛家居頁面網址：</strong>
        <span style="color:#94a3b8; font-size:12.5px;" id="ihome-url-text">-</span>
      </div>
      <button type="button" onclick="copyTextToClipboard(document.getElementById('ihome-url-text').textContent)" style="background:#2d9cff; color:#fff; border:0; border-radius:4px; padding:6px 12px; font-size:12px; font-weight:800; cursor:pointer;">一鍵複製網址</button>
    </div>
    ${imgUpload("ihomeFavicon","愛家居網址標記 ico (Favicon)","assets/images/ihome/logo.png")}
    <label>愛家居網址標籤形狀</label>
    <select data-path="ihomeConfig.faviconShape" style="width:100%; padding:10px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#fff; font-size:14px; margin-bottom:12px;" id="ihomeFaviconShapeInp">
      <option value="square" ${ihomeFavShape === "square" ? "selected" : ""}>方形 (Square)</option>
      <option value="circle" ${ihomeFavShape === "circle" ? "selected" : ""}>圓形 (Circle)</option>
    </select>
    ${imgUpload("ihomeOgImage","愛家居網址分享預覽圖 (OG Image)","assets/images/ihome/空間理念.jpg")}
  </div>

        <h2>🚪 愛家居系統櫥櫃 頁面編輯</h2>
        <p>在此編輯愛家居系統櫥櫃（ihome.html）一頁式介紹的內容。</p>
        
        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0;">1. 首頁 Banner</h3>
          ${input("ihomeConfig.banner.logoText", "品牌名稱 (文字 LOGO)")}
          ${input("ihomeConfig.banner.logoSub", "品牌副標/英文 (文字 LOGO 下方)")}
          ${input("ihomeConfig.banner.slogan", "主要標語 Slogan")}
          ${input("ihomeConfig.banner.subtitle", "副標題")}
          ${imgUpload("ihome_banner_logoImage", "自訂 LOGO 圖片 (選填，若無上傳則以文字顯示)", "")}
          ${imgUpload("ihome_banner_bgImage", "Banner 背景大圖", "assets/images/ihome/S__16375813_0.jpg")}
        </div>

        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
            <span>2. 設計初衷 (關於我們)</span>
            <label class="check-row" style="font-size: 14px; font-weight: normal; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="ihomeAboutVisible" ${data.ihomeConfig.about.visible !== false ? "checked" : ""}> 啟用此區塊
            </label>
          </h3>
          ${input("ihomeConfig.about.title", "區塊標題")}
          ${input("ihomeConfig.about.subtitle", "區塊副標")}
          ${input("ihomeConfig.about.content", "品牌介紹內文", "textarea")}
          <div style="margin-top: 10px;">
            <label style="font-weight: bold; color: #94a3b8; display: block; margin-bottom: 6px;">核心特色項目 (最多 4 個)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>${input("ihomeConfig.about.features.0", "特色 1")}</div>
              <div>${input("ihomeConfig.about.features.1", "特色 2")}</div>
              <div>${input("ihomeConfig.about.features.2", "特色 3")}</div>
              <div>${input("ihomeConfig.about.features.3", "特色 4")}</div>
            </div>
          </div>
        </div>

        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
            <span>3. 專業服務項目</span>
            <label class="check-row" style="font-size: 14px; font-weight: normal; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="ihomeServicesVisible" ${data.ihomeConfig.services.visible !== false ? "checked" : ""}> 啟用此區塊
            </label>
          </h3>
          ${input("ihomeConfig.services.title", "區塊標題")}
          ${input("ihomeConfig.services.subtitle", "區塊副標")}
          
          <h4 style="color: #e2e8f0; border-bottom: 1px dashed #334155; padding-bottom: 6px; margin-bottom: 12px; margin-top: 16px;">6 大服務卡片內容</h4>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${(data.ihomeConfig.services.items || []).map((srv, idx) => `
              <div style="border: 1px solid #1e293b; border-radius: 6px; padding: 12px; background: #1e293b;">
                <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8px;">服務卡片 #${idx + 1}</div>
                <div style="margin-bottom: 8px;">
                  <label>服務展示圖片路徑 <span style="font-size:12px; color:#94a3b8; font-weight:normal;">(建議尺寸: 800 x 500 像素，黃金 8:5 比例)</span></label>
                  <input data-path="ihomeConfig.services.items.${idx}.image" value="${srv.image || ""}" style="width:100%;">
                </div>
                <div style="margin-bottom: 8px;">
                  <label>卡片標題</label>
                  <input data-path="ihomeConfig.services.items.${idx}.title" value="${srv.title || ""}" style="width:100%;">
                </div>
                <div>
                  <label>介紹說明</label>
                  <textarea data-path="ihomeConfig.services.items.${idx}.desc" style="width:100%; height:60px;">${srv.desc || ""}</textarea>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
            <span>4. 空間收納理念</span>
            <label class="check-row" style="font-size: 14px; font-weight: normal; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="ihomePhilosophyVisible" ${data.ihomeConfig.philosophy.visible !== false ? "checked" : ""}> 啟用此區塊
            </label>
          </h3>
          ${input("ihomeConfig.philosophy.title", "區塊標題")}
          ${input("ihomeConfig.philosophy.subtitle", "區塊副標")}
          ${input("ihomeConfig.philosophy.content", "理念內文", "textarea")}
          ${imgUpload("ihome_philosophy_bgImage", "理念區塊背景圖", "assets/images/ihome/S__16375823_0.jpg")}
        </div>

        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
            <span>5. 精選案例展示</span>
            <label class="check-row" style="font-size: 14px; font-weight: normal; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="ihomeCasesVisible" ${data.ihomeConfig.cases.visible !== false ? "checked" : ""}> 啟用此區塊
            </label>
          </h3>
          ${input("ihomeConfig.cases.title", "區塊標題")}
          ${input("ihomeConfig.cases.subtitle", "區塊副標")}
          
          <h4 style="color: #e2e8f0; margin-bottom: 8px; margin-top: 16px;">案例清單列表</h4>
          ${renderList("ihomeCases", [
            {k:"title",l:"案例標題"}, {k:"image",l:"案例圖片"}
          ], {visible:true, title:"新案例", image:"assets/images/case-1.svg"})}
        </div>

        <div class="item" style="border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #0f172a;">
          <h3 style="color: #3b82f6; margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
            <span>6. 預約聯絡與地圖</span>
            <label class="check-row" style="font-size: 14px; font-weight: normal; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="ihomeContactVisible" ${data.ihomeConfig.contact.visible !== false ? "checked" : ""}> 啟用此區塊
            </label>
          </h3>
          ${input("ihomeConfig.contact.title", "區塊標題")}
          ${input("ihomeConfig.contact.subtitle", "區塊副標")}
          ${input("ihomeConfig.contact.phone", "服務電話")}
          ${input("ihomeConfig.contact.email", "聯絡 Email")}
          ${input("ihomeConfig.contact.address", "公司地址")}
          ${input("ihomeConfig.contact.hours", "服務時間")}
          ${input("ihomeConfig.contact.lineUrl", "LINE 點擊連結 (若留空會自動對應基本資料的 LINE)")}
          ${imgUpload("ihome_contact_lineQr", "官方 LINE QR Code 圖片", "assets/images/line-qr.png")}
          ${input("ihomeConfig.contact.googleMapIframe", "Google Maps 嵌入網址 (請填入 src 中的 https 網址)")}
        </div>
      </div>
    `;
    bindInputs();
    bindImg();
    bindList("ihomeCases", {visible:true, title:"新案例", image:"assets/images/case-1.svg"});
    document.getElementById("ihomeAboutVisible").onchange = e => { data.ihomeConfig.about.visible = e.target.checked; markAdminDirty(); };
    document.getElementById("ihomeServicesVisible").onchange = e => { data.ihomeConfig.services.visible = e.target.checked; markAdminDirty(); };
    document.getElementById("ihomePhilosophyVisible").onchange = e => { data.ihomeConfig.philosophy.visible = e.target.checked; markAdminDirty(); };
    document.getElementById("ihomeCasesVisible").onchange = e => { data.ihomeConfig.cases.visible = e.target.checked; markAdminDirty(); };
    document.getElementById("ihomeContactVisible").onchange = e => { data.ihomeConfig.contact.visible = e.target.checked; markAdminDirty(); };
  
  setTimeout(() => {
    const ihomeFavInp = document.getElementById("ihomeFaviconShapeInp");
    if (ihomeFavInp) {
      ihomeFavInp.addEventListener("change", () => {
        const prev = document.getElementById("current-preview-ihomeFavicon");
        const tempPrev = document.getElementById("temp-preview-ihomeFavicon");
        const radius = ihomeFavInp.value === "circle" ? "50%" : "0%";
        if (prev) prev.style.borderRadius = radius;
        if (tempPrev) tempPrev.style.borderRadius = radius;
      });
    }
    const ihomeText = document.getElementById("ihome-url-text");
    if (ihomeText) ihomeText.textContent = location.origin + location.pathname.replace("admin.html", "ihome.html");
  }, 50);
}

  if(currentTab==="news"){
    c.innerHTML = `<div class="group"><h2>最新消息</h2>
      <p>最新消息不使用封面圖。每一則可設定置頂、發布日期，內文如需圖片或連結，可在該則消息中自行增加。</p>
      ${input("newsTitle","區塊標題")}
      ${displaySettings("newsDisplay","顯示設定")}
      ${renderList("news",[
        {k:"title",l:"標題"},{k:"subtitle",l:"小標題"},
        {k:"publishDate",l:"發布日期 YYYY-MM-DD"},
        {k:"text",l:"內文",t:"textarea"},
        {k:"extraImages",l:"內文圖片網址，每行一個圖片網址",t:"textarea"},
        {k:"extraLinks",l:"內文連結，每行一個，格式：按鈕文字|網址",t:"textarea"},
        {k:"url",l:"主要分享網址"}
      ],{visible:false,pinned:false,publishDate:"",title:"新公告",subtitle:"",text:"",extraImages:"",extraLinks:"",url:""})}
    </div>`;
    bindInputs(); bindDisplay();
    bindList("news",{visible:false,pinned:false,publishDate:"",title:"新公告",subtitle:"",text:"",extraImages:"",extraLinks:"",url:""});
    document.querySelectorAll('[data-arr="news"]').forEach(el=>{
      if(el.dataset.f==="publishDate") el.type="date";
    });
  }

  if(currentTab==="faq"){
    c.innerHTML = `<div class="group"><h2>常見問題</h2>
      ${input("faqTitle","區塊標題")}
      ${displaySettings("faqDisplay","顯示設定")}
      ${renderList("faqs",[{k:"q",l:"問題"},{k:"a",l:"答案",t:"textarea"}],{visible:false,q:"新問題",a:"答案"})}
    </div>`;
    bindInputs(); bindDisplay();
    bindList("faqs",{visible:false,q:"新問題",a:"答案"});
  }

  if(currentTab==="form"){
    c.innerHTML = `<div class="group"><h2>表單設定</h2>
      ${input("formConfig.googleScriptUrl","Google Apps Script Web App URL")}
      ${input("formConfig.sheetUrl","雲端 Excel / 試算表連結")}
      ${input("formConfig.notifyEmail","通知 Email")}
    </div>`;
    bindInputs();
  }

  if(currentTab==="images"){
    c.innerHTML = `<div class="group"><h2>圖片管理</h2>
      ${imgUpload("logo","網站 Logo（更換後首頁、頁尾、後台登入同步）","assets/images/logo.png")}
      ${imgUpload("heroBg","首頁主圖","assets/images/hero-bg.jpg")}${imgUpload("lineQr","LINE QR 圖片","assets/images/line-qr.png")}
      ${data.cases.map((x,i)=>imgUpload("case"+i,`案例圖 ${i+1}`,x.image)).join("")}
      ${data.partners.map((x,i)=>imgUpload("partner"+i,`關係企業圖 ${i+1}`,x.image)).join("")}
    </div>`;
    bindImg();
  }

  if(currentTab==="backup"){
    c.innerHTML = `<div class="group"><h2>備份 / 還原</h2>
      <button class="add-btn" id="exportBtn">📥 匯出備份 JSON</button>
      <label>匯入備份</label><input type="file" id="importFile">
      <button class="danger" id="resetBtn">⚠️ 恢復原始資料</button>
      <pre class="code" style="max-height:300px;overflow:auto">${JSON.stringify(data,null,2)}</pre>
    </div>`;
    document.getElementById("exportBtn").onclick = () => {
      const blob = new Blob([JSON.stringify({data,images},null,2)],{type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "chengchuang_site_backup_"+ new Date().toISOString().slice(0,10) +".json";
      a.click();
    };
    document.getElementById("importFile").onchange = e => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          data = obj.data || data;
          images = obj.images || {};
          save(); render();
        } catch(e) { alert("檔案格式錯誤"); }
      };
      reader.readAsText(file);
    };
    document.getElementById("resetBtn").onclick = () => {
      if(confirm("確定恢復原始資料？所有修改將遺失！")){
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem(IMG_KEY);
        data = clone(DEFAULT_DATA);
        images = {};
        render();
      }
    };
  }

  // ── 發布管理 ──────────────────────────────────────────
  if(currentTab==="publish"){
    const gasUrl = (data.formConfig && data.formConfig.googleScriptUrl) || "";
    const gasOk = gasUrl && !gasUrl.includes("請貼上");
    c.innerHTML = `<div class="group">
      <h2>🚀 發布管理</h2>
      <p style="color:#888;margin-bottom:12px">發布後所有裝置（手機/電腦/LINE瀏覽器）立即同步顯示最新內容。</p>
      ${!gasOk ? `<div style="background:#fff3cd;color:#856404;padding:12px;border-radius:8px;margin-bottom:16px">
        ⚠️ 尚未設定 Google Apps Script URL，請先在「表單設定」頁面填入。設定後才能使用雲端同步和發布功能。
      </div>` : ""}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <button class="add-btn" id="draftBtn">💾 儲存草稿</button>
        <button class="add-btn" id="previewBtn" style="background:#17a2b8">👁 預覽</button>
        <button class="add-btn" id="publishBtn" style="background:#28a745" ${!gasOk?"disabled":""}>🚀 發布到正式網站</button>
      </div>
      <div id="publishStatus" style="margin-bottom:16px"></div>
      <h3 style="margin-bottom:8px">📜 版本歷史</h3>
      <div id="versionList"><p style="color:#888">載入中...</p></div>
    </div>`;

    document.getElementById("draftBtn").onclick = () => {
      save();
      document.getElementById("publishStatus").innerHTML = `<span style="color:green">✓ 草稿已儲存至本機 (${new Date().toLocaleTimeString("zh-TW")})</span>`;
    };

    document.getElementById("previewBtn").onclick = () => {
      sessionStorage.setItem("cc_preview_mode","1");
      sessionStorage.setItem("cc_preview_site_data", JSON.stringify(data));
      sessionStorage.setItem("cc_preview_site_images", JSON.stringify(images));
      window.open("index.html?preview=1","_blank");
    };

    document.getElementById("publishBtn").onclick = async () => {
      if(!gasOk){ alert("請先設定 Google Apps Script URL"); return; }
      const note = prompt("發布備註（選填）：","");
      if(note === null) return;
      const btn = document.getElementById("publishBtn");
      const statusDiv = document.getElementById("publishStatus");
      btn.disabled = true;
      btn.textContent = "🔄 發布中...";
      statusDiv.innerHTML = `<span style="color:#888">正在發布，請稍候...</span>`;
      try {
        const resp = await fetch(gasUrl, {
          method:"POST",
          headers:{"Content-Type":"text/plain;charset=utf-8"},
          body: JSON.stringify({
            type:"publish", data, images,
            publishedBy: currentUser && currentUser.displayName || "admin",
            note: note || ""
          })
        });
        const result = await resp.json();
        if(result.result === "success"){
          localStorage.setItem(DATA_KEY, JSON.stringify(data));
          statusDiv.innerHTML = `<span style="color:green">✅ 發布成功！版本：${result.version || ""} (${new Date().toLocaleTimeString("zh-TW")})<br>所有裝置將在幾分鐘內同步更新。</span>`;
          logAdminChange("發布網站", `版本 ${result.version}, 備註: ${note}`);
          _loadVersionHistory(gasUrl);
        } else {
          statusDiv.innerHTML = `<span style="color:red">❌ 發布失敗：${result.message || "未知錯誤"}</span>`;
        }
      } catch(e) {
        statusDiv.innerHTML = `<span style="color:red">❌ 連線失敗：${e.message}</span>`;
      }
      btn.disabled = false;
      btn.textContent = "🚀 發布到正式網站";
    };

    if(gasOk) _loadVersionHistory(gasUrl);
  }

  // ── 表單紀錄 ──────────────────────────────────────────
  if(currentTab==="formRecords"){
    const gasUrl = (data.formConfig && data.formConfig.googleScriptUrl) || "";
    const gasOk = gasUrl && !gasUrl.includes("請貼上");
    c.innerHTML = `<div class="group">
      <h2>📋 表單紀錄</h2>
      ${!gasOk ? `<div style="background:#fff3cd;color:#856404;padding:12px;border-radius:8px">⚠️ 請先設定 Google Apps Script URL</div>` : `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        ${currentUser && currentUser.isMaster ? `<select id="fr-site" style="padding:8px;background:#28a745;color:white;font-weight:600;border:none;border-radius:4px">
          <option value="">全部站台</option>
          <option value="chengchuang">誠創科技</option>
          <option value="ihome">愛家居</option>
        </select>` : `<span style="background:#4472C4;color:white;padding:6px 12px;border-radius:4px;font-size:13px;font-weight:600">🏢 ${currentUser&&currentUser.siteId||'chengchuang'} 站台</span>`}
        <select id="fr-type" style="padding:8px">
          <option value="">所有表單</option>
          <option value="contact">聯絡我們</option>
          <option value="quote">報價需求</option>
          <option value="repair">維修申請</option>
          <option value="customer">客戶需求</option>
          <option value="register">合作註冊</option>
        </select>
        <select id="fr-status" style="padding:8px">
          <option value="">所有狀態</option>
          <option value="未處理">未處理</option>
          <option value="已聯絡">已聯絡</option>
          <option value="報價中">報價中</option>
          <option value="已成交">已成交</option>
          <option value="未成交">未成交</option>
          <option value="已結案">已結案</option>
        </select>
        <input id="fr-search" type="text" placeholder="搜尋姓名/電話/Email" style="padding:8px;min-width:160px">
        <input id="fr-from" type="date" style="padding:8px">
        <input id="fr-to" type="date" style="padding:8px">
        <button class="add-btn" id="fr-search-btn" style="padding:8px 16px">🔍 搜尋</button>
        <button class="add-btn" id="fr-export-btn" style="padding:8px 16px;background:#28a745">📊 匯出 CSV</button>
      </div>
      <div id="fr-summary" style="color:#888;margin-bottom:8px"></div>
      <div id="fr-table" style="overflow-x:auto"><p style="color:#888">點搜尋載入紀錄...</p></div>
      <div id="fr-pages" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"></div>
      `}
    </div>`;
    if(!gasOk) return;

    let frPage = 1;
    // 取得此用戶的 siteId（非 chengchuang 主帳號則傳入過濾）
    const mySiteId = currentUser && currentUser.isMaster ? "" : (currentUser && currentUser.siteId || "");

    async function loadFormRecords(page){
      frPage = page || 1;
      const type   = document.getElementById("fr-type").value;
      const status = document.getElementById("fr-status").value;
      const search = document.getElementById("fr-search").value;
      const from   = document.getElementById("fr-from").value;
      const to     = document.getElementById("fr-to").value;
      document.getElementById("fr-table").innerHTML = `<p style="color:#888">載入中...</p>`;
      try {
        // 主帳號可用下拉選擇站台；子帳號強制為自己的 siteId
        const siteFilter = currentUser && currentUser.isMaster
          ? (document.getElementById("fr-site")?.value || "")
          : mySiteId;
        const params = new URLSearchParams({action:"getForms",formType:type,status,search,dateFrom:from,dateTo:to,siteId:siteFilter,page:frPage,pageSize:30});
        const resp = await fetch(gasUrl + "?" + params);
        const result = await resp.json();
        _renderFormTable(result, gasUrl);
      } catch(e) {
        document.getElementById("fr-table").innerHTML = `<p style="color:red">載入失敗：${e.message}</p>`;
      }
    }

    document.getElementById("fr-search-btn").onclick = () => loadFormRecords(1);
    document.getElementById("fr-export-btn").onclick = () => _exportFormsCsv(gasUrl);
    window._frLoadPage = loadFormRecords;
  }

  if(currentTab==="stats"){
    if(!data.stats) data.stats = [];
    c.innerHTML = `<div class="group"><h2>📊 統計數字設定</h2>
      <p>設定前台展示的統計數字與標籤內容（勾選隱藏可暫時隱藏，不顯示在前台）。</p>
      <div class="item">
        <label class="check-row">
          <input type="checkbox" id="statsVisible" ${data.statsVisible!==false?"checked":""}> 
          <strong>顯示數字統計區塊</strong>
        </label>
      </div>
      ${renderList("stats",[
        {k:"number",l:"統計數字（例如: 500+）"},
        {k:"label",l:"統計項目名稱（例如: 導入科技數量）"}
      ],{visible:true,number:"0+",label:"新項目"})}
    </div>`;
    
    const visInp = document.getElementById("statsVisible");
    if (visInp) {
      visInp.onchange = () => {
        data.statsVisible = visInp.checked;
        markAdminDirty();
      };
    }
    
    bindInputs();
    bindList("stats",{visible:true,number:"0+",label:"新項目"});
  }

  if(currentTab==="shipping"){
    if(!data.shipping) data.shipping = [];
    c.innerHTML = `<div class="group"><h2>🚢 出貨流程設定</h2>
      <p>設定前台顯示的出貨流程步驟（拖曳或點選上移/下移可排序，勾選隱藏可暫時隱藏）。</p>
      <div class="item">
        <label class="check-row">
          <input type="checkbox" id="shippingVisible" ${data.shippingVisible!==false?"checked":""}> 
          <strong>顯示出貨流程區塊</strong>
        </label>
      </div>
      ${input("shippingTitle","區塊名稱標題")}
      ${renderList("shipping",[
        {k:"title",l:"步驟標題"},
        {k:"text",l:"步驟描述說明",t:"textarea"}
      ],{visible:true,title:"新步驟",text:""})}
    </div>`;
    
    const visInp = document.getElementById("shippingVisible");
    if (visInp) {
      visInp.onchange = () => {
        data.shippingVisible = visInp.checked;
        markAdminDirty();
      };
    }
    
    bindInputs();
    bindList("shipping",{visible:true,title:"新步驟",text:""});
  }
}

function openPreview(){
  sessionStorage.setItem("cc_preview_mode","1");
  sessionStorage.setItem("cc_preview_site_data",JSON.stringify(data));
  sessionStorage.setItem("cc_preview_site_images",JSON.stringify(images));
  const targetPage = currentTab === "ihome" ? "ihome.html" : "index.html";
  previewFrame.src = targetPage + "?preview=1&t=" + Date.now();
  previewModal.classList.add("show");
  const desktopBtn=document.getElementById("previewDesktopBtn");
  if(desktopBtn) desktopBtn.click();
}
function closePreview(){
  sessionStorage.removeItem("cc_preview_mode");
  sessionStorage.removeItem("cc_preview_site_data");
  sessionStorage.removeItem("cc_preview_site_images");
  previewFrame.src = "about:blank";
  previewModal.classList.remove("show");
}


function initMobileAdminMenu(){
  const layout=document.querySelector(".admin-layout");
  const aside=document.querySelector(".admin-layout aside");
  if(!layout||!aside||document.querySelector(".mobile-admin-menu-bar"))return;

  const bar=document.createElement("div");
  bar.className="mobile-admin-menu-bar";
  bar.innerHTML=`<div class="mobile-admin-menu-title">目前：<span id="mobileCurrentTab">基本資料</span></div><button type="button" class="mobile-admin-menu-toggle" id="mobileAdminMenuToggle">選擇編輯項目 ☰</button>`;
  layout.parentNode.insertBefore(bar,layout);

  const toggle=document.getElementById("mobileAdminMenuToggle");
  toggle.onclick=()=>{
    aside.classList.toggle("open");
    toggle.textContent=aside.classList.contains("open")?"關閉目錄 ✕":"選擇編輯項目 ☰";
  };

  document.addEventListener("click",(e)=>{
    if(window.innerWidth>760)return;
    if(!aside.classList.contains("open"))return;
    if(aside.contains(e.target)||toggle.contains(e.target))return;
    aside.classList.remove("open");
    toggle.textContent="選擇編輯項目 ☰";
  });
}
function updateMobileCurrentTab(){
  const active=document.querySelector(".admin-layout aside button.active");
  const span=document.getElementById("mobileCurrentTab");
  if(span&&active)span.textContent=active.textContent.trim();
}


function syncAdminLogoImages(){
  try{
    const logo=(images&&images.logo)||"assets/images/logo.png";
    document.querySelectorAll('#loginLogo,.login-logo,[data-admin-logo]').forEach(el=>{el.src=logo;});
  }catch(e){}
}


function ccV16AdminEnhance(){
  try{
    if(!data.siteVersion)data.siteVersion="006_v16";
    if(!data.appearanceConfig)data.appearanceConfig={};
    if(!data.appearanceConfig.versionLabel)data.appearanceConfig.versionLabel=data.siteVersion;
    const logo=(images&&images.logo)||images.siteLogo||images.headerLogo||"assets/images/logo.png";
    document.querySelectorAll('#loginLogo,.login-logo,[data-admin-logo]').forEach(el=>{
      el.src=logo;
      el.style.background='transparent';
      el.style.border='0';
      el.style.boxShadow='none';
    });
    if(!document.querySelector('.login-card .admin-version')){
      const card=document.querySelector('.login-card');
      if(card){
        const v=document.createElement('div');
        v.className='admin-version';
        v.textContent=data.appearanceConfig.versionLabel||data.siteVersion||"006_v16";
        card.appendChild(v);
      }
    }
    if(!document.querySelector('.admin-header .admin-version')){
      const head=document.querySelector('.admin-header');
      if(head){
        const v=document.createElement('div');
        v.className='admin-version';
        v.textContent=data.appearanceConfig.versionLabel||data.siteVersion||"006_v16";
        head.appendChild(v);
      }
    }
  }catch(e){}
}


function ccV16CloseMobileMenuOutside(){
  document.addEventListener("touchstart",function(e){
    const aside=document.querySelector(".admin-layout aside");
    const toggle=document.getElementById("mobileAdminMenuToggle");
    if(!aside||!toggle||window.innerWidth>760)return;
    if(!aside.classList.contains("open"))return;
    if(aside.contains(e.target)||toggle.contains(e.target))return;
    aside.classList.remove("open");
    toggle.textContent="選擇編輯項目 ☰";
  },true);
}

function bootAdmin(){
  try{
    initLogin();
    syncAdminLogoImages();
    initMobileAdminMenu();
    ccV16CloseMobileMenuOutside();
    updateMobileCurrentTab();
    const saveEl=document.getElementById("saveBtn");
    const previewEl=document.getElementById("previewBtn");
    const closePreviewEl=document.getElementById("closePreviewBtn");
    if(saveEl)saveEl.onclick = save;
    if(previewEl)previewEl.onclick = openPreview;
    if(closePreviewEl)closePreviewEl.onclick = closePreview;
    
    const desktopBtn=document.getElementById("previewDesktopBtn");
    const tabletBtn=document.getElementById("previewTabletBtn");
    const mobileBtn=document.getElementById("previewMobileBtn");
    const frame=document.getElementById("previewFrame");
    
    function setPreviewDevice(device){
      [desktopBtn, tabletBtn, mobileBtn].forEach(btn=>{
        if(btn){
          btn.style.background = btn===device ? "#334155" : "#1e293b";
          btn.style.color = btn===device ? "#fff" : "#94a3b8";
        }
      });
      if(!frame)return;
      if(device===desktopBtn){
        frame.style.width="100%";
        frame.style.height="100%";
        frame.style.border="none";
        frame.style.borderRadius="0";
      }else if(device===tabletBtn){
        frame.style.width="768px";
        frame.style.height="calc(100% - 32px)";
        frame.style.border="12px solid #334155";
        frame.style.borderRadius="16px";
      }else if(device===mobileBtn){
        frame.style.width="375px";
        frame.style.height="calc(100% - 32px)";
        frame.style.border="12px solid #334155";
        frame.style.borderRadius="24px";
      }
    }
    
    if(desktopBtn) desktopBtn.onclick = () => setPreviewDevice(desktopBtn);
    if(tabletBtn) tabletBtn.onclick = () => setPreviewDevice(tabletBtn);
    if(mobileBtn) mobileBtn.onclick = () => setPreviewDevice(mobileBtn);

    document.querySelectorAll("aside button").forEach(btn=>{
      btn.onclick = () => {
        if(!hasPerm(btn.dataset.tab)){
          alert("此帳號沒有此功能權限");
          return;
        }
        currentTab = btn.dataset.tab;
        if(currentTab === "users"){
          userEditMode = "list";
          editingUserIndex = -1;
        }
        setActiveTabButton();
        render();
      };
    });
  }catch(err){
    console.error("後台啟動失敗",err);
    quickBindLoginFallback();
  }
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", bootAdmin);
}else{
  bootAdmin();
}


/* 009 footer social visibility admin injection */
function injectFooterSocialVisibility009(){}
(function(){
  const oldRender=window.render||render;
  window.render=render=function(){
    oldRender();
    setTimeout(injectFooterSocialVisibility009,0);
  };
})();

/* v19 social icon visibility */
function injectSocialIconVisibilityV19(){}

setTimeout(()=>{
  try{
    injectSocialIconVisibilityV19();
  }catch(e){}
},1500);


/* 010 v20：後台快捷工具設定、浮動操作、目錄自動收回 */
(function(){
  function d010(){
    if(typeof data!=="undefined") return data;
    return window.DEFAULT_DATA || {};
  }
  function markDirty010(){
    window.__ccDirty010=true;
    const save=document.getElementById("saveBtn");
    if(save){
      save.classList.add("dirty");
      save.textContent="儲存修改*";
    }
  }

  function injectQuickToolSetting010(){
    try{
      if(typeof currentTab!=="undefined" && currentTab!=="footer") return;
      const c=document.getElementById("adminContent");
      if(!c || document.getElementById("quickToolSetting010")) return;

      const d=data;
      if(!d.quickToolVisibility){
        d.quickToolVisibility={show:true};
      }
      if(!d.quickTools){
        d.quickTools = [
          { type: "line", label: "LINE", url: "", visible: true },
          { type: "phone", label: "電話", url: "", visible: true },
          { type: "form", label: "表單", url: "", visible: true },
          { type: "top", label: "TOP", url: "", visible: true }
        ];
      }

      const box=document.createElement("div");
      box.className="item";
      box.id="quickToolSetting010";
      
      let html = `
        <h3>快捷工具設定</h3>
        <p class="small">控制右側/手機下方快捷工具是否顯示與自訂項目（手機、平板、桌機同步）。</p>
        <label class="check-row" style="margin-bottom:12px; display:block;"><input type="checkbox" id="qt_show_master" ${d.quickToolVisibility.show!==false?"checked":""}> 顯示快捷工具條</label>
        
        <div style="border:1px solid #334155; border-radius:8px; padding:12px; background:rgba(0,0,0,0.15);">
          <h4 style="margin:0 0 10px 0;">快捷按鈕項目管理</h4>
          <div id="quick_tools_list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
            ${d.quickTools.map((t, i) => `
              <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; background:#1e293b; padding:8px; border-radius:6px; border:1px solid #334155;">
                <span style="font-size:12px; color:#64748b;">#${i+1}</span>
                <label style="margin:0; font-size:13px;">名稱: <input class="qt-input" data-qt-idx="${i}" data-qt-field="label" value="${String(t.label||"").replace(/"/g,"&quot;")}" style="width:70px; display:inline-block; padding:4px; font-size:12px;"></label>
                <label style="margin:0; font-size:13px;">類型: 
                  <select class="qt-select" data-qt-idx="${i}" data-qt-field="type" style="display:inline-block; padding:4px; font-size:12px; width:90px; color:#1e293b;">
                    <option value="line" ${t.type==='line'?'selected':''}>LINE</option>
                    <option value="phone" ${t.type==='phone'?'selected':''}>電話</option>
                    <option value="form" ${t.type==='form'?'selected':''}>表單</option>
                    <option value="top" ${t.type==='top'?'selected':''}>TOP</option>
                    <option value="custom" ${t.type==='custom'?'selected':''}>自訂連結</option>
                  </select>
                </label>
                <label style="margin:0; font-size:13px;">連結/號碼: <input class="qt-input" data-qt-idx="${i}" data-qt-field="url" value="${t.type === 'line' ? '' : String(t.url||"").replace(/"/g,"&quot;")}" placeholder="${t.type==='line'?'自動對應基本資料':'預設'}" ${t.type==='line'?'disabled':''} style="width:110px; display:inline-block; padding:4px; font-size:12px;"></label>
                <label style="margin:0; font-size:13px; display:flex; align-items:center; gap:4px;"><input type="checkbox" class="qt-checkbox" data-qt-idx="${i}" data-qt-field="visible" ${t.visible!==false?'checked':''}> 顯示</label>
                
                <div style="margin-left:auto; display:flex; gap:4px;">
                  <button type="button" onclick="moveQuickTool(${i}, -1)" style="padding:2px 6px; font-size:10px;">▲</button>
                  <button type="button" onclick="moveQuickTool(${i}, 1)" style="padding:2px 6px; font-size:10px;">▼</button>
                  <button type="button" class="danger" onclick="deleteQuickTool(${i})" style="padding:2px 6px; font-size:10px;">刪除</button>
                </div>
              </div>
            `).join("")}
          </div>
          <button type="button" class="add-btn" id="addQuickToolBtn" style="font-size:12px; padding:6px 12px;">+ 新增快捷按鈕</button>
        </div>
      `;

      box.innerHTML = html;
      (c.querySelector(".group") || c).appendChild(box);

      document.getElementById("qt_show_master").onchange = e => {
        d.quickToolVisibility.show = e.target.checked;
        markDirty010();
      };
      
      box.querySelectorAll(".qt-input").forEach(inp => {
        inp.oninput = () => {
          const idx = +inp.dataset.qtIdx;
          const field = inp.dataset.qtField;
          d.quickTools[idx][field] = inp.value;
          markDirty010();
        };
      });
      
      box.querySelectorAll(".qt-select").forEach(sel => {
        sel.onchange = () => {
          const idx = +sel.dataset.qtIdx;
          const field = sel.dataset.qtField;
          d.quickTools[idx][field] = sel.value;
          markDirty010();
          render();
        };
      });
      
      box.querySelectorAll(".qt-checkbox").forEach(cb => {
        cb.onchange = () => {
          const idx = +cb.dataset.qtIdx;
          const field = cb.dataset.qtField;
          d.quickTools[idx][field] = cb.checked;
          markDirty010();
        };
      });
      
      document.getElementById("addQuickToolBtn").onclick = () => {
        d.quickTools.push({ type: "custom", label: "新按鈕", url: "#", visible: true });
        markDirty010();
        render();
      };

    }catch(e){
      console.warn("快捷設定注入失敗", e);
    }
  }

  function ensureAdminFloatingTools010(){
    if(document.getElementById("adminFloatingTools010")) return;
    const wrap=document.createElement("div");
    wrap.id="adminFloatingTools010";
    wrap.className="admin-floating-tools";
    const user=sessionStorage.getItem("cc_admin_user_display") || sessionStorage.getItem("cc_admin_user") || "管理員";
    wrap.innerHTML=`<div class="admin-user-name" title="點選登出">${user}</div>
      <button type="button" data-admin-menu>目錄</button>
      <button type="button" data-admin-preview>預覽</button>
      <button type="button" data-admin-save>儲存</button>
      <a href="index.html" target="_blank">首頁</a>`;
    document.body.appendChild(wrap);

    wrap.querySelector("[data-admin-menu]").onclick=()=>toggleAdminMenu010();
    wrap.querySelector("[data-admin-preview]").onclick=()=>document.getElementById("previewBtn")?.click();
    wrap.querySelector("[data-admin-save]").onclick=()=>document.getElementById("saveBtn")?.click();
    wrap.querySelector(".admin-user-name").onclick=()=>{
      if(confirm("是否登出目前帳號？")){
        document.getElementById("logoutBtn")?.click();
      }
    };
  }

  function ensureMobileMenuBar010(){
    const layout=document.querySelector(".admin-layout");
    const aside=document.querySelector(".admin-layout aside");
    if(!layout || !aside || document.getElementById("mobileAdminMenuBar010")) return;
    const bar=document.createElement("div");
    bar.id="mobileAdminMenuBar010";
    bar.className="mobile-admin-menu-bar";
    bar.innerHTML=`<div class="mobile-admin-menu-title">目前：<span id="mobileCurrentTab010">基本資料</span></div>
    <button type="button" class="mobile-admin-menu-toggle" id="mobileAdminMenuToggle010">選擇編輯項目 ☰</button>`;
    layout.parentNode.insertBefore(bar,layout);
    document.getElementById("mobileAdminMenuToggle010").onclick=()=>toggleAdminMenu010();
  }

  function updateCurrentTabName010(){
    const active=document.querySelector(".admin-layout aside button.active,.admin-layout aside a.active");
    const span=document.getElementById("mobileCurrentTab010");
    if(span && active) span.textContent=active.textContent.trim();
  }

  function toggleAdminMenu010(){
    const aside=document.querySelector(".admin-layout aside");
    const btn=document.getElementById("mobileAdminMenuToggle010");
    if(!aside) return;
    aside.classList.toggle("open");
    if(btn) btn.textContent=aside.classList.contains("open") ? "關閉目錄 ✕" : "選擇編輯項目 ☰";
  }

  function closeAdminMenu010(){
    const aside=document.querySelector(".admin-layout aside");
    const btn=document.getElementById("mobileAdminMenuToggle010");
    if(!aside) return;
    aside.classList.remove("open");
    if(btn) btn.textContent="選擇編輯項目 ☰";
  }

  function bindMenuClose010(){
    document.addEventListener("click",e=>{
      const aside=document.querySelector(".admin-layout aside");
      const btn=document.getElementById("mobileAdminMenuToggle010");
      const float=document.getElementById("adminFloatingTools010");
      if(!aside || !aside.classList.contains("open")) return;
      if(aside.contains(e.target) || (btn&&btn.contains(e.target)) || (float&&float.contains(e.target))) return;
      closeAdminMenu010();
    },true);

    document.querySelectorAll(".admin-layout aside button,.admin-layout aside a").forEach(el=>{
      if(el.dataset.bound010) return;
      el.dataset.bound010="1";
      el.addEventListener("click",()=>{
        updateCurrentTabName010();
        closeAdminMenu010();
        setTimeout(()=>{
          const panel=document.querySelector(".panel,#adminContent,.admin-content");
          if(panel) panel.scrollIntoView({behavior:"smooth",block:"start"});
        },80);
      },true);
    });
  }

  function boot010(){
    ensureMobileMenuBar010();
    ensureAdminFloatingTools010();
    bindMenuClose010();
    injectQuickToolSetting010();
    updateCurrentTabName010();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot010);
  }else{
    boot010();
  }
  window.addEventListener("load",()=>{boot010();setTimeout(boot010,800);setTimeout(boot010,2000);});
  const oldRender010=window.render;
  if(typeof oldRender010==="function"){
    window.render=function(){
      oldRender010();
      setTimeout(boot010,0);
    };
    try{render=window.render;}catch(e){}
  }
})();


/* 011 v21：登入後才顯示快捷、去除雙重目錄、點外部關閉 */
(function(){
  function markLoginState011(){
    const app=document.getElementById("adminApp");
    const login=document.getElementById("loginScreen");
    const logged=app && !app.classList.contains("locked") && (!login || getComputedStyle(login).display==="none" || login.hidden);
    document.body.classList.add("admin-page");
    if(logged){
      document.body.classList.add("admin-logged-in");
    }else{
      document.body.classList.remove("admin-logged-in");
    }
  }

  function removeDuplicateMenuBars011(){
    const bars=[...document.querySelectorAll(".mobile-admin-menu-bar")];
    bars.forEach((b,i)=>{ if(i>0) b.remove(); });
  }

  function ensureAdminFloatingOnlyAfterLogin011(){
    markLoginState011();
    const logged=document.body.classList.contains("admin-logged-in");
    document.querySelectorAll(".cc-quick-tools,#ccQuickTools,#ccMobileFloat,.cc-mobile-float,.float-buttons,.floatbar").forEach(el=>{
      el.style.display="none";
    });
    document.querySelectorAll(".admin-floating-tools").forEach(el=>{
      el.style.display=logged?"flex":"none";
      el.style.left="14px";
      el.style.right="auto";
    });
  }

  function closeMenu011(){
    const aside=document.querySelector(".admin-layout aside");
    const btn=document.getElementById("mobileAdminMenuToggle010") || document.getElementById("mobileAdminMenuToggle011");
    if(aside){
      aside.classList.remove("open");
    }
    if(btn){
      btn.textContent="選擇編輯項目 ☰";
    }
  }

  function bindCloseMenu011(){
    document.addEventListener("click",function(e){
      const aside=document.querySelector(".admin-layout aside");
      const btn=document.getElementById("mobileAdminMenuToggle010") || document.getElementById("mobileAdminMenuToggle011");
      const float=document.querySelector(".admin-floating-tools");
      if(!aside || !aside.classList.contains("open")) return;
      if(aside.contains(e.target) || (btn&&btn.contains(e.target)) || (float&&float.contains(e.target))) return;
      closeMenu011();
    },true);

    document.querySelectorAll(".admin-layout aside button,.admin-layout aside a").forEach(el=>{
      if(el.dataset.closeBound011) return;
      el.dataset.closeBound011="1";
      el.addEventListener("click",function(){
        closeMenu011();
        setTimeout(()=>{
          const target=document.querySelector("#adminContent,.panel,.admin-content");
          if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
        },80);
      },true);
    });
  }

  function boot011(){
    document.body.classList.add("admin-page");
    removeDuplicateMenuBars011();
    bindCloseMenu011();
    ensureAdminFloatingOnlyAfterLogin011();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot011);
  }else{
    boot011();
  }

  window.addEventListener("load",()=>{
    boot011();
    setTimeout(boot011,500);
    setTimeout(boot011,1500);
  });

  setInterval(boot011,2000);
})();

// ── 版本歷史 ─────────────────────────────────────────────
async function _loadVersionHistory(gasUrl){
  const el = document.getElementById("versionList");
  if(!el) return;
  try {
    const resp = await fetch(gasUrl + "?action=getVersions");
    const result = await resp.json();
    const versions = result.versions || [];
    if(!versions.length){ el.innerHTML = `<p style="color:#888">尚無版本紀錄</p>`; return; }
    el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px;text-align:left;border:1px solid #ddd">版本號</th>
        <th style="padding:8px;text-align:left;border:1px solid #ddd">發布時間</th>
        <th style="padding:8px;text-align:left;border:1px solid #ddd">發布人員</th>
        <th style="padding:8px;text-align:left;border:1px solid #ddd">備註</th>
        <th style="padding:8px;border:1px solid #ddd">還原</th>
      </tr></thead>
      <tbody>
      ${versions.slice(0,20).map((v,i)=>`<tr style="background:${i===0?'#f0fff4':'white'}">
        <td style="padding:8px;border:1px solid #ddd;font-family:monospace">${v.versionNo}</td>
        <td style="padding:8px;border:1px solid #ddd">${new Date(v.publishedAt).toLocaleString("zh-TW")}</td>
        <td style="padding:8px;border:1px solid #ddd">${v.publishedBy||""}</td>
        <td style="padding:8px;border:1px solid #ddd">${v.note||""}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">
          ${i===0 ? '<span style="color:green">目前版本</span>' :
            `<button onclick="_restoreVersion(${JSON.stringify(v.dataSnapshot||'{}').replace(/"/g,"&quot;")})" style="padding:4px 10px;cursor:pointer">還原</button>`}
        </td>
      </tr>`).join("")}
      </tbody>
    </table>`;
  } catch(e) {
    el.innerHTML = `<p style="color:red">載入失敗：${e.message}</p>`;
  }
}

function _restoreVersion(snapshotStr){
  if(!confirm("確定還原此版本？目前未發布的修改將遺失！")) return;
  try {
    const snapshot = typeof snapshotStr==="string" ? JSON.parse(snapshotStr) : snapshotStr;
    data = merge(clone(DEFAULT_DATA), snapshot);
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    alert("版本已還原至本機，請確認後再發布。");
    render();
  } catch(e) { alert("還原失敗：" + e.message); }
}

// ── 表單紀錄渲染 ──────────────────────────────────────────
function _renderFormTable(result, gasUrl){
  const total = result.total || 0;
  const records = result.records || [];
  const summaryEl = document.getElementById("fr-summary");
  const tableEl   = document.getElementById("fr-table");
  const pagesEl   = document.getElementById("fr-pages");
  if(summaryEl) summaryEl.textContent = `共 ${total} 筆`;
  if(!tableEl) return;
  if(!records.length){ tableEl.innerHTML = `<p style="color:#888">沒有符合的紀錄</p>`; return; }

  const statusColors = {"未處理":"#dc3545","已聯絡":"#fd7e14","報價中":"#ffc107","已成交":"#28a745","未成交":"#6c757d","已結案":"#17a2b8"};
  const cols = ["送出時間","表單類型","姓名","公司名稱","電話","Email","LINE ID","需求類型","需求內容","處理狀態","負責人","備註"];

  tableEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
    <thead><tr style="background:#343a40;color:white">
      ${cols.map(h=>`<th style="padding:8px;text-align:left;border:1px solid #555;white-space:nowrap">${h}</th>`).join("")}
      <th style="padding:8px;border:1px solid #555">操作</th>
    </tr></thead>
    <tbody>
    ${records.map((r,idx)=>{
      const st = r["處理狀態"]||"未處理";
      const stColor = statusColors[st]||"#888";
      return `<tr style="background:${idx%2===0?'white':'#f9f9f9'}">
        ${cols.map(h=>{
          if(h==="處理狀態") return `<td style="padding:6px 8px;border:1px solid #ddd;text-align:center">
            <span style="background:${stColor};color:white;padding:2px 8px;border-radius:12px;font-size:11px;white-space:nowrap">${st}</span></td>`;
          if(h==="送出時間") return `<td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap;font-size:11px">${r[h]?new Date(r[h]).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}</td>`;
          if(h==="需求內容") return `<td style="padding:6px 8px;border:1px solid #ddd;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r[h]||"").replace(/"/g,"&quot;")}">${r[h]||""}</td>`;
          return `<td style="padding:6px 8px;border:1px solid #ddd;white-space:nowrap">${r[h]||""}</td>`;
        }).join("")}
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;white-space:nowrap">
          <button onclick="_editFormRecord(${idx})" style="padding:3px 8px;font-size:11px;cursor:pointer">編輯</button>
        </td>
      </tr>`;
    }).join("")}
    </tbody>
  </table>`;

  // 儲存紀錄供編輯用
  window._frRecords = records;
  window._frGasUrl = gasUrl;

  // 分頁
  if(pagesEl){
    const totalPages = Math.ceil(total / (result.pageSize||30));
    const cur = result.page||1;
    pagesEl.innerHTML = Array.from({length:Math.min(totalPages,10)},(_,i)=>{
      const p = i+1;
      return `<button onclick="window._frLoadPage(${p})" style="padding:4px 10px;background:${p===cur?'#007bff':'#f8f9fa'};color:${p===cur?'white':'#333'};border:1px solid #ddd;cursor:pointer">${p}</button>`;
    }).join("");
  }
}

function _editFormRecord(idx){
  const r = window._frRecords && window._frRecords[idx];
  if(!r) return;
  const statusOptions = ["未處理","已聯絡","報價中","已成交","未成交","已結案"];
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:#0007;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
  modal.innerHTML = `<div style="background:white;padding:24px;border-radius:12px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto">
    <h3 style="margin-bottom:16px">編輯表單紀錄</h3>
    <p><strong>姓名：</strong>${r["姓名"]||""} ${r["公司名稱"]?"/ "+r["公司名稱"]:""}</p>
    <p><strong>電話：</strong>${r["電話"]||""} &nbsp; <strong>Email：</strong>${r["Email"]||""}</p>
    <p style="margin:8px 0"><strong>需求：</strong>${r["需求內容"]||""}</p>
    <label style="display:block;margin-top:12px"><strong>處理狀態</strong>
      <select id="edit-status" style="display:block;width:100%;padding:8px;margin-top:4px;border:1px solid #ddd;border-radius:6px">
        ${statusOptions.map(s=>`<option value="${s}" ${r["處理狀態"]===s?"selected":""}>${s}</option>`).join("")}
      </select>
    </label>
    <label style="display:block;margin-top:10px"><strong>負責人</strong>
      <input id="edit-assignee" type="text" value="${r["負責人"]||""}" style="display:block;width:100%;padding:8px;margin-top:4px;border:1px solid #ddd;border-radius:6px">
    </label>
    <label style="display:block;margin-top:10px"><strong>備註</strong>
      <textarea id="edit-note" style="display:block;width:100%;padding:8px;margin-top:4px;border:1px solid #ddd;border-radius:6px;height:80px">${r["備註"]||""}</textarea>
    </label>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button id="edit-save" style="flex:1;padding:10px;background:#28a745;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">儲存</button>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;padding:10px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">取消</button>
    </div>
  </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#edit-save").onclick = async () => {
    const newStatus   = modal.querySelector("#edit-status").value;
    const newNote     = modal.querySelector("#edit-note").value;
    const newAssignee = modal.querySelector("#edit-assignee").value;
    const gasUrl = window._frGasUrl || "";
    if(gasUrl){
      try {
        await fetch(gasUrl, {
          method:"POST",
          headers:{"Content-Type":"text/plain;charset=utf-8"},
          body:JSON.stringify({ type:"updateFormStatus", sheetName:r._sheetName||"表單_contact",
            rowIndex:idx+2, status:newStatus, note:newNote, assignee:newAssignee })
        });
      } catch(e) {}
    }
    modal.remove();
    if(typeof window._frLoadPage==="function") window._frLoadPage(1);
  };
}

async function _exportFormsCsv(gasUrl){
  try {
    const type     = document.getElementById("fr-type").value;
    const status   = document.getElementById("fr-status").value;
    const search   = document.getElementById("fr-search").value;
    const from     = document.getElementById("fr-from").value;
    const to       = document.getElementById("fr-to").value;
    const mySiteId = currentUser && currentUser.isMaster ? "" : (currentUser && currentUser.siteId || "");
    const params   = new URLSearchParams({action:"getForms",formType:type,status,search,dateFrom:from,dateTo:to,siteId:mySiteId,page:1,pageSize:9999});
    const resp = await fetch(gasUrl + "?" + params);
    const result = await resp.json();
    const records = result.records || [];
    if(!records.length){ alert("沒有資料可匯出"); return; }
    const cols = Object.keys(records[0]).filter(k=>!k.startsWith("_"));
    const bom = "﻿";
    const csv = bom + [cols.join(","), ...records.map(r=>cols.map(k=>_csvEsc(r[k])).join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "formRecords_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
  } catch(e) { alert("匯出失敗：" + e.message); }
}

function _csvEsc(v){
  const s = String(v||"").replace(/"/g,'""');
  return s.includes(",")||s.includes("\n")||s.includes('"') ? `"${s}"` : s;
}
