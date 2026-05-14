import React from "react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {compactMoney, money, pct} from "../utils/format";

function MetricCard({label, value, detail}) {
  return (
    <section className="metric-card">
      <p>{label}</p>
      <h3>{value}</h3>
      {detail ? <span>{detail}</span> : null}
    </section>
  );
}

export function DashboardView({metrics, equity}) {
  if (!metrics) return null;

  return (
    <main className="dashboard-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PORTFOLIO OVERVIEW</p>
            <h2>Live operating picture</h2>
          </div>
        </div>
        <div className="overview-strip">
          <div><span>Total value</span><strong>{money(metrics.totalValue)}</strong></div>
          <div><span>Capital invested</span><strong>{money(metrics.invested)}</strong></div>
          <div><span>Current result</span><strong>{money(metrics.pnl)} · {pct(metrics.pnlPct)}</strong></div>
          <div><span>Cash share</span><strong>{pct(metrics.cashWeight)}</strong></div>
        </div>
      </section>
      <div className="metric-grid">
        <MetricCard label="Portfolio value" value={money(metrics.totalValue)} detail={compactMoney(metrics.totalValue)} />
        <MetricCard label="Capital invested" value={money(metrics.invested)} />
        <MetricCard label="PnL" value={money(metrics.pnl)} detail={pct(metrics.pnlPct)} />
        <MetricCard label="Active signals" value={String(metrics.activeSignals)} detail={`${pct(metrics.cashWeight)} cash`} />
      </div>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EQUITY CURVE</p>
            <h2>Capital trend</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={equity}>
            <defs>
              <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#12305f" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#12305f" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e1ef" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => money(value)} />
            <Area dataKey="value" stroke="#12305f" fill="url(#equityGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
