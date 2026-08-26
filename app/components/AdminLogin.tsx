"use client";
import {FormEvent,useState} from "react";

export default function AdminLogin({onClose}:{onClose:()=>void}){
 const savedAccount=typeof window!=="undefined"?localStorage.getItem("ch-admin-account")||"admin":"admin";
 const[error,setError]=useState(""),[remember,setRemember]=useState(Boolean(typeof window!=="undefined"&&localStorage.getItem("ch-admin-account")));
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(f.get("account")==="admin"&&f.get("password")==="CH2026!"){
   sessionStorage.setItem("ch-admin-session","1");
   if(remember)localStorage.setItem("ch-admin-account",String(f.get("account")||""));else localStorage.removeItem("ch-admin-account");
   location.href="/admin";
  }else setError("帳號或密碼錯誤");
 }
 return <div className="modal-backdrop login-backdrop"><form className="login-card" onSubmit={submit}>
  <button type="button" className="modal-x" onClick={onClose}>×</button>
  <div className="login-intro"><img src="/logo.svg"/><div><h2>網站內容管理後台</h2><p>管理員登入後才能修改網站資訊</p></div></div>
  <label>管理員帳號<input name="account" autoComplete="username" defaultValue={savedAccount} required/></label>
  <label>登入密碼<input name="password" type="password" autoComplete="current-password" required/></label>
  <label className="remember-login"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>記住管理員帳號</span></label>
  {error&&<em>{error}</em>}<button className="primary login-submit" type="submit">安全登入</button><small>展示帳號：admin　密碼：CH2026!</small>
 </form></div>;
}
