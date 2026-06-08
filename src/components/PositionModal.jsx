import React, {useEffect, useMemo, useState} from "react";
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
  avgDrawdownPeriod: "36",
  avgDrawdownInterval: "4",
};

const CASH_TICKER_DEFAULT = "CASH-USD";
const CASH_COMPANY_DEFAULT = "Uninvested cash";
const CASH_ETF_TICKER_DEFAULT = "SHV";
const CASH_ETF_COMPANY_DEFAULT = "Cash / Treasury ETF";

function isCashEquivalent(type) {
  return type === "CASH" || type === "CASH_ETF";
}

function isTypeDefaultValue(type, ticker, company) {
  const normalizedTicker = (ticker || "").trim().toUpperCase();
  const normalizedCompany = (company || "").trim();
  if (type === "CASH") {
    return normalizedTicker === CASH_TICKER_DEFAULT && normalizedCompany === CASH_COMPANY_DEFAULT;
  }
  if (type === "CASH_ETF") {
    return normalizedTicker === CASH_ETF_TICKER_DEFAULT && normalizedCompany === CASH_ETF_COMPANY_DEFAULT;
  }
  return false;
}

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
    avgDrawdownPeriod: String(normalizeMonthsValue(position.avgDrawdownPeriod, 36)),
    avgDrawdownInterval: String(normalizeMonthsValue(position.avgDrawdownInterval, 4)),
  };
}

