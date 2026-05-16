import React from "react";
import {Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {compactMoney, money, pct} from "../utils/format";

const ALLOCATION_COLORS = ["#4f83bf", "#c3504c", "#9dbc59", "#8366aa", "#4ea7c1", "#fe9640", "#7ea1cc", "#d48383"];

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
  const activePositions = (metrics.positions || []).filter((position) => position.mode !== "WATCHLIST" && position.includeInAllocation);
  const boughtAllocation = activePositions.filter((position) => position.invested > 0).map((position) => ({
    name: position.ticker,
    value: position.invested,
  }));
  const currentAllocation = activePositions.filter((position) => position.current > 0).map((position) => ({
    name: position.ticker,
    value: position.current,
  }));

  return (
    <main className="dashboard-layout">
      <div className="metric-grid">
        <MetricCard label="Portfolio Value" value={compactMoney(metrics.totalValue)} detail="Current value" tone="blue" />
        <MetricCard label="Invested" value={compactMoney(metrics.invested)} detail="Cost basis" />
        <MetricCard label="PnL" value={`${compactMoney(metrics.pnl)} / ${pct(metrics.pnlPct)}`} detail="Portfolio result" tone="green" />
        <MetricCard label="Signals" value={`${String(metrics.activeSignals)} active`} detail="BUY1 / BUY2" tone="amber" />
      </div>
      <div className="allocation-pie-grid">
        <section className="panel allocation-pie-panel">
          <div className="panel-heading">
            <div>
              <h2>Bought Allocation</h2>
              <p className="panel-copy">How the invested capital was originally distributed across active holdings.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={boughtAllocation} dataKey="value" nameKey="name" outerRadius={108} innerRadius={0} paddingAngle={1} label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}>
                {boughtAllocation.map((entry, index) => <Cell fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} key={entry.name} />)}
              </Pie>
              <Tooltip formatter={(value) => money(value, 0)} />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="panel allocation-pie-panel">
          <div className="panel-heading">
            <div>
              <h2>Current Allocation</h2>
              <p className="panel-copy">How the live portfolio value is distributed right now across active holdings.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={currentAllocation} dataKey="value" nameKey="name" outerRadius={108} innerRadius={0} paddingAngle={1} label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}>
                {currentAllocation.map((entry, index) => <Cell fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} key={entry.name} />)}
              </Pie>
              <Tooltip formatter={(value) => money(value, 0)} />
            </PieChart>
          </ResponsiveContainer>
        </section>
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
