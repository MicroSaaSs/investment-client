import React from "react";
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
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

function interpolateCrossing(prevValue, nextValue, prevThreshold, nextThreshold) {
  const prevDelta = prevValue - prevThreshold;
  const nextDelta = nextValue - nextThreshold;
  const denominator = prevDelta - nextDelta;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) return null;
  const ratio = prevDelta / denominator;
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) return null;
  return ratio;
}

function normalizeEquityPoints(points) {
  return (points || []).map((point, index) => ({
    ...point,
    chartIndex: index,
    value: Number(point?.value || 0),
    invested: Number(point?.invested || 0),
    cash: Number(point?.cash || 0),
    marketValue: Number(point?.marketValue || 0),
    totalPnl: Number(point?.totalPnl ?? (Number(point?.value || 0) - Number(point?.invested || 0)) || 0),
  }));
}

function buildEquityTicks(points, maxTicks = 8) {
  if (!points?.length) return [];
  if (points.length <= maxTicks) return points.map((_, index) => index);
  const step = Math.max(1, Math.floor((points.length - 1) / (maxTicks - 1)));
  const ticks = [];
  for (let index = 0; index < points.length; index += step) {
    ticks.push(index);
  }
  const lastIndex = points.length - 1;
  if (ticks[ticks.length - 1] !== lastIndex) ticks.push(lastIndex);
  return ticks;
}

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

