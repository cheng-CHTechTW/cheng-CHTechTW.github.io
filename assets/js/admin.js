const DATA_KEY="cc_full_site_data";
const IMG_KEY="cc_full_site_images";

const TAB_LABELS = {
  basic:"基本資料", header:"頁首欄位", footer:"頁尾顯示", security:"登入密碼",
  users:"使用者權限", editEntry:"編輯入口", appearance:"手機/圖片顯示", hero:"主視覺", services:"服務項目",
  cases:"成功案例", partners:"關係企業", news:"最新消息", faq:"常見問題",
  form:"表單設定", images:"圖片管理", backup:"備份/還原", masterAccount:"工程總帳號修改"
};
const PERMISSION_KEYS = Object.keys(TAB_LABELS).filter(k=>k!=="masterAccount").concat(["masterAccount"]);

let data = loadData();
let images = loadImages();
let currentTab = "basic";
let currentUser = null;

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
function save(){
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  localStorage.setItem(IMG_KEY, JSON.stringify(images));
  logAdminChange("儲存網站設定","後台資料已儲存");
  alert("已儲存，回首頁重新整理即可查看。");
}
function showAdmin(){
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").classList.remove("locked");
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
  if(eye && loginPass){
    eye.onclick = function(){
      loginPass.type = loginPass.type === "password" ? "text" : "password";
      eye.textContent = loginPass.type === "password" ? "👁" : "🙈";
    };
  }
  if(loginBtn && loginUser && loginPass){
    loginBtn.onclick = function(){
      try{
        data = loadData();
        ensureUsers();
        const u = loginUser.value.trim();
        const p = loginPass.value;
        const found = data.adminUsers.find(x=>x.enabled!==false && x.username===u && x.password===p);
        if(found){
          currentUser = found;
          sessionStorage.setItem("cc_admin_logged_in","1");
          sessionStorage.setItem("cc_admin_user",found.username);
          showAdmin();
          refreshPermissionMenu();
          currentTab = firstAllowedTab();
          setActiveTabButton();
          logAdminChange("登入後台","使用者登入後台");
          render();
        }else{
          loginMsg.textContent = "帳號或密碼錯誤，預設：admin / 123456";
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

  const loginBtn = document.getElementById("loginBtn");
  const loginUser = document.getElementById("loginUser");
  const loginPass = document.getElementById("loginPass");
  const loginMsg = document.getElementById("loginMsg");
  const toggleLoginPass = document.getElementById("toggleLoginPass");

  if(toggleLoginPass){
    toggleLoginPass.onclick = () => {
      loginPass.type = loginPass.type === "password" ? "text" : "password";
      toggleLoginPass.textContent = loginPass.type === "password" ? "👁" : "🙈";
    };
  }

  if(loginPass){
    loginPass.addEventListener("keydown", e=>{
      if(e.key==="Enter") loginBtn.click();
    });
  }

  if(loginBtn){
    loginBtn.onclick = () => {
      data = loadData();
      ensureUsers();
      const u = loginUser.value.trim();
      const p = loginPass.value;
      const found = data.adminUsers.find(x=>x.enabled!==false && x.username===u && x.password===p);

      if(found){
        currentUser = found;
        sessionStorage.setItem("cc_admin_logged_in","1");
        sessionStorage.setItem("cc_admin_user",found.username);
        showAdmin();
        refreshPermissionMenu();
        currentTab = firstAllowedTab();
        setActiveTabButton();
        logAdminChange("登入後台","使用者登入後台");
        render();
      }else{
        loginMsg.textContent = "帳號或密碼錯誤";
        loginPass.value = "";
      }
    };
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
function bindInputs(){
  document.querySelectorAll("[data-path]").forEach(el=>{
    el.oninput = () => set(el.dataset.path, el.value);
  });
}
function move(arr,i,dir){
  const j = i + dir;
  if(j<0 || j>=arr.length) return;
  [arr[i],arr[j]] = [arr[j],arr[i]];
  render();
}
function renderList(arrName, fields, template){
  const arr = data[arrName] || [];
  return arr.map((it,i)=>`
    <div class="item">
      <div class="item-title">
        <h3>${i+1}. ${it.title || it.companyName || it.q || "項目"} <small>${it.visible===false?"（隱藏）":""}</small></h3>
        <button class="danger" data-del="${arrName}" data-i="${i}">刪除</button>
      </div>
      <label class="check-row"><input type="checkbox" data-arr="${arrName}" data-i="${i}" data-f="visible" ${it.visible!==false?"checked":""}> 顯示此項目</label>
      ${arrName==="news" ? `<label class="check-row"><input type="checkbox" data-arr="${arrName}" data-i="${i}" data-f="pinned" ${it.pinned===true?"checked":""}> 置頂顯示於最新消息最上方</label>` : ""}
      ${fields.map(f=>`
        <label>${f.l}</label>
        ${f.t==="textarea"
          ? `<textarea data-arr="${arrName}" data-i="${i}" data-f="${f.k}">${it[f.k]||""}</textarea>`
          : `<input data-arr="${arrName}" data-i="${i}" data-f="${f.k}" value="${String(it[f.k]||"").replace(/"/g,"&quot;")}">`}
      `).join("")}
      <div class="row-actions">
        <button class="move-btn" data-move="${arrName}" data-i="${i}" data-dir="-1">上移</button>
        <button class="move-btn" data-move="${arrName}" data-i="${i}" data-dir="1">下移</button>
      </div>
    </div>
  `).join("") + `<button class="add-btn" data-add="${arrName}">新增</button>`;
}
function bindList(arrName, template){
  document.querySelectorAll(`[data-arr="${arrName}"]`).forEach(el=>{
    el.oninput = el.onchange = () => {
      data[arrName][+el.dataset.i][el.dataset.f] = el.type==="checkbox" ? el.checked : el.value;
    };
  });
  document.querySelectorAll(`[data-del="${arrName}"]`).forEach(btn=>{
    btn.onclick = () => {
      data[arrName].splice(+btn.dataset.i,1);
      render();
    };
  });
  document.querySelectorAll(`[data-move="${arrName}"]`).forEach(btn=>{
    btn.onclick = () => move(data[arrName], +btn.dataset.i, +btn.dataset.dir);
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
function imgUpload(key,label,src){
  const s = images[key] || src || "";
  return `<div class="item"><h3>${label}</h3>${s?`<img class="preview-img" src="${s}">`:""}<input type="file" accept="image/*" data-imgkey="${key}"></div>`;
}
function bindImg(){
  document.querySelectorAll("[data-imgkey]").forEach(inp=>{
    inp.onchange = e => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        images[inp.dataset.imgkey] = reader.result;
        if(inp.dataset.imgkey==="logo"){
          images.siteLogo = reader.result;
          images.headerLogo = reader.result;
        }
        syncAdminLogoImages();
    ccV16AdminEnhance();
        render();
      };
      reader.readAsDataURL(file);
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
      ${input("contact.lineUrl","LINE連結")}
      ${input("contact.facebookUrl","FB")}
      ${input("contact.instagramUrl","IG")}
      ${input("contact.youtubeUrl","YouTube")}
    </div>`;
    bindInputs();
    document.querySelectorAll("[data-cf]").forEach(el=>{
      el.oninput = el.onchange = () => {
        const [k,fld] = el.dataset.cf.split(".");
        data.contactFields[k][fld] = el.type==="checkbox" ? el.checked : el.value;
        if(fld==="value" && data.contact[k]!==undefined) data.contact[k] = el.value;
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
      logAdminChange("變更後台密碼","修改自己的登入帳號或密碼");
      save();
      passwordMsg.textContent = "已變更";
      passwordMsg.style.color = "#86efac";
    };
  }

  if(currentTab==="users"){
    ensureUsers();
    const userRows = data.adminUsers.map((u,i)=>({u,i})).filter(x=>!x.u.isMaster || hasPerm("masterAccount"));
    const logs = JSON.parse(localStorage.getItem("cc_admin_audit_logs")||"[]").slice(0,8);
    c.innerHTML = `<div class="group"><h2>使用者權限管理</h2>
      ${!hasPerm("masterAccount")?`<div class="master-hidden-note">工程總帳號已隱藏。只有具備「工程總帳號修改」權限的使用者可以查看與修改。</div>`:""}
      ${userRows.map(({u,i})=>`
        <div class="item">
          <div class="item-title">
            <h3>${u.displayName||u.username}<span class="user-badge">${u.enabled!==false?"啟用":"停用"}</span></h3>
            ${u.isMaster?`<span class="small">工程總帳號</span>`:`<button class="danger" data-user-del="${i}">刪除</button>`}
          </div>
          <label class="check-row"><input type="checkbox" data-user="${i}" data-field="enabled" ${u.enabled!==false?"checked":""}> 啟用此帳號</label>
          <div class="wide-grid">
            <div><label>帳號</label><input data-user="${i}" data-field="username" value="${u.username||""}" ${u.isMaster&&!hasPerm("masterAccount")?"disabled":""}></div>
            <div><label>密碼</label><input data-user="${i}" data-field="password" value="${u.password||""}" ${u.isMaster&&!hasPerm("masterAccount")?"disabled":""}></div>
            <div><label>顯示名稱</label><input data-user="${i}" data-field="displayName" value="${u.displayName||""}"></div>
          </div>
          <label>Email</label><input data-user="${i}" data-field="email" value="${u.email||""}">
          <h4>權限勾選</h4>
          <div class="perm-grid">
            ${PERMISSION_KEYS.filter(p=>p!=="masterAccount" || hasPerm("masterAccount")).map(k=>`
              <label class="check-row"><input type="checkbox" data-user-perm="${i}" data-perm="${k}" ${u.permissions&&u.permissions[k]?"checked":""}> ${TAB_LABELS[k]}</label>
            `).join("")}
          </div>
        </div>`).join("")}
      <button class="add-btn" id="addUserBtn">新增使用者</button>
    </div>
    <div class="group"><h2>最近使用者變更紀錄</h2>
      ${logs.length?logs.map(l=>`<div class="item"><b>${l.createdAt}</b>｜${l.actor||""}｜${l.action}<br><span class="small">${l.detail||""}</span></div>`).join(""):"<p>尚無紀錄</p>"}
    </div>`;
    document.querySelectorAll("[data-user]").forEach(el=>{
      el.oninput = el.onchange = () => {
        const i=+el.dataset.user, f=el.dataset.field;
        data.adminUsers[i][f] = el.type==="checkbox" ? el.checked : el.value;
      };
    });
    document.querySelectorAll("[data-user-perm]").forEach(el=>{
      el.onchange = () => {
        const i=+el.dataset.user, p=el.dataset.perm;
        if(!data.adminUsers[i].permissions) data.adminUsers[i].permissions={};
        data.adminUsers[i].permissions[p]=el.checked;
      };
    });
    document.querySelectorAll("[data-user-del]").forEach(btn=>{
      btn.onclick = () => {
        const i=+btn.dataset.userDel;
        const name=data.adminUsers[i].username;
        data.adminUsers.splice(i,1);
        logAdminChange("刪除使用者","刪除使用者："+name);
        render();
      };
    });
    addUserBtn.onclick = () => {
      data.adminUsers.push({
        enabled:true, isMaster:false, username:"user"+(data.adminUsers.length+1),
        password:"123456", displayName:"新使用者", email:"",
        permissions:{basic:true,header:false,footer:false,security:false,users:false,editEntry:false,hero:true,services:true,cases:true,partners:true,news:true,faq:true,form:false,images:true,backup:false,masterAccount:false}
      });
      logAdminChange("新增使用者","新增一位後台使用者");
      render();
    };
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
    if(!data.appearanceConfig)data.appearanceConfig={desktopLogoHeight:56,mobileLogoHeight:64,adminLoginLogoHeight:58,footerLineQrShow:true,footerLineQrLabel:"官方 LINE",footerLineQrImage:"assets/images/line-qr.png",footerLineQrSize:150};
    c.innerHTML=`<div class="group"><h2>手機 / 圖片顯示設定</h2>
    <p>可調整手機與桌機 Logo 大小，以及頁尾 LINE QR 圖片顯示。</p>
    <div class="item"><h3>Logo 顯示大小</h3>${input("appearanceConfig.desktopLogoHeight","桌機 Logo 高度 px")}${input("appearanceConfig.mobileLogoHeight","手機 Logo 高度 px")}${input("appearanceConfig.adminLoginLogoHeight","後台登入 Logo 高度 px")}</div>
    <div class="item"><h3>頁尾 LINE QR</h3><label class="check-row"><input type="checkbox" id="footerLineQrShow" ${data.appearanceConfig.footerLineQrShow!==false?"checked":""}> 顯示頁尾 LINE QR</label>${input("appearanceConfig.footerLineQrLabel","QR 顯示名稱")}${input("appearanceConfig.footerLineQrImage","QR 圖片路徑，例如 assets/images/line-qr.png")}${input("appearanceConfig.footerLineQrSize","QR 圖片大小 px")}${input("appearanceConfig.lineJoinUrl","點 QR / LINE ID 前往的 LINE 加入網址")}${input("appearanceConfig.versionLabel","版本號顯示文字")}<p class="small">圖片可放在 assets/images/line-qr.png；若不要顯示請取消勾選。</p></div>
    </div>`;
    bindInputs();
    footerLineQrShow.onchange=e=>data.appearanceConfig.footerLineQrShow=e.target.checked;
  }

  if(currentTab==="hero"){
    c.innerHTML = `<div class="group"><h2>主視覺</h2>
      ${input("hero.eyebrow","小標")}
      ${input("hero.title","主標題","textarea")}
      ${input("hero.subtitle","副標題","textarea")}
      <label>重點文字，用逗號分隔</label><input id="hp" value="${data.hero.points.join(",")}">
    </div>`;
    bindInputs();
    hp.oninput = e => data.hero.points=e.target.value.split(",").map(x=>x.trim()).filter(Boolean);
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
      ${renderList("cases",[
        {k:"title",l:"標題"},{k:"subtitle",l:"小標題"},{k:"text",l:"內文",t:"textarea"},
        {k:"image",l:"封面圖路徑"},{k:"url",l:"網址"}
      ],{visible:false,title:"新案例",subtitle:"",text:"",image:"assets/images/case-1.svg",url:""})}
    </div>`;
    bindInputs(); bindDisplay();
    bindList("cases",{visible:false,title:"新案例",subtitle:"",text:"",image:"assets/images/case-1.svg",url:""});
  }

  if(currentTab==="partners"){
    c.innerHTML = `<div class="group"><h2>關係企業</h2>
      ${input("partnersTitle","區塊標題")}
      ${displaySettings("partnersDisplay","顯示設定")}
      ${renderList("partners",[
        {k:"companyName",l:"公司名稱"},{k:"phone",l:"電話"},{k:"lineUrl",l:"LINE網址"},
        {k:"facebookUrl",l:"粉專網址"},{k:"websiteUrl",l:"形象網站"},
        {k:"image",l:"封面圖片"},{k:"description",l:"介紹",t:"textarea"}
      ],{visible:false,image:"assets/images/case-1.svg",companyName:"新關係企業",phone:"",lineUrl:"",facebookUrl:"",websiteUrl:"",description:""})}
    </div>`;
    bindInputs(); bindDisplay();
    bindList("partners",{visible:false,image:"assets/images/case-1.svg",companyName:"新關係企業",phone:"",lineUrl:"",facebookUrl:"",websiteUrl:"",description:""});
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
    c.innerHTML = `<div class="group"><h2>備份</h2>
      <button class="add-btn" id="exportBtn">匯出備份</button>
      <label>匯入備份</label><input type="file" id="importFile">
      <button class="danger" id="resetBtn">恢復原始資料</button>
      <pre class="code">${JSON.stringify(data,null,2)}</pre>
    </div>`;
    exportBtn.onclick = () => {
      const blob = new Blob([JSON.stringify({data,images},null,2)],{type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "chengchuang_site_backup.json";
      a.click();
    };
    importFile.onchange = e => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const obj = JSON.parse(reader.result);
        data = obj.data || data;
        images = obj.images || {};
        save();
        render();
      };
      reader.readAsText(file);
    };
    resetBtn.onclick = () => {
      if(confirm("確定恢復？")){
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem(IMG_KEY);
        data = clone(DEFAULT_DATA);
        images = {};
        render();
      }
    };
  }
}

function openPreview(){
  sessionStorage.setItem("cc_preview_mode","1");
  sessionStorage.setItem("cc_preview_site_data",JSON.stringify(data));
  sessionStorage.setItem("cc_preview_site_images",JSON.stringify(images));
  previewFrame.src = "index.html?preview=1&t=" + Date.now();
  previewModal.classList.add("show");
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
    document.querySelectorAll("aside button").forEach(btn=>{
      btn.onclick = () => {
        if(!hasPerm(btn.dataset.tab)){
          alert("此帳號沒有此功能權限");
          return;
        }
        currentTab = btn.dataset.tab;
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
