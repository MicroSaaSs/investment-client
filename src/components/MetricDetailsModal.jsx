import React from "react";
import {ModalSheet} from "./ModalSheet";
import {money, pct} from "../utils/format";

function SignalBadge({signal}) {
  const normalized = signal || "HOLD";
  return <span className={`signal-pill signal-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function PositionMiniRow({position, mode}) {
  const valueMap = {
    value: `${money(position.current)} · ${Number(position.weight || 0).toFixed(1)}% · ${Number(position.shares || 0).toLocaleString()} sh`,
    invested: `${money(position.invested)} · ${Number(position.shares || 0).toLocaleString()} sh`,
    pnl: `${pct(position.pnlPct)} · ${money((Number(position.current || 0) - Number(position.invested || 0)), 0)}`,
    signal: `${position.signal} · ${money(position.price, 2)} · DD ${pct(position.dd)} · peak ${money(position.peak, 2)}`,
  };

  return (
    <div className={`metric-detail-row metric-detail-row-${mode}`}>
      <div className="metric-detail-company">
        <div className="metric-detail-title">
          <strong>{position.ticker}</strong>
          <SignalBadge signal={position.signal} />
        </div>
        <span>{position.company || "—"}</span>
      </div>
      <div className="metric-detail-value">{valueMap[mode]}</div>
    </div>
  );
}

export function MetricDetailsModal({type, positions, onClose}) {
  const titleMap = {
    value: "Portfolio Value details",
    invested: "Invested capital details",
    pnl: "PnL by ticker",
    signal: "Active signals",
  };
  const subtitleMap = {
    value: "Current value, weight and shares by ticker.",
    invested: "Cost basis and shares count by position.",
    pnl: "Current PnL by open position.",
    signal: "Signal, current price, DD% and peak price used for drawdown calculation.",
  };
  const filtered = type === "signal"
    ? positions.filter((position) => ["BUY1", "BUY2"].includes(position.signal))
    : positions;

  return (
    <ModalSheet title={titleMap[type]} subtitle={subtitleMap[type]} onClose={onClose}>
      <div className="metric-detail-stack">
        {filtered.map((position) => <PositionMiniRow key={position.id || position.ticker} position={position} mode={type} />)}
        {!filtered.length ? <div className="metric-detail-empty">No matching positions right now.</div> : null}
      </div>
    </ModalSheet>
  );
}
