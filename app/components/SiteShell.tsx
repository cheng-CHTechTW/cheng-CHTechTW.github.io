"use client";
import { useEffect, useState } from "react";
import { defaultSiteData, SiteData } from "../data/site-data";
import { Icon } from "./icons";
import Footer from "./Footer";
import AdminLogin from "./AdminLogin";

const STORE = "ch-site-content-v1";

export default function SiteShell() {
  const [data, setData] = useState<SiteData>(defaultSiteData);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("home");
  const [login, setLogin] = useState(false);
  const [notice, setNotice] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [form, setForm] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const value = localStorage.getItem(STORE);
    if (value) {
      try { setData(JSON.parse(value)); } catch { }
    }
  }, []);

  const announcements = data.announcements?.length ? data.announcements : [data.announcement];
  const pick = (id: string) => { setActive(id); setMenu(false); };

  return <>
    <main id="home" className="site-shell" style={data.hero.background ? { backgroundImage: `linear-gradient(#fff8,#fff8),url(${data.hero.background})` } : {}}>
      <header className="header">
        <a className="brand" href="#home" onClick={() => pick("home")}><img src={data.brand.logo} /><span><b>{data.brand.name}</b><small>{data.brand.en}</small></span></a>
        <button className="compact-menu" onClick={() => setMenu(!menu)}><span>{menu ? "⌃" : "›"}</span><b>{menu ? "收合" : "目錄"}</b></button>
        <nav>{data.nav.filter(item => item.visible).map(item => <a className={active === item.id ? "active" : ""} href={item.url} key={item.id} onClick={() => pick(item.id)}>{item.label}{item.children && <span>⌄</span>}</a>)}</nav>
      </header>

      {data.announcement.visible && <button className="ticker" onClick={() => { setNotice(true); setExpandedNotice(null); }}><Icon name="megaphone" /><b>最新公告</b><i /><time>{announcements[0].date}</time><i /><div><span>{announcements[0].text}</span></div><Icon name="chevron" /></button>}

      {menu && <div className="mobile-menu">{data.nav.filter(item => item.visible).map(item => <section key={item.id}><button className={active === item.id ? "selected" : ""} onClick={() => pick(item.id)}>{item.label}<span>{item.children ? "⌄" : "›"}</span></button>{item.id === "services" && <div className="mobile-sub">{item.children?.map(child => <a href="#services" key={child}>{child}<span>›</span></a>)}</div>}</section>)}</div>}

      {data.hero.visible && <section className="hero"><div className="hero-copy"><p className="eyebrow">{data.hero.eyebrow}</p><h1>{data.hero.title}</h1><p className="lead">{data.hero.description}</p><div className="actions"><button className="primary" onClick={() => setForm(true)}>{data.hero.primary}</button><a className="secondary" href="#solutions">{data.hero.secondary}</a></div><div className="quick-icons">{data.quick.filter(item => item.visible).map(item => <button key={item.label} onClick={() => item.label.includes("客服") ? setForm(true) : (location.hash = item.url)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</div></div><div className="service-stage" id="services"><div className="service-grid">{data.services.filter(service => service.visible).map((service, index) => <a className="service-card" href={service.url} key={service.id} style={{ "--delay": `${index * 140}ms` } as React.CSSProperties}><Icon name={service.icon} /><b>{service.title}</b><small>{service.subtitle}</small></a>)}</div><a className="elephant-core" href="#about"><img src={data.brand.logo} /></a></div></section>}
      <aside className="floating"><a href="https://line.me/R/ti/p/@905dqqw"><Icon name="line" /></a><a href="tel:0286237091"><Icon name="phone" /></a><button onClick={() => setForm(true)}><Icon name="mail" /></button><button onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><Icon name="up" /></button></aside>
    </main>
    <Footer data={data} onAdmin={() => setLogin(true)} />

    {notice && <div className="modal-backdrop front-modal"><section className="notice-accordion"><button className="modal-x" onClick={() => { setNotice(false); setExpandedNotice(null); }}>×</button><small>最新公告</small><h2>誠創科技公告</h2><div className="notice-list">{announcements.map((item, index) => { const expanded = expandedNotice === index; return <article className={expanded ? "expanded" : ""} key={`${item.date}-${index}`}><button className="notice-trigger" onClick={() => setExpandedNotice(expanded ? null : index)} aria-expanded={expanded}><time>{item.date}</time><span>{item.text}</span><b>{expanded ? "−" : "+"}</b></button>{expanded && <p>{item.text}</p>}</article>; })}</div><button className="primary" onClick={() => setNotice(false)}>關閉</button></section></div>}

    {form && <div className="modal-backdrop front-modal consult"><form onSubmit={event => { event.preventDefault(); setSent(true); }}><button type="button" className="modal-x" onClick={() => { setForm(false); setSent(false); }}>×</button><h2>聯絡誠創科技</h2><p>留下您的需求，我們會盡快與您聯繫。</p>{sent ? <div className="form-success">表單已送出，我們將盡快回覆您。</div> : <><label>姓名<input required /></label><label>電話<input required /></label><label>Email<input type="email" /></label><label>需求<textarea rows={4} required /></label><button className="primary">送出諮詢</button></>}</form></div>}
    {login && <AdminLogin onClose={() => setLogin(false)} />}
  </>;
}
