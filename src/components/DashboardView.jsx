import React from "react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {compactMoney, money, pct} from "../utils/format";

function MetricCard({label, value, detail, tone = "default"}) {
  return (
    <section className={`metric-card metric-card-${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
      {detail ? <span>{detail}</span> : null}
      <small>tap</small>
    </section>
  );
}

function EquityTooltip({active, label, payload}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value || 0);
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>value : {money(value)}</span>
    </div>
  );
}

export function DashboardView({metrics, equity}) {
  if (!metrics) return null;

  return (
    <main className="dashboard-layout">
      <div className="metric-grid">
        <MetricCard label="Portfolio Value" value={compactMoney(metrics.totalValue)} detail="Current value" tone="blue" />
        <MetricCard label="Invested" value={compactMoney(metrics.invested)} detail="Cost basis" />
        <MetricCard label="PnL" value={`${compactMoney(metrics.pnl)} / ${pct(metrics.pnlPct)}`} detail="Portfolio result" tone="green" />
        <MetricCard label="Signals" value={`${String(metrics.activeSignals)} active`} detail="BUY1 / BUY2" tone="amber" />
      </div>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Capital Curve</h2>
            <p className="panel-copy">Invested baseline + current capitalization history</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={equity} margin={{left: -18, right: 8, top: 8, bottom: 0}}>
            <defs>
              <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f7cc0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#2f7cc0" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#d7e1ef" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} tickLine={false} axisLine={false} tickMargin={8} width={52} />
            <Tooltip content={<EquityTooltip />} cursor={{stroke: "#d7e1ef", strokeWidth: 2}} />
            <Area activeDot={{r: 6, fill: "#2f7cc0", stroke: "#ffffff", strokeWidth: 3}} dataKey="value" stroke="#2f7cc0" fill="url(#equityGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
