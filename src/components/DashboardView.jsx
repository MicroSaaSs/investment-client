import React from "react";
import {Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {compactMoney, money, pct} from "../utils/format";
import {MetricDetailsModal} from "./MetricDetailsModal";

const ALLOCATION_COLORS = ["#4f83bf", "#c3504c", "#9dbc59", "#8366aa", "#4ea7c1", "#fe9640", "#7ea1cc", "#d48383"];
const EQUITY_RANGES = [
  {value: "week", label: "Week"},
  {value: "2w", label: "2 weeks"},
  {value: "month", label: "Month"},
  {value: "3m", label: "3 months"},
  {value: "6m", label: "6 months"},
  {value: "year", label: "Year"},
  {value: "all", label: "All time"},
];
const EQUITY_MODES = [
  {value: "daily", label: "Daily"},
  {value: "monthly", label: "Monthly"},
];

function renderOuterNameLabel({cx, cy, midAngle, outerRadius, name, percent, chartWidth, compact}) {
  if (!name || !percent || percent <= 0) return null;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sidePadding = compact ? 10 : 16;
  const lineSpan = compact ? 56 : 86;
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + (compact ? 14 : 22)) * cos;
  const my = cy + (outerRadius + (compact ? 18 : 28)) * sin;
  const rawEx = mx + (cos >= 0 ? lineSpan : -lineSpan);
  const ex = compact ? Math.max(sidePadding, Math.min(chartWidth - sidePadding, rawEx)) : rawEx;
  const ey = my;
  const textAnchor = compact ? "start" : (cos >= 0 ? "start" : "end");
  const rawTextX = ex + (cos >= 0 ? 4 : -4);
  const textX = compact
    ? (cos >= 0 ? Math.min(chartWidth - sidePadding, ex + 4) : Math.max(sidePadding, ex + 4))
    : rawTextX;
  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#9aaccc" fill="none" />
      <circle cx={sx} cy={sy} r={2} fill="#9aaccc" />
      <text x={textX} y={ey} textAnchor={textAnchor} fill="#52658a">
        <tspan x={textX} dy="0" fontSize={12} fontWeight={600}>{name}</tspan>
        <tspan x={textX} dy="15" fontSize={12}>{`${(percent * 100).toFixed(1)}%`}</tspan>
      </text>
    </g>
  );
}

