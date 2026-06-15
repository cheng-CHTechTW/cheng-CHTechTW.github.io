// firebase-config.js - CMS V1
// Key 從 localStorage 讀取，首次在後台「系統設定」輸入

function loadConfig() {
  try { const s = localStorage.getItem('cms_firebase_config'); if(s) return JSON.parse(s); } catch(e){}
  return null;
}
export function saveFirebaseConfig(c) { localStorage.setItem('cms_firebase_config', JSON.stringify(c)); }
export function clearFirebaseConfig() { localStorage.removeItem('cms_firebase_config'); }
export function hasFirebaseConfig() { const c=loadConfig(); return c&&c.apiKey&&!c.apiKey.includes('YOUR_'); }

const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

const _cfg = loadConfig();
let app, db, auth;
if (_cfg && _cfg.apiKey && !_cfg.apiKey.includes('YOUR_')) {
  app = initializeApp(_cfg);
  db  = getFirestore(app);
  auth = getAuth(app);
} else {
  console.warn('[CMS] Firebase 未設定，請在後台系統設定輸入 Config');
  app = null; db = null;
  auth = { currentUser:null, onAuthStateChanged:(cb)=>{cb(null);return ()=>{};} };
}
export { app, db, auth, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged };
