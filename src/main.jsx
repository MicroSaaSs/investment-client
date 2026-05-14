import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {api} from "./services/api";
import "./styles.css";

const money = (v) => `$${Number(v || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
const pct = (v) => `${v > 0 ? "+" : ""}${Number(v || 0).toFixed(1)}%`;

function App() {
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [equity, setEquity] = useState([]);
  const [volatility, setVolatility] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        window.Telegram?.WebApp?.ready?.();
        await api.authTelegram(window.Telegram?.WebApp?.initData || "dev");
        const ps = await api.getPortfolios();
        setPortfolios(ps);
        if (ps[0]) setPortfolioId(ps[0].id);
      } catch (e) { setError(String(e.message || e)); }
    }
    boot();
  }, []);

  useEffect(() => {
    if (!portfolioId) return;
    async function load() {
      setMetrics(await api.getMetrics(portfolioId));
      setEquity(await api.getEquityCurve(portfolioId));
      setVolatility(await api.getVolatility(portfolioId));
    }
    load().catch(e => setError(String(e.message || e)));
  }, [portfolioId]);

  async function addPosition() {
    const ticker = prompt("Ticker?");
    if (!ticker) return;
    await api.createPosition(portfolioId, {ticker, companyName: "", category: "New position", type: "STOCK", targetAllocationPct: 0, includeInAllocation: true, correctionPct: -10, drawdownPlanPct: -20, volatilityPeriod: 360, volatilityInterval: "90"});
    setMetrics(await api.getMetrics(portfolioId));
  }

  async function addTransaction() {
    const ticker = prompt("Ticker?");
    const shares = Number(prompt("Shares?") || 0);
    const price = Number(prompt("Price?") || 0);
    if (!ticker) return;
    await api.createTransaction(portfolioId, {ticker, type: "BUY", date: new Date().toISOString().slice(0,10), shares, price, fees: 0, currency: "USD"});
    setMetrics(await api.getMetrics(portfolioId));
  }

  const positions = metrics?.positions || [];

  return <div className="app">
    <header><div><h1>Investment AI Platform</h1><p>Telegram Mini App · API mode</p></div><div><button onClick={addPosition}>Add Position</button><button onClick={addTransaction}>Add Transaction</button></div></header>
    {error && <div className="error">{error}</div>}
    <nav>{portfolios.map(p => <button className={p.id === portfolioId ? "active" : ""} onClick={() => setPortfolioId(p.id)} key={p.id}>{p.name}</button>)}</nav>
    <nav>{["dashboard","positions","volatility"].map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</nav>

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