function buildAllocationTargets(position, positions) {
  return Object.fromEntries(
    positions
      .filter((item) => item.id !== position?.id && item.includeInAllocation)
      .map((item) => [item.id, String(toNumber(item.targetAllocationPct ?? item.target, 0))])
  );
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function closeEnough(left, right) {
  return Math.abs(Number(left || 0) - Number(right || 0)) < 0.0001;
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

export function PositionModal({
  mode = "create",
  variant = "position",
  onClose,
  onSubmit,
  position,
  positions = [],
  portfolioOptions = [],
  positionsByPortfolio = null,
  defaultPortfolioId = "",
  portfolioLocked = false,
}) {
  const isWatchlist = variant === "watchlist";
  const showPortfolioSelector = portfolioOptions.length > 0;
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(position?.portfolioId || position?.portfolioContextId || defaultPortfolioId || portfolioOptions[0]?.id || "");
  const scopedPositions = useMemo(() => {
    if (!positionsByPortfolio) return positions;
    return positionsByPortfolio[selectedPortfolioId] || [];
  }, [positions, positionsByPortfolio, selectedPortfolioId]);
  const editablePositions = useMemo(
    () => scopedPositions.filter((item) => (item.mode || "ACTIVE") !== "WATCHLIST"),
    [scopedPositions]
  );
  const [editorMode, setEditorMode] = useState(!isWatchlist && mode === "edit" ? "edit" : "add");
  const [selectedPositionId, setSelectedPositionId] = useState(position?.id || editablePositions[0]?.id || "");
  const activePosition = useMemo(() => {
    if (isWatchlist || editorMode !== "edit") return position || null;
    return editablePositions.find((item) => item.id === selectedPositionId) || null;
  }, [editablePositions, editorMode, isWatchlist, position, selectedPositionId]);
  const [form, setForm] = useState(buildForm(activePosition));
  const [allocationTargets, setAllocationTargets] = useState(() => buildAllocationTargets(activePosition, scopedPositions));

  useEffect(() => {
    setEditorMode(!isWatchlist && mode === "edit" ? "edit" : "add");
  }, [isWatchlist, mode]);

  useEffect(() => {
    const fallbackPortfolioId = position?.portfolioId || position?.portfolioContextId || defaultPortfolioId || portfolioOptions[0]?.id || "";
    if (!fallbackPortfolioId) return;
    setSelectedPortfolioId((current) => {
      if (current && portfolioOptions.some((portfolio) => portfolio.id === current)) return current;
      return fallbackPortfolioId;
    });
  }, [defaultPortfolioId, portfolioOptions, position?.portfolioContextId, position?.portfolioId]);

  useEffect(() => {
    if (position?.id) setSelectedPositionId(position.id);
    else if (!selectedPositionId && editablePositions[0]?.id) setSelectedPositionId(editablePositions[0].id);
    else if (selectedPositionId && !editablePositions.some((item) => item.id === selectedPositionId)) {
      setSelectedPositionId(editablePositions[0]?.id || "");
    }
  }, [editablePositions, position?.id, selectedPositionId, selectedPortfolioId]);

  useEffect(() => {
    setForm(buildForm(activePosition));
    setAllocationTargets(buildAllocationTargets(activePosition, scopedPositions));
  }, [activePosition, scopedPositions]);

  const allocation = useMemo(() => {
    const otherIncluded = scopedPositions.filter((item) => item.id !== activePosition?.id && item.includeInAllocation);
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
  }, [activePosition?.id, allocationTargets, form.includeInAllocation, form.targetAllocationPct, scopedPositions]);

  const avgDrawdownValidation = useMemo(() => {
    const period = toNumber(form.avgDrawdownPeriod, 0);
    const interval = toNumber(form.avgDrawdownInterval, 0);
    if (period <= 0 || interval <= 0) {
      return {valid: false, message: "Avg drawdown period and interval must be greater than 0."};
    }
    if (interval > period) {
      return {valid: false, message: "Avg drawdown interval cannot be greater than avg drawdown period."};
    }
    if (period % interval !== 0) {
      return {valid: false, message: "Avg drawdown period must be divisible by avg drawdown interval."};
    }
    if ((period / interval) > 12) {
      return {valid: false, message: "Avg drawdown setup supports up to 12 intervals."};
    }
    return {valid: true, message: ""};
  }, [form.avgDrawdownInterval, form.avgDrawdownPeriod]);

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
        next.ticker = CASH_TICKER_DEFAULT;
        next.company = CASH_COMPANY_DEFAULT;
        next.includeInAllocation = false;
      } else if (value === "CASH_ETF") {
        next.ticker = CASH_ETF_TICKER_DEFAULT;
        next.company = CASH_ETF_COMPANY_DEFAULT;
        next.includeInAllocation = false;
      } else if (value === "CRYPTO") {
        if (isTypeDefaultValue(current.type, current.ticker, current.company)) {
          next.ticker = "";
          next.company = "";
        }
        if (!isCashEquivalent(current.type)) next.includeInAllocation = current.includeInAllocation;
        else next.includeInAllocation = true;
      } else if (value === "STOCK" && isTypeDefaultValue(current.type, current.ticker, current.company)) {
        next.ticker = "";
        next.company = "";
      }
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.ticker.trim() || (!isWatchlist && !allocation.valid) || !avgDrawdownValidation.valid) return;
    onSubmit({
      id: editorMode === "edit" ? activePosition?.id : position?.id,
      portfolioId: selectedPortfolioId || defaultPortfolioId,
      ticker: form.ticker.trim().toUpperCase(),
      company: form.company.trim(),
      type: form.type,
      mode: isWatchlist ? "WATCHLIST" : "ACTIVE",
      targetAllocationPct: isWatchlist ? 0 : Number(form.targetAllocationPct || 0),
      includeInAllocation: isWatchlist ? false : form.includeInAllocation,
      correctionPct: isWatchlist ? -10 : Number(form.correctionPct || 0),
      drawdownPlanPct: isWatchlist ? -20 : Number(form.drawdownPlanPct || 0),
      peakLookbackMonths: Number(form.peakLookbackMonths || 5),
      avgDrawdownPeriod: Number(form.avgDrawdownPeriod || 36),
      avgDrawdownInterval: Number(form.avgDrawdownInterval || 4),
      allocationAdjustments: isWatchlist ? [] : allocation.rows
        .filter((row) => !closeEnough(row.target, row.position?.targetAllocationPct ?? row.position?.target))
        .map((row) => ({
          id: row.id,
          targetAllocationPct: row.target,
        })),
    });
  }

  return (
    <ModalSheet title={isWatchlist ? "Watch list item" : "Add/Edit Position"} subtitle={isWatchlist ? "Add a ticker to monitor its price, peak pressure, and avg drawdown before it joins the portfolio." : "Stocks use your existing providers, crypto uses Binance, cash ETF uses market pricing, and cash bucket stays fixed at $1."} onClose={onClose}>
      <form className="modal-form modal-grid" onSubmit={handleSubmit}>
        {!isWatchlist ? (
          <div className="editor-mode-toggle modal-actions-wide">
            <button className={`editor-mode-button ${editorMode === "add" ? "active" : ""}`} onClick={() => setEditorMode("add")} type="button">Add</button>
            <button className={`editor-mode-button ${editorMode === "edit" ? "active" : ""}`} onClick={() => setEditorMode("edit")} type="button">Edit</button>
          </div>
        ) : null}

        {!isWatchlist && editorMode === "edit" ? (
          <div className="modal-section modal-actions-wide">
            <div className="modal-section-heading">
              <p className="modal-kicker">Ticker / cash bucket</p>
              <h4>Select holding to edit</h4>
            </div>
            {showPortfolioSelector ? (
              <label>
                <span>Portfolio</span>
                <select disabled={portfolioLocked} value={selectedPortfolioId} onChange={(e) => setSelectedPortfolioId(e.target.value)}>
                  {portfolioOptions.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              <span>Ticker / cash bucket</span>
              <select value={selectedPositionId} onChange={(e) => setSelectedPositionId(e.target.value)}>
                {editablePositions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.ticker}{item.company ? ` · ${item.company}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {!isWatchlist && editorMode !== "edit" && showPortfolioSelector ? (
          <label>
            <span>Portfolio</span>
            <select disabled={portfolioLocked} value={selectedPortfolioId} onChange={(e) => setSelectedPortfolioId(e.target.value)}>
              {portfolioOptions.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {isWatchlist && showPortfolioSelector ? (
          <label>
            <span>Portfolio</span>
            <select disabled={portfolioLocked} value={selectedPortfolioId} onChange={(e) => setSelectedPortfolioId(e.target.value)}>
              {portfolioOptions.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Position identity</p>
            <h4>Define the holding</h4>
          </div>
          <div className="modal-grid modal-grid-identity">
            <label>
              <span>Ticker</span>
              <input autoFocus disabled={editorMode === "edit"} placeholder={form.type === "CRYPTO" ? "BTC" : "NVDA"} value={form.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} />
            </label>
            <label>
              <span>Company</span>
              <input placeholder={form.type === "CRYPTO" ? "Bitcoin" : "Company Name"} value={form.company} onChange={(e) => update("company", e.target.value)} />
            </label>
            <label className="modal-type-field">
              <span>Type</span>
              <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                <option value="STOCK">Stock</option>
                <option value="CRYPTO">Crypto</option>
                <option value="CASH_ETF">Cash ETF</option>
                <option value="CASH">Cash bucket</option>
              </select>
            </label>
            <div className="modal-grid-full modal-field-note">
              <small>{form.type === "CRYPTO" ? "Use simple symbols like BTC, ETH, or TON. Bare crypto tickers default to USD via Binance USDT pairs; BTC/USD, ETH/USDT, and BTCUSDT also work." : form.type === "CASH_ETF" ? "Ticker-based cash sleeve with live or delayed market price." : form.type === "CASH" ? "Manual uninvested cash bucket priced at $1." : "Standard market-priced holding."}</small>
            </div>
          </div>
        </div>

        {!isWatchlist ? (
        <div className="modal-section modal-actions-wide">
          <div className="modal-section-heading">
            <p className="modal-kicker">Risk settings</p>
            <h4>Target and avg drawdown controls</h4>
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
              <span>Avg drawdown window</span>
              <div className="input-unit-wrap">
                <input inputMode="numeric" value={form.avgDrawdownPeriod} onChange={(e) => updateNumericField("avgDrawdownPeriod", e.target.value)} />
                <i>mo</i>
              </div>
            </label>
            <label className="risk-grid-row2">
              <span>Step size</span>
              <div className="input-unit-wrap">
                <select value={form.avgDrawdownInterval} onChange={(e) => update("avgDrawdownInterval", e.target.value)}>
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
            <small>{isCashEquivalent(form.type) ? "Cash positions stay outside the target model by default." : "Included positions must sum to exactly 100%."}</small>
          </span>
          <input checked={form.includeInAllocation} disabled={isCashEquivalent(form.type)} onChange={(e) => update("includeInAllocation", e.target.checked)} type="checkbox" />
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
        {!avgDrawdownValidation.valid ? (
          <div className="validation-banner modal-actions-wide">
            {avgDrawdownValidation.message}
          </div>
        ) : null}
        <div className="modal-actions modal-actions-wide">
          <button className="ghost" onClick={onClose} type="button">Cancel</button>
          <button className="primary" disabled={(!isWatchlist && !allocation.valid) || !avgDrawdownValidation.valid} type="submit">{isWatchlist ? "Save watch item" : editorMode === "edit" ? "Save changes" : "Save position"}</button>
        </div>
      </form>
    </ModalSheet>
  );
}