function AllocationPie({items}) {
  const [compactLabels, setCompactLabels] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setCompactLabels(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);
  if (!items.length) return <div className="allocation-legend-empty">No active allocation data.</div>;
  const labelRenderer = (props) => renderOuterNameLabel({
    ...props,
    chartWidth: compactLabels ? 300 : 360,
    compact: compactLabels,
  });
  return (
    <ResponsiveContainer width="100%" height={compactLabels ? 320 : 360}>
      <PieChart>
        <Pie
          data={items}
          dataKey="value"
          nameKey="name"
          outerRadius={compactLabels ? 96 : 126}
          innerRadius={0}
          paddingAngle={0}
          label={labelRenderer}
          labelLine={false}
          cx="50%"
          cy={compactLabels ? "56%" : "52%"}
          isAnimationActive={false}
        >
          {items.map((entry, index) => <Cell fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} key={entry.name} />)}
        </Pie>
        <Tooltip formatter={(value) => money(value, 0)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function MetricCard({label, value, detail, tone = "default", onClick}) {
  return (
    <button className={`metric-card metric-card-${tone}`} onClick={onClick} type="button">
      <p>{label}</p>
      <h3>{value}</h3>
      {detail ? <span>{detail}</span> : null}
      <small>tap</small>
    </button>
  );
}

function EquityTooltip({active, label, payload}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload || {};
  const value = Number(point.value || 0);
  const invested = Number(point.invested || 0);
  const cash = Number(point.cash || 0);
  const marketValue = Number(point.marketValue || 0);
  const pnl = Number((point.totalPnl ?? (value - invested)) || 0);
  const pnlPct = invested > 0 ? pnl / invested : 0;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>Capital: {money(value)}</span>
      <span>Invested: {money(invested)}</span>
      <span>Cash: {money(cash)}</span>
      <span>Market value: {money(marketValue)}</span>
      <span>PnL: {money(pnl)} / {pct(pnlPct * 100)}</span>
    </div>
  );
}

export function DashboardView({metrics, equityHistory, equityRange, equityMode, onEquityRangeChange, onEquityModeChange}) {
  const [detailModal, setDetailModal] = React.useState(null);
  if (!metrics) return null;
  const equityPoints = equityHistory?.points || [];
  const latestPnl = Number(equityHistory?.totalPnl ?? metrics?.pnl ?? 0);
  const pnlStroke = latestPnl < 0 ? "#c3504c" : "#2f9961";
  const detailPositions = (metrics.positions || []).filter((position) => position.mode !== "WATCHLIST");
  const activePositions = detailPositions.filter((position) => position.includeInAllocation);
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
      {detailModal ? <MetricDetailsModal onClose={() => setDetailModal(null)} positions={detailPositions} type={detailModal} /> : null}
      <div className="metric-grid">
        <MetricCard label="Portfolio Value" value={compactMoney(metrics.totalValue)} detail="Current value" onClick={() => setDetailModal("value")} tone="blue" />
        <MetricCard label="Invested" value={compactMoney(metrics.invested)} detail="Cost basis" onClick={() => setDetailModal("invested")} />
        <MetricCard label="PnL" value={`${compactMoney(metrics.pnl)} / ${pct(metrics.pnlPct)}`} detail="Portfolio result" onClick={() => setDetailModal("pnl")} tone="green" />
        <MetricCard label="Signals" value={`${String(metrics.activeSignals)} active`} detail="BUY1 / BUY2" onClick={() => setDetailModal("signal")} tone="amber" />
      </div>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Capital Curve</h2>
            <p className="panel-copy">Daily portfolio capital rebuilt from transactions and market prices.</p>
            <div className="chart-legend" aria-label="Capital curve legend">
              <span className="chart-legend-item">
                <i className="chart-legend-swatch chart-legend-swatch-value" />
                Capital
              </span>
              <span className="chart-legend-item">
                <i className="chart-legend-swatch chart-legend-swatch-invested" />
                Invested
              </span>
              <span className="chart-legend-item">
                <i className={`chart-legend-swatch ${latestPnl < 0 ? "chart-legend-swatch-pnl-down" : "chart-legend-swatch-pnl-up"}`} />
                PnL
              </span>
            </div>
          </div>
          <div className="chart-controls">
            <select onChange={(event) => onEquityRangeChange(event.target.value)} value={equityRange}>
              {EQUITY_RANGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select onChange={(event) => onEquityModeChange(event.target.value)} value={equityMode}>
              {EQUITY_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={equityPoints} margin={{left: -18, right: 8, top: 8, bottom: 0}}>
            <defs>
              <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f7cc0" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#2f7cc0" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#d7e1ef" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} tickLine={false} axisLine={false} tickMargin={8} width={52} />
            <YAxis yAxisId="pnl" orientation="right" hide domain={["auto", "auto"]} />
            <Tooltip content={<EquityTooltip />} cursor={{stroke: "#d7e1ef", strokeWidth: 2}} />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="#7b95b8"
              strokeDasharray="6 6"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <Line
              yAxisId="pnl"
              type="monotone"
              dataKey="totalPnl"
              stroke={pnlStroke}
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <Area activeDot={{r: 6, fill: "#2f7cc0", stroke: "#ffffff", strokeWidth: 3}} dataKey="value" stroke="#2f7cc0" fill="url(#equityGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <div className="allocation-pie-grid">
        <section className="panel allocation-pie-panel">
          <div className="panel-heading">
            <div>
              <h2>Bought Allocation</h2>
              <p className="panel-copy">How the invested capital was originally distributed across active holdings.</p>
            </div>
          </div>
          <div className="allocation-pie-layout">
            <div className="allocation-pie-chart">
              <AllocationPie items={boughtAllocation} />
            </div>
          </div>
        </section>
        <section className="panel allocation-pie-panel">
          <div className="panel-heading">
            <div>
              <h2>Current Allocation</h2>
              <p className="panel-copy">How the live portfolio value is distributed right now across active holdings.</p>
            </div>
          </div>
          <div className="allocation-pie-layout">
            <div className="allocation-pie-chart">
              <AllocationPie items={currentAllocation} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
