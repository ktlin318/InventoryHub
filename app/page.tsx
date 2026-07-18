"use client";

import { FormEvent, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "./supabase";

type View = "dashboard" | "consignments" | "customers" | "approvals" | "settings";

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "營運總覽", icon: "▦" },
  { id: "consignments", label: "寄庫管理", icon: "▤" },
  { id: "customers", label: "客戶寄庫查詢", icon: "◎" },
  { id: "approvals", label: "待辦與覆核", icon: "✓" },
  { id: "settings", label: "系統設定", icon: "⚙" },
];

const orders = [
  { no: "CS-20260718-001", customer: "沐光設計有限公司", order: "SO-202607-1048", products: "壓克力展示架等 3 項", qty: 186, status: "待確認", tone: "warning", owner: "王小明", time: "今天 14:32" },
  { no: "CS-20260718-002", customer: "陳美華", order: "SO-202607-1052", products: "不鏽鋼保溫瓶", qty: 48, status: "生效", tone: "success", owner: "林怡君", time: "今天 13:08" },
  { no: "CS-20260717-009", customer: "日禾餐飲股份有限公司", order: "SO-202607-0981", products: "客製托盤等 2 項", qty: 320, status: "部分提領", tone: "info", owner: "張庭瑋", time: "昨天 17:46" },
  { no: "CS-20260716-006", customer: "安川貿易有限公司", order: "MANUAL-20260716-003", products: "展示掛鉤", qty: 72, status: "待確認", tone: "warning", owner: "王小明", time: "7 月 16 日" },
];