const CapitalCurveChart = React.memo(function CapitalCurveChart({
  points,
  equityTicks,
  capitalStroke,
}) {
  const wrapperRef = React.useRef(null);
  const [size, setSize] = React.useState({width: 0, height: 320});
  const [hoverIndex, setHoverIndex] = React.useState(null);

  React.useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : {width: nextWidth, height: nextHeight}
      ));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const chart = React.useMemo(() => {
    const width = size.width || 0;
    const height = size.height || 320;
    const margin = {top: 8, right: 12, bottom: 34, left: 56};
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);
    const maxCapital = Math.max(...points.map((point) => Math.max(point.value, point.invested)), 0);
    const capitalMax = maxCapital <= 0 ? 1 : maxCapital * 1.05;
    const pnlValues = points.map((point) => point.totalPnl);
    const rawPnlMin = Math.min(...pnlValues, 0);
    const rawPnlMax = Math.max(...pnlValues, 0);
    const pnlPadding = Math.max((rawPnlMax - rawPnlMin) * 0.08, 1);
    const pnlMin = rawPnlMin - pnlPadding;
    const pnlMax = rawPnlMax + pnlPadding;
    const xForIndex = (index) => {
      if (points.length <= 1) return margin.left;
      return margin.left + (innerWidth * index) / (points.length - 1);
    };
    const yForCapital = (value) => margin.top + innerHeight - (Math.max(0, value) / capitalMax) * innerHeight;
    const yForPnl = (value) => {
      if (pnlMax === pnlMin) return margin.top + innerHeight / 2;
      return margin.top + innerHeight - ((value - pnlMin) / (pnlMax - pnlMin)) * innerHeight;
    };
    const yTicks = Array.from({length: 5}, (_, index) => {
      const value = (capitalMax / 4) * (4 - index);
      return {value, y: yForCapital(value)};
    });
    const areaPath = points.length
      ? [
          `M ${xForIndex(0)} ${yForCapital(points[0].value)}`,
          ...points.slice(1).map((point) => `L ${xForIndex(point.chartIndex)} ${yForCapital(point.value)}`),
          `L ${xForIndex(points[points.length - 1].chartIndex)} ${margin.top + innerHeight}`,
          `L ${xForIndex(0)} ${margin.top + innerHeight}`,
          "Z",
        ].join(" ")
      : "";
    const investedPath = points.length
      ? [
          `M ${xForIndex(0)} ${yForCapital(points[0].invested)}`,
          ...points.slice(1).map((point) => `L ${xForIndex(point.chartIndex)} ${yForCapital(point.invested)}`),
        ].join(" ")
      : "";

    const buildSegments = (valueSelector, thresholdSelector, ySelector, positiveColor, negativeColor) => {
      const segments = [];
      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const currentValue = valueSelector(current);
        const nextValue = valueSelector(next);
        const currentThreshold = thresholdSelector(current);
        const nextThreshold = thresholdSelector(next);
        const currentDelta = currentValue - currentThreshold;
        const nextDelta = nextValue - nextThreshold;
        const x1 = xForIndex(current.chartIndex);
        const y1 = ySelector(currentValue);
        const x2 = xForIndex(next.chartIndex);
        const y2 = ySelector(nextValue);

        if ((currentDelta >= 0 && nextDelta >= 0) || (currentDelta <= 0 && nextDelta <= 0)) {
          segments.push({
            x1,
            y1,
            x2,
            y2,
            stroke: currentDelta >= 0 ? positiveColor : negativeColor,
          });
          continue;
        }

        const ratio = interpolateCrossing(currentValue, nextValue, currentThreshold, nextThreshold);
        if (ratio == null) {
          segments.push({
            x1,
            y1,
            x2,
            y2,
            stroke: currentDelta >= 0 ? positiveColor : negativeColor,
          });
          continue;
        }

        const crossX = x1 + (x2 - x1) * ratio;
        const crossY = y1 + (y2 - y1) * ratio;
        segments.push({
          x1,
          y1,
          x2: crossX,
          y2: crossY,
          stroke: currentDelta >= 0 ? positiveColor : negativeColor,
        });
        segments.push({
          x1: crossX,
          y1: crossY,
          x2,
          y2,
          stroke: nextDelta >= 0 ? positiveColor : negativeColor,
        });
      }
      return segments;
    };

    return {
      margin,
      innerWidth,
      innerHeight,
      yTicks,
      areaPath,
      investedPath,
      capitalSegments: buildSegments((point) => point.value, (point) => point.invested, yForCapital, "#2f7cc0", "#c3504c"),
      pnlSegments: buildSegments((point) => point.totalPnl, () => 0, yForPnl, "#2f9961", "#c3504c"),
      xForIndex,
      yForCapital,
    };
  }, [points, size]);

  const hoveredPoint = hoverIndex == null ? null : points[hoverIndex] || null;
  const hoveredCapitalX = hoveredPoint ? chart.xForIndex(hoveredPoint.chartIndex) : null;
  const hoveredCapitalY = hoveredPoint ? chart.yForCapital(hoveredPoint.value) : null;
  const tooltipStyle = hoveredPoint && hoveredCapitalX != null ? {
    position: "absolute",
    left: Math.min(Math.max(12, hoveredCapitalX + 14), Math.max(12, size.width - 210)),
    top: Math.max(12, hoveredCapitalY - 18),
    pointerEvents: "none",
  } : null;

  const handlePointerMove = React.useCallback((event) => {
    if (!wrapperRef.current || !points.length) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left - chart.margin.left;
    const safeWidth = Math.max(1, chart.innerWidth);
    const ratio = Math.min(1, Math.max(0, relativeX / safeWidth));
    const nextIndex = Math.round(ratio * (points.length - 1));
    setHoverIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [chart.innerWidth, chart.margin.left, points.length]);

  const handlePointerLeave = React.useCallback(() => setHoverIndex(null), []);

  return (
    <div ref={wrapperRef} style={{position: "relative", width: "100%", height: 320}}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 320)}`}
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f7cc0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2f7cc0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={chart.margin.left}
              x2={chart.margin.left + chart.innerWidth}
              y1={tick.y}
              y2={tick.y}
              stroke="#d7e1ef"
              strokeDasharray="4 5"
            />
            <text x={chart.margin.left - 8} y={tick.y + 4} textAnchor="end" fill="#61769a" fontSize="12">
              {`$${Math.round(tick.value / 1000)}K`}
            </text>
          </g>
        ))}
        {equityTicks.map((tickIndex) => {
          const point = points[tickIndex];
          if (!point) return null;
          return (
            <text
              key={point.chartIndex}
              x={chart.xForIndex(point.chartIndex)}
              y={chart.margin.top + chart.innerHeight + 24}
              textAnchor={tickIndex === 0 ? "start" : tickIndex === equityTicks[equityTicks.length - 1] ? "end" : "middle"}
              fill="#61769a"
              fontSize="12"
            >
              {point.day}
            </text>
          );
        })}
        {chart.areaPath ? <path d={chart.areaPath} fill="url(#equityGradient)" stroke="none" /> : null}
        {chart.investedPath ? (
          <path
            d={chart.investedPath}
            fill="none"
            stroke="#7b95b8"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {chart.capitalSegments.map((segment, index) => (
          <line
            key={`capital-${index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={segment.stroke}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {chart.pnlSegments.map((segment, index) => (
          <line
            key={`pnl-${index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={segment.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
        {hoveredPoint && hoveredCapitalX != null ? (
          <>
            <line
              x1={hoveredCapitalX}
              x2={hoveredCapitalX}
              y1={chart.margin.top}
              y2={chart.margin.top + chart.innerHeight}
              stroke="#d7e1ef"
              strokeWidth="2"
            />
            <circle cx={hoveredCapitalX} cy={hoveredCapitalY} r="6" fill={capitalStroke} stroke="#ffffff" strokeWidth="3" />
          </>
        ) : null}
      </svg>
      {hoveredPoint && tooltipStyle ? (
        <div className="chart-tooltip" style={tooltipStyle}>
          <strong>{hoveredPoint.day}</strong>
          <span>Capital: {money(hoveredPoint.value)}</span>
          <span>Invested: {money(hoveredPoint.invested)}</span>
          <span>Cash: {money(hoveredPoint.cash)}</span>
          <span>Market value: {money(hoveredPoint.marketValue)}</span>
          <span>PnL: {money(hoveredPoint.totalPnl)} / {pct((hoveredPoint.invested > 0 ? hoveredPoint.totalPnl / hoveredPoint.invested : 0) * 100)}</span>
        </div>
      ) : null}
    </div>
  );
});

export function DashboardView({metrics, equityHistory, equityRange, equityMode, onEquityRangeChange, onEquityModeChange}) {
  const [detailModal, setDetailModal] = React.useState(null);
  const rawEquityPoints = React.useMemo(() => normalizeEquityPoints(equityHistory?.points || []), [equityHistory?.points]);
  const latestPnl = Number(equityHistory?.totalPnl ?? metrics?.pnl ?? 0);
  const equityTicks = React.useMemo(() => buildEquityTicks(rawEquityPoints, 9), [rawEquityPoints]);
  const pnlStroke = latestPnl < 0 ? "#c3504c" : "#2f9961";
  const capitalStroke = Number(metrics?.totalValue || 0) < Number(metrics?.invested || 0) ? "#c3504c" : "#2f7cc0";
  const detailPositions = React.useMemo(
    () => (metrics?.positions || []).filter((position) => position.mode !== "WATCHLIST"),
    [metrics?.positions]
  );
  const activePositions = React.useMemo(
    () => detailPositions.filter((position) => position.includeInAllocation),
    [detailPositions]
  );
  const boughtAllocation = React.useMemo(
    () => activePositions.filter((position) => position.invested > 0).map((position) => ({
      name: position.ticker,
      value: position.invested,
    })),
    [activePositions]
  );
  const currentAllocation = React.useMemo(
    () => activePositions.filter((position) => position.current > 0).map((position) => ({
      name: position.ticker,
      value: position.current,
    })),
    [activePositions]
  );
  if (!metrics) return null;

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
                <i className={`chart-legend-swatch ${capitalStroke === "#c3504c" ? "chart-legend-swatch-pnl-down" : "chart-legend-swatch-value"}`} />
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
        <CapitalCurveChart
          points={rawEquityPoints}
          equityTicks={equityTicks}
          capitalStroke={capitalStroke}
        />
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
