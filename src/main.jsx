import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {api} from "./services/api";
import "./styles.css";

const money = (v) => `$${Number(v || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
const pct = (v) => `${v > 0 ? "+" : ""}${Number(v || 0).toFixed(1)}%`;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function getTelegramInitData() {
  const initData = window.Telegram?.WebApp?.initData;
  return typeof initData === "string" && initData.trim() ? initData : "";
}

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authBusy, setAuthBusy] = useState(true);
  const [authForm, setAuthForm] = useState({email: "", password: "", firstName: "", lastName: ""});
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [equity, setEquity] = useState([]);
  const [volatility, setVolatility] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [error, setError] = useState("");
  const isAuthenticated = Boolean(api.getToken());

  useEffect(() => {
    async function boot() {
      try {
        window.Telegram?.WebApp?.ready?.();
        const telegramInitData = getTelegramInitData();
        if (telegramInitData) {
          await api.authTelegram(telegramInitData);
          await loadPortfolios();
        }
      } catch (e) { setError(String(e.message || e)); }
      finally { setAuthBusy(false); }
    }
    boot();
  }, []);

  useEffect(() => {
    if (isAuthenticated || getTelegramInitData() || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    async function waitForGoogle() {
      for (let i = 0; i < 40; i += 1) {
        if (window.google?.accounts?.id) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (cancelled || !window.google?.accounts?.id) {
        if (!cancelled) setError("Google Sign-In script failed to load");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError("");
          setAuthBusy(true);
          try {
            await api.authGoogle(response.credential);
            await loadPortfolios();
          } catch (e) {
            setError(String(e.message || e));
          } finally {
            setAuthBusy(false);
          }
        }
      });
      const button = document.getElementById("google-signin-button");
      if (button) {
        button.innerHTML = "";
        window.google.accounts.id.renderButton(button, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320
        });
      }
    }

    waitForGoogle();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  function updateAuthField(key, value) {
    setAuthForm((current) => ({...current, [key]: value}));
  }

  async function loadPortfolios() {
    const ps = await api.getPortfolios();
    setPortfolios(ps);
    setPortfolioId(ps[0]?.id || "");
    return ps;
  }

  useEffect(() => {
    if (!portfolioId) return;
    async function load() {
      setMetrics(await api.getMetrics(portfolioId));
      setEquity(await api.getEquityCurve(portfolioId));
      setVolatility(await api.getVolatility(portfolioId));
    }
    load().catch(e => setError(String(e.message || e)));
  }, [portfolioId]);

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setAuthBusy(true);
    try {
      if (authMode === "register") {
        await api.register(authForm);
      } else {
        await api.login({email: authForm.email, password: authForm.password});
      }
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function devTelegramLogin() {
    setError("");
    setAuthBusy(true);
    try {
      await api.authTelegram("dev");
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function createPortfolio() {
    const name = prompt("Portfolio name?") || "My Portfolio";
    const portfolio = await api.createPortfolio({name});
    const ps = [...portfolios, portfolio];
    setPortfolios(ps);
    setPortfolioId(portfolio.id);
  }

  async function addPosition() {
    if (!portfolioId) return;
    const ticker = prompt("Ticker?");
    if (!ticker) return;
    await api.createPosition(portfolioId, {ticker, companyName: "", category: "New position", type: "STOCK", targetAllocationPct: 0, includeInAllocation: true, correctionPct: -10, drawdownPlanPct: -20, volatilityPeriod: 360, volatilityInterval: "90"});
    setMetrics(await api.getMetrics(portfolioId));
  }

  async function addTransaction() {
    if (!portfolioId) return;
    const ticker = prompt("Ticker?");
    const shares = Number(prompt("Shares?") || 0);
    const price = Number(prompt("Price?") || 0);
    if (!ticker) return;
    await api.createTransaction(portfolioId, {ticker, type: "BUY", date: new Date().toISOString().slice(0,10), shares, price, fees: 0, currency: "USD"});
    setMetrics(await api.getMetrics(portfolioId));
  }

  const positions = metrics?.positions || [];

  if (!isAuthenticated) {
    return <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Investment AI Platform</p>
          <h1>Use the app in your browser or inside Telegram.</h1>
          <p>Browser users can sign in with Google or email and password. Telegram users can still enter through the Mini App flow.</p>
        </div>
        <div className="auth-switch">
          <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} type="button">Log in</button>
          <button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")} type="button">Register</button>
        </div>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === "register" && <div className="auth-grid">
            <input placeholder="First name" value={authForm.firstName} onChange={(e) => updateAuthField("firstName", e.target.value)} />
            <input placeholder="Last name" value={authForm.lastName} onChange={(e) => updateAuthField("lastName", e.target.value)} />
          </div>}
          <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => updateAuthField("email", e.target.value)} required />
          <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => updateAuthField("password", e.target.value)} required />
          <button className="primary" disabled={authBusy} type="submit">{authBusy ? "Please wait..." : authMode === "register" ? "Create account" : "Log in"}</button>
        </form>
        {GOOGLE_CLIENT_ID
          ? <div className="google-signin-wrap">
              <div id="google-signin-button"></div>
            </div>
          : <div className="error">Set `VITE_GOOGLE_CLIENT_ID` to enable browser Google login.</div>}
        <button className="ghost" disabled={authBusy} onClick={devTelegramLogin} type="button">Use Telegram dev login</button>
        {error && <div className="error">{error}</div>}
      </section>
    </div>;
  }

  return <div className="app">
    <header><div><h1>Investment AI Platform</h1><p>Browser + Telegram client · API mode</p></div><div><button onClick={createPortfolio}>New Portfolio</button><button disabled={!portfolioId} onClick={addPosition}>Add Position</button><button disabled={!portfolioId} onClick={addTransaction}>Add Transaction</button><button className="ghost" onClick={() => { api.setToken(""); window.google?.accounts?.id?.disableAutoSelect?.(); setPortfolios([]); setPortfolioId(""); setMetrics(null); setEquity([]); setVolatility([]); setError(""); setAuthBusy(false); }}>Log out</button></div></header>
    {error && <div className="error">{error}</div>}
    <nav>{portfolios.map(p => <button className={p.id === portfolioId ? "active" : ""} onClick={() => setPortfolioId(p.id)} key={p.id}>{p.name}</button>)}</nav>
    <nav>{["dashboard","positions","volatility"].map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</nav>

    {!portfolios.length && <section className="empty-state"><h2>No portfolios yet</h2><p>Create your first portfolio to start tracking positions, transactions, and analytics.</p><button onClick={createPortfolio}>Create portfolio</button></section>}
    {tab === "dashboard" && metrics && <main className="grid">
      <Card title="Portfolio Value" value={money(metrics.totalValue)} />
      <Card title="Invested" value={money(metrics.invested)} />
      <Card title="PnL" value={`${money(metrics.pnl)} / ${pct(metrics.pnlPct)}`} />
      <Card title="Signals" value={`${metrics.activeSignals} active`} />
      <section className="panel wide"><h2>Capital Curve</h2><ResponsiveContainer width="100%" height={280}><AreaChart data={equity}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day"/><YAxis tickFormatter={v=>`$${Math.round(v/1000)}K`}/><Tooltip formatter={v=>money(v)}/><Area dataKey="value" strokeWidth={2}/></AreaChart></ResponsiveContainer></section>
    </main>}

    {tab === "positions" && <section className="panel"><h2>Positions</h2><Table positions={positions}/></section>}
    {tab === "volatility" && <section className="panel"><h2>Volatility</h2><ResponsiveContainer width="100%" height={320}><BarChart data={volatility}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="ticker"/><YAxis tickFormatter={v=>`${v}%`}/><Tooltip formatter={v=>`${Number(v).toFixed(1)}%`}/><Bar dataKey="dd"/></BarChart></ResponsiveContainer></section>}
  </div>;
}

function Card({title,value}) { return <section className="card"><p>{title}</p><h2>{value}</h2></section>; }

function Table({positions}) { return <div className="table"><table><thead><tr><th>Ticker</th><th>Price</th><th>PnL</th><th>Weight</th><th>Drift</th><th>DD%</th><th>Signal</th></tr></thead><tbody>{positions.map(p=><tr key={p.id}><td><b>{p.ticker}</b><br/><small>{p.company}</small></td><td>${Number(p.price).toFixed(2)}</td><td>{pct(p.pnlPct)}</td><td>{pct(p.weight)} / {pct(p.target)}</td><td>{pct(p.drift)}</td><td>{pct(p.dd)}</td><td><span>{p.signal}</span></td></tr>)}</tbody></table></div>; }

createRoot(document.getElementById("root")).render(<App/>);