function Login({ onPreview }: { onPreview: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!hasSupabaseConfig || !supabase) {
      setMessage("尚未連接 Supabase，請使用開發預覽進入第一階段畫面。");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage("登入失敗，請確認帳號或密碼。");
    else onPreview();
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark large">IH</div>
        <p className="eyebrow">INVENTORYHUB</p>
        <h1>每一件寄庫，<br />都有清楚的去向。</h1>
        <p className="brand-copy">從訂單、寄庫、提領到退貨，以完整異動軌跡掌握每位客戶的寄庫餘量。</p>
        <div className="brand-stats">
          <div><strong>完整追溯</strong><span>建立、覆核與異動人員</span></div>
          <div><strong>FIFO</strong><span>自動分攤提領批次</span></div>
          <div><strong>即時勾稽</strong><span>訂單與寄庫數量平衡</span></div>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={signIn}>
          <div className="mobile-logo"><div className="brand-mark">IH</div><b>InventoryHub</b></div>
          <p className="eyebrow dark">內部管理系統</p>
          <h2>歡迎回來</h2>
          <p className="muted">請使用公司帳號登入寄庫管理系統</p>
          <label>電子郵件<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required /></label>
          <label>密碼<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入密碼" required /></label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary full" type="submit" disabled={loading}>{loading ? "登入中…" : "登入系統"}</button>
          {!hasSupabaseConfig && <button className="preview-button" type="button" onClick={onPreview}>進入開發預覽</button>}
          <p className="security-note"><span>●</span> 僅限授權的公司內部人員使用</p>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => orders.filter((item) => Object.values(item).join(" ").toLowerCase().includes(search.toLowerCase())), [search]);
  const title = navItems.find((item) => item.id === view)?.label ?? "營運總覽";

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><div className="brand-mark">IH</div><div><b>InventoryHub</b><span>寄庫管理系統</span></div></div>
        <nav>
          <p>主要功能</p>
          {navItems.slice(0, 4).map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMenuOpen(false); }}><span>{item.icon}</span>{item.label}{item.id === "approvals" && <em>4</em>}</button>)}
          <p>管理</p>
          <button className={view === "settings" ? "active" : ""} onClick={() => { setView("settings"); setMenuOpen(false); }}><span>⚙</span>系統設定</button>
        </nav>
        <div className="user-card"><div className="avatar">王</div><div><b>王小明</b><span>系統管理員</span></div><button onClick={onLogout} aria-label="登出">↪</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟選單">☰</button>
          <div><p className="breadcrumb">InventoryHub ／ {title}</p><h1>{title}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="通知">♢<i>3</i></button><button className="primary"><span>＋</span> 建立寄庫單</button></div>
        </header>

        <div className="content">
          {view !== "dashboard" && <section className="placeholder-panel"><span>{navItems.find((i) => i.id === view)?.icon}</span><h2>{title}</h2><p>此模組將在後續階段依已核准規格逐步完成。目前第一階段已建立導覽、登入與權限基礎。</p><button className="secondary" onClick={() => setView("dashboard")}>返回營運總覽</button></section>}
          {view === "dashboard" && <>
            <section className="welcome-row"><div><h2>午安，王小明</h2><p>這是今天的寄庫營運摘要，目前有 <b>4 張單據</b> 等待處理。</p></div><span>資料更新：2026/07/18 16:42</span></section>
            <section className="metric-grid">
              <article><div className="metric-icon blue">▣</div><div><span>有效寄庫總量</span><strong>12,486 <small>件</small></strong><p className="up">↑ 8.2% <em>較上月</em></p></div></article>
              <article><div className="metric-icon teal">◎</div><div><span>寄庫客戶數</span><strong>238 <small>位</small></strong><p>本月新增 12 位</p></div></article>
              <article><div className="metric-icon amber">✓</div><div><span>待覆核單據</span><strong>4 <small>張</small></strong><p className="alert-text">最久已等待 2 天</p></div></article>
              <article><div className="metric-icon red">!</div><div><span>異常與逾期</span><strong>7 <small>項</small></strong><p className="alert-text">2 項需優先處理</p></div></article>
            </section>

            <section className="dashboard-grid">
              <article className="panel activity-panel">
                <div className="panel-head"><div><h3>寄庫量趨勢</h3><p>近 7 日寄庫與提領數量</p></div><button className="filter">近 7 日⌄</button></div>
                <div className="chart-legend"><span><i className="legend-blue" />寄庫</span><span><i className="legend-teal" />提領</span></div>
                <div className="bar-chart">
                  {[{d:"7/12",a:58,b:32},{d:"7/13",a:72,b:45},{d:"7/14",a:46,b:38},{d:"7/15",a:84,b:52},{d:"7/16",a:68,b:61},{d:"7/17",a:92,b:49},{d:"今天",a:76,b:57}].map((x) => <div className="bar-group" key={x.d}><div className="bars"><i style={{height:`${x.a}%`}}/><i style={{height:`${x.b}%`}}/></div><span>{x.d}</span></div>)}
                </div>
              </article>
              <article className="panel alerts-panel">
                <div className="panel-head"><div><h3>需處理事項</h3><p>依優先程度排序</p></div><button className="link-button">查看全部 →</button></div>
                <div className="alert-list">
                  <button><i className="danger">!</i><div><b>帳面量高於實際庫存</b><span>台北倉・商品 PRD-0182</span></div><em>立即處理</em></button>
                  <button><i className="warning">⌛</i><div><b>寄庫即將到期</b><span>3 位客戶將於 7 天內到期</span></div><em>3 筆</em></button>
                  <button><i className="info">≠</i><div><b>訂單數量勾稽異常</b><span>SO-202607-0996</span></div><em>查看</em></button>
                </div>
              </article>
            </section>

            <section className="panel table-panel">
              <div className="panel-head responsive"><div><h3>最近寄庫單</h3><p>最新建立及異動的寄庫單據</p></div><div className="table-actions"><label className="search-box">⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋客戶、訂單或單號" /></label><button className="filter">篩選⌄</button></div></div>
              <div className="table-wrap"><table><thead><tr><th>寄庫單號</th><th>客戶</th><th>訂單／商品</th><th>寄庫量</th><th>狀態</th><th>建立資訊</th><th></th></tr></thead><tbody>{filteredOrders.map((row) => <tr key={row.no}><td><b className="order-link">{row.no}</b></td><td><b>{row.customer}</b></td><td><b>{row.order}</b><span>{row.products}</span></td><td><b>{row.qty.toLocaleString()} 件</b></td><td><span className={`status ${row.tone}`}>{row.status}</span></td><td><b>{row.owner}</b><span>{row.time}</span></td><td><button className="more">•••</button></td></tr>)}</tbody></table></div>
              <div className="mobile-orders">{filteredOrders.map((row) => <article key={row.no}><div><b className="order-link">{row.no}</b><span className={`status ${row.tone}`}>{row.status}</span></div><h4>{row.customer}</h4><p>{row.order}・{row.products}</p><footer><b>{row.qty.toLocaleString()} 件</b><span>{row.owner}・{row.time}</span></footer></article>)}</div>
            </section>
          </>}
        </div>
      </section>
      {menuOpen && <button className="overlay" onClick={() => setMenuOpen(false)} aria-label="關閉選單" />}
    </main>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  return authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <Login onPreview={() => setAuthenticated(true)} />;
}
