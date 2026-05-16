import React, {useMemo, useState} from "react";
import {ModalSheet} from "./ModalSheet";

const DEFAULT_FORM = {
  ticker: "",
  company: "",
  type: "STOCK",
  targetAllocationPct: "10",
  includeInAllocation: true,
  correctionPct: "-10",
  drawdownPlanPct: "-20",
  peakLookbackMonths: "5",
  volatilityPeriod: "36",
  volatilityInterval: "4",
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
    peakLookbackMonths: String(normalizeMonthsValue(position.peakLookbackMonths, 5)),
    volatilityPeriod: String(normalizeMonthsValue(position.volatilityPeriod, 36)),
    volatilityInterval: String(normalizeMonthsValue(position.volatilityInterval, 4)),
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMonthsValue(value, fallback) {
  const parsed = toNumber(value, fallback);
  if (parsed <= 0) return fallback;
  if (parsed === 150) return 5;
  if (parsed > 120) return Math.max(1, Math.round(parsed / 30));
  return parsed;
}

function sanitizeNumericInput(value, {allowNegative = false, allowDecimal = false} = {}) {
  if (!value) return "";
  let next = String(value).replace(allowDecimal ? /[^0-9.-]/g : /[^0-9-]/g, "");
  if (!allowNegative) next = next.replace(/-/g, "");
  else {
    const negative = next.startsWith("-") ? "-" : "";
    next = negative + next.slice(negative ? 1 : 0).replace(/-/g, "");
  }
  if (allowDecimal) {
    const negative = next.startsWith("-") ? "-" : "";
    const unsigned = negative ? next.slice(1) : next;
    const parts = unsigned.split(".");
    next = negative + parts[0] + (parts.length > 1 ? `.${parts.slice(1).join("")}` : "");
  }
  const negative = next.startsWith("-") ? "-" : "";
  const unsigned = negative ? next.slice(1) : next;
  if (!unsigned) return negative;
  if (unsigned.includes(".")) {
    const [integerPart, decimalPart] = unsigned.split(".");
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
    return `${negative}${normalizedInteger}${decimalPart !== undefined ? `.${decimalPart}` : ""}`;
  }
  return `${negative}${unsigned.replace(/^0+(?=\d)/, "") || "0"}`;
}

export function PositionModal({mode = "create", variant = "position", onClose, onSubmit, position, positions = []}) {
  const [form, setForm] = useState(buildForm(position));
  const isWatchlist = variant === "watchlist";
  const [allocationTargets, setAllocationTargets] = useState(() =>
    Object.fromEntries(
      positions
        .filter((item) => item.id !== position?.id && item.includeInAllocation)
        .map((item) => [item.id, String(toNumber(item.targetAllocationPct ?? item.target, 0))])
    )
  );

  const allocation = useMemo(() => {
    const otherIncluded = positions.filter((item) => item.id !== position?.id && item.includeInAllocation);
    const rows = otherIncluded.map((item) => ({
      id: item.id,
      ticker: item.ticker,
      target: toNumber(allocationTargets[item.id] ?? item.targetAllocationPct ?? item.target, 0),
      rawValue: allocationTargets[item.id] ?? String(toNumber(item.targetAllocationPct ?? item.target, 0)),
      position: item,
    }));
    const otherTotal = rows.reduce((sum, item) => sum + item.target, 0);
    const currentTarget = form.includeInAllocation ? toNumber(form.targetAllocationPct, 0) : 0;
    const total = otherTotal + currentTarget;
    const remaining = 100 - total;
    const valid = !form.includeInAllocation || Math.abs(remaining) < 0.01;
    return {
      rows,
      total,
      remaining,
      valid,
    };
  }, [allocationTargets, form.includeInAllocation, form.targetAllocationPct, position?.id, positions]);

  const volatilityValidation = useMemo(() => {
    const period = toNumber(form.volatilityPeriod, 0);
    const interval = toNumber(form.volatilityInterval, 0);
    if (period <= 0 || interval <= 0) {
      return {valid: false, message: "Volatility period and interval must be greater than 0."};
    }
    if (interval > period) {
      return {valid: false, message: "Volatility interval cannot be greater than volatility period."};
    }
    if (period % interval !== 0) {
      return {valid: false, message: "Volatility period must be divisible by volatility interval."};
    }
    if ((period / interval) > 12) {
      return {valid: false, message: "Volatility setup supports up to 12 intervals."};
    }
    return {valid: true, message: ""};
  }, [form.volatilityInterval, form.volatilityPeriod]);

  function update(key, value) {
    setForm((current) => ({...current, [key]: value}));
  }

  function updateNumericField(key, value, options) {
    update(key, sanitizeNumericInput(value, options));
  }

  function updateAllocationTarget(id, value) {
    setAllocationTargets((current) => ({
      ...current,
      [id]: sanitizeNumericInput(value, {allowDecimal: true}),
    }));
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
    if (!form.ticker.trim() || (!isWatchlist && !allocation.valid) || !volatilityValidation.valid) return;
    onSubmit({
      id: position?.id,
      ticker: form.ticker.trim().toUpperCase(),
      company: form.company.trim(),
      type: form.type,
      mode: isWatchlist ? "WATCHLIST" : "ACTIVE",
      targetAllocationPct: isWatchlist ? 0 : Number(form.targetAllocationPct || 0),
      includeInAllocation: isWatchlist ? false : form.includeInAllocation,
      correctionPct: isWatchlist ? -10 : Number(form.correctionPct || 0),
      drawdownPlanPct: isWatchlist ? -20 : Number(form.drawdownPlanPct || 0),
      peakLookbackMonths: Number(form.peakLookbackMonths || 5),
      volatilityPeriod: Number(form.volatilityPeriod || 36),
      volatilityInterval: Number(form.volatilityInterval || 4),
      allocationAdjustments: isWatchlist ? [] : allocation.rows.map((row) => ({
        id: row.id,
        targetAllocationPct: row.target,
      })),
    });
  }

  return (
    <ModalSheet title={isWatchlist ? "Watch list item" : mode === "edit" ? "Position settings" : "Position setup"} subtitle={isWatchlist ? "Add a ticker to monitor its price, peak pressure, and volatility before it joins the portfolio." : mode === "edit" ? "Refine allocation, peak lookback, and risk thresholds for an existing holding." : "Add a position with its target allocation, peak lookback, and correction thresholds."} onClose={onClose}>
      <form className="modal-form modal-grid" onSubmit={handleSubmit}>
        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Position identity</p>
            <h4>Define the holding</h4>
          </div>
          <div className="modal-grid modal-grid-identity">
            <label>
              <span>Ticker</span>
              <input autoFocus disabled={mode === "edit"} placeholder="NVDA" value={form.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} />
            </label>
            <label>
              <span>Company</span>
              <input placeholder="Company Name" value={form.company} onChange={(e) => update("company", e.target.value)} />
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

        {!isWatchlist ? (
        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Risk settings</p>
            <h4>Target and volatility controls</h4>
            <p className="risk-grid-note">Set when signals should trigger and how far back risk should be measured.</p>
          </div>
          <div className="risk-grid">
            <label className="risk-grid-row1">
              <span>Target allocation</span>
              <div className="input-unit-wrap">
                <input inputMode="decimal" value={form.targetAllocationPct} onChange={(e) => updateNumericField("targetAllocationPct", e.target.value, {allowDecimal: true})} />
                <i>%</i>
              </div>
            </label>
            <label className="risk-grid-row1">
              <span>Correction trigger</span>
              <div className="input-unit-wrap">
                <input inputMode="decimal" value={form.correctionPct} onChange={(e) => updateNumericField("correctionPct", e.target.value, {allowNegative: true, allowDecimal: true})} />
                <i>%</i>
              </div>
            </label>
            <label className="risk-grid-row1">
              <span>Drawdown trigger</span>
              <div className="input-unit-wrap">
                <input inputMode="decimal" value={form.drawdownPlanPct} onChange={(e) => updateNumericField("drawdownPlanPct", e.target.value, {allowNegative: true, allowDecimal: true})} />
                <i>%</i>
              </div>
            </label>
            <label className="risk-grid-row2">
              <span>Peak window</span>
              <div className="input-unit-wrap">
                <input inputMode="numeric" value={form.peakLookbackMonths} onChange={(e) => updateNumericField("peakLookbackMonths", e.target.value)} />
                <i>mo</i>
              </div>
            </label>
            <label className="risk-grid-row2">
              <span>Volatility window</span>
              <div className="input-unit-wrap">
                <input inputMode="numeric" value={form.volatilityPeriod} onChange={(e) => updateNumericField("volatilityPeriod", e.target.value)} />
                <i>mo</i>
              </div>
            </label>
            <label className="risk-grid-row2">
              <span>Step size</span>
              <div className="input-unit-wrap">
                <select value={form.volatilityInterval} onChange={(e) => update("volatilityInterval", e.target.value)}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="12">12</option>
                </select>
                <i>mo</i>
              </div>
            </label>
          </div>
        </div>
        ) : null}

        {!isWatchlist ? <label className="checkbox-row modal-actions-wide">
          <span>
            <b>Include in allocation</b>
            <small>{form.type === "STOCK" ? "Included positions must sum to exactly 100%." : "Cash positions stay outside the target model by default."}</small>
          </span>
          <input checked={form.includeInAllocation} disabled={form.type !== "STOCK"} onChange={(e) => update("includeInAllocation", e.target.checked)} type="checkbox" />
        </label> : null}
        {!isWatchlist ? <div className="allocation-card modal-actions-wide">
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
                <div className="allocation-row-input">
                  <input inputMode="decimal" value={row.rawValue} onChange={(e) => updateAllocationTarget(row.id, e.target.value)} />
                  <strong>%</strong>
                </div>
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
        </div> : null}
        {!isWatchlist && !allocation.valid ? (
          <div className="validation-banner modal-actions-wide">
            Save is disabled until all included target allocations sum to exactly 100%.
          </div>
        ) : null}
        {!volatilityValidation.valid ? (
          <div className="validation-banner modal-actions-wide">
            {volatilityValidation.message}
          </div>
        ) : null}
        <div className="modal-actions modal-actions-wide">
          <button className="ghost" onClick={onClose} type="button">Cancel</button>
          <button className="primary" disabled={(!isWatchlist && !allocation.valid) || !volatilityValidation.valid} type="submit">{isWatchlist ? "Save watch item" : mode === "edit" ? "Save changes" : "Save position"}</button>
        </div>
      </form>
    </ModalSheet>
  );
}
