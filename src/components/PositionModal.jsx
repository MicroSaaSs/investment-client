import React, {useMemo, useState} from "react";
import {ModalSheet} from "./ModalSheet";

const DEFAULT_FORM = {
  ticker: "",
  company: "",
  type: "STOCK",
  targetAllocationPct: "0",
  includeInAllocation: true,
  correctionPct: "-10",
  drawdownPlanPct: "-20",
  volatilityPeriod: "360",
  volatilityInterval: "90",
};

function buildForm(position) {
  if (!position) return DEFAULT_FORM;
  return {
    ticker: position.ticker || "",
    company: position.company || "",
    type: position.type || "STOCK",
    targetAllocationPct: String(position.targetAllocationPct ?? position.target ?? 0),
    includeInAllocation: Boolean(position.includeInAllocation),
    correctionPct: String(position.correctionPct ?? position.corr ?? -10),
    drawdownPlanPct: String(position.drawdownPlanPct ?? position.ddPlan ?? -20),
    volatilityPeriod: String(position.volatilityPeriod ?? 360),
    volatilityInterval: String(position.volatilityInterval ?? "90"),
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PositionModal({mode = "create", onClose, onSubmit, position, positions = []}) {
  const [form, setForm] = useState(buildForm(position));

  const allocation = useMemo(() => {
    const otherIncluded = positions.filter((item) => item.id !== position?.id && item.includeInAllocation);
    const otherTotal = otherIncluded.reduce((sum, item) => sum + toNumber(item.targetAllocationPct ?? item.target, 0), 0);
    const currentTarget = form.includeInAllocation ? toNumber(form.targetAllocationPct, 0) : 0;
    const total = otherTotal + currentTarget;
    const remaining = 100 - total;
    const valid = !form.includeInAllocation || Math.abs(remaining) < 0.01;
    return {
      rows: otherIncluded.map((item) => ({
        id: item.id,
        ticker: item.ticker,
        target: toNumber(item.targetAllocationPct ?? item.target, 0),
      })),
      total,
      remaining,
      valid,
    };
  }, [form.includeInAllocation, form.targetAllocationPct, position?.id, positions]);

  function update(key, value) {
    setForm((current) => ({...current, [key]: value}));
  }

  function handleTypeChange(value) {
    setForm((current) => {
      const next = {...current, type: value};
      if (value === "CASH") {
        if (!next.ticker.trim()) next.ticker = "CASH-USD";
        if (!next.company.trim()) next.company = "Uninvested cash";
        next.includeInAllocation = false;
      } else if (value === "CASH_ETF") {
        if (!next.ticker.trim()) next.ticker = "SHV";
        if (!next.company.trim()) next.company = "Cash / Treasury ETF";
        next.includeInAllocation = false;
      }
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.ticker.trim() || !allocation.valid) return;
    onSubmit({
      id: position?.id,
      ticker: form.ticker.trim().toUpperCase(),
      company: form.company.trim(),
      type: form.type,
      targetAllocationPct: Number(form.targetAllocationPct || 0),
      includeInAllocation: form.includeInAllocation,
      correctionPct: Number(form.correctionPct || 0),
      drawdownPlanPct: Number(form.drawdownPlanPct || 0),
      volatilityPeriod: Number(form.volatilityPeriod || 360),
      volatilityInterval: String(form.volatilityInterval || "90"),
    });
  }

  return (
    <ModalSheet title={mode === "edit" ? "Position settings" : "Position setup"} subtitle={mode === "edit" ? "Refine allocation and thresholds for an existing holding." : "Add a position with its target allocation and correction thresholds."} onClose={onClose}>
      <form className="modal-form modal-grid" onSubmit={handleSubmit}>
        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Position identity</p>
            <h4>Define the holding</h4>
          </div>
          <div className="modal-grid">
            <label>
              <span>Ticker</span>
              <input autoFocus disabled={mode === "edit"} placeholder="NVDA" value={form.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} />
            </label>
            <label>
              <span>Company</span>
              <input placeholder="Palantir Technologies" value={form.company} onChange={(e) => update("company", e.target.value)} />
            </label>
            <label>
              <span>Type</span>
              <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                <option value="STOCK">Stock</option>
                <option value="CASH_ETF">Cash ETF</option>
                <option value="CASH">Cash bucket</option>
              </select>
            </label>
          </div>
        </div>

        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Risk settings</p>
            <h4>Target and volatility controls</h4>
          </div>
          <div className="risk-grid">
            <label className="risk-grid-row1">
              <span>Target %</span>
              <input inputMode="decimal" value={form.targetAllocationPct} onChange={(e) => update("targetAllocationPct", e.target.value)} />
            </label>
            <label className="risk-grid-row1">
              <span>Correction %</span>
              <input inputMode="decimal" value={form.correctionPct} onChange={(e) => update("correctionPct", e.target.value)} />
            </label>
            <label className="risk-grid-row1">
              <span>Drawdown plan %</span>
              <input inputMode="decimal" value={form.drawdownPlanPct} onChange={(e) => update("drawdownPlanPct", e.target.value)} />
            </label>
            <label className="risk-grid-row2">
              <span>Volatility period days</span>
              <input inputMode="numeric" value={form.volatilityPeriod} onChange={(e) => update("volatilityPeriod", e.target.value)} />
            </label>
            <label className="risk-grid-row2">
              <span>Volatility interval</span>
              <select value={form.volatilityInterval} onChange={(e) => update("volatilityInterval", e.target.value)}>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="90">90</option>
                <option value="120">120</option>
                <option value="180">180</option>
                <option value="360">360</option>
              </select>
            </label>
          </div>
        </div>

        <label className="checkbox-row modal-actions-wide">
          <span>
            <b>Include in allocation</b>
            <small>{form.type === "STOCK" ? "Included positions must sum to exactly 100%." : "Cash positions stay outside the target model by default."}</small>
          </span>
          <input checked={form.includeInAllocation} disabled={form.type !== "STOCK"} onChange={(e) => update("includeInAllocation", e.target.checked)} type="checkbox" />
        </label>
        <div className="allocation-card modal-actions-wide">
          <div className="allocation-card-top">
            <div>
              <p className="modal-kicker">Target allocation</p>
              <h4>{allocation.total.toFixed(2)}%</h4>
            </div>
            <div className={`allocation-pill ${allocation.valid ? "is-valid" : "is-invalid"}`}>
              {allocation.valid ? "Ready to save" : `${allocation.remaining > 0 ? "+" : ""}${allocation.remaining.toFixed(2)}% to 100`}
            </div>
          </div>
          <div className="allocation-rows">
            {allocation.rows.map((row) => (
              <div className="allocation-row" key={row.id}>
                <span>{row.ticker}</span>
                <strong>{row.target.toFixed(2)}%</strong>
              </div>
            ))}
            {form.includeInAllocation ? (
              <div className="allocation-row allocation-row-current">
                <span>{form.ticker.trim().toUpperCase() || "CURRENT POSITION"}</span>
                <strong>{toNumber(form.targetAllocationPct, 0).toFixed(2)}%</strong>
              </div>
            ) : (
              <div className="allocation-note">This position will stay outside the 100% target model.</div>
            )}
          </div>
        </div>
        {!allocation.valid ? (
          <div className="validation-banner modal-actions-wide">
            Save is disabled until all included target allocations sum to exactly 100%.
          </div>
        ) : null}
        <div className="modal-actions modal-actions-wide">
          <button className="ghost" onClick={onClose} type="button">Cancel</button>
          <button className="primary" disabled={!allocation.valid} type="submit">{mode === "edit" ? "Save changes" : "Save position"}</button>
        </div>
      </form>
    </ModalSheet>
  );
}
