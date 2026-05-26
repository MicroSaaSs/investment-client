import React from "react";
import { compactMoney, money, pct, pctMagnitude, pctNegative, pctPlain, sourceLabel } from "../utils/format";
import { ModalSheet } from "./ModalSheet";
import { TrashIcon } from "./icons/TrashIcon";
import { buildManualOrderIds, moveManualOrderItem, sortPositions } from "../utils/positionSort";

export const DEFAULT_POSITION_SUMMARY_METRICS = ["valueCurrent", "allocationCurrent", "shares"];

export const POSITION_SUMMARY_METRIC_OPTIONS = [
  { id: "valueCurrent", label: "Value Current" },
  { id: "valueInvested", label: "Value Invested" },
  { id: "allocationCurrent", label: "Allocation Current" },
  { id: "allocationTarget", label: "Allocation Target" },
  { id: "shares", label: "Shares" },
  { id: "price", label: "Price" },
  { id: "peakPrice", label: "Peak Price" },
  { id: "avgPrice", label: "Avg Price" },
  { id: "pnlPercent", label: "PnL %" },
  { id: "pnlValue", label: "PnL $" },
  { id: "drawdown", label: "Drawdown" },
  { id: "avgDrawdown", label: "Avg Drawdown" },
  { id: "corrPercent", label: "CORR %" },
  { id: "corrTrigger", label: "CORR Trigger $" },
  { id: "ddpPercent", label: "DD_P %" },
  { id: "ddpTrigger", label: "DD_P Trigger $" },
];

export function normalizePositionSummaryMetricIds(metricIds) {
  const aliasMap = new Map([
    ["value", "valueCurrent"],
    ["allocation", "allocationCurrent"],
  ]);
  const validIds = new Set(POSITION_SUMMARY_METRIC_OPTIONS.map((metric) => metric.id));
  const normalized = Array.isArray(metricIds) ? metricIds
    .map((id) => (typeof id === "string" ? (aliasMap.get(id) || id) : ""))
    .filter((id) => validIds.has(id))
    .slice(0, 3) : [];
  return normalized.length ? normalized : DEFAULT_POSITION_SUMMARY_METRICS;
}

function companyLabel(position) {
  if (position?.type === "CASH") return "Uninvested cash";
  return (position.company || "").trim() || "—";
}

function pnlAmount(position) {
  return Number(position.current || 0) - Number(position.invested || 0);
}

function averagePrice(position) {
  return Number(position.shares || 0) > 0
    ? Number(position.invested || 0) / Number(position.shares || 0)
    : 0;
}

function isCashPosition(position) {
  return position?.type === "CASH";
}

export function getPositionSummaryMetricConfig(id, position) {
  if (isCashPosition(position) && id !== "valueCurrent" && id !== "valueInvested") {
    return {
      id,
      label: "Value",
      summary: compactMoney(position.current),
      detailValue: money(position.current, 0),
    };
  }
  const pnlValue = pnlAmount(position);
  const configs = {
    valueCurrent: {
      id: "valueCurrent",
      label: "Value Current",
      summary: compactMoney(position.current),
      detailValue: money(position.current, 0),
    },
    valueInvested: {
      id: "valueInvested",
      label: "Value Invested",
      summary: money(position.invested, 0),
      detailValue: money(position.invested, 0),
    },
    allocationCurrent: {
      id: "allocationCurrent",
      label: "Allocation Current",
      summary: pctPlain(position.weight),
      detailValue: pctPlain(position.weight),
    },
    allocationTarget: {
      id: "allocationTarget",
      label: "Allocation Target",
      summary: pctPlain(position.target),
      detailValue: pctPlain(position.target),
    },
    shares: {
      id: "shares",
      label: "Shares",
      summary: `${Number(position.shares || 0).toLocaleString()} sh`,
      detailValue: `${Number(position.shares || 0).toLocaleString()} sh`,
      detailMeta: `Avg ${money(averagePrice(position), 2)}`,
    },
    price: {
      id: "price",
      label: "Price",
      summary: money(position.price, 2),
      detailValue: money(position.price, 2),
      detailMetaNode: <SourceBadge source={position.priceSource} />,
    },
    peakPrice: {
      id: "peakPrice",
      label: "Peak Price",
      summary: money(position.peak, 2),
      detailValue: money(position.peak, 2),
    },
    avgPrice: {
      id: "avgPrice",
      label: "Avg Price",
      summary: money(averagePrice(position), 2),
      detailValue: money(averagePrice(position), 2),
      detailMeta: `${Number(position.shares || 0).toLocaleString()} sh`,
    },
    pnlPercent: {
      id: "pnlPercent",
      label: "PnL %",
      summary: pct(position.pnlPct),
      detailValue: pct(position.pnlPct),
      detailMeta: money(pnlValue, 0),
    },
    pnlValue: {
      id: "pnlValue",
      label: "PnL $",
      summary: money(pnlValue, 0),
      detailValue: money(pnlValue, 0),
      detailMeta: pct(position.pnlPct),
    },
    drawdown: {
      id: "drawdown",
      label: "Drawdown",
      summary: pct(position.dd),
      detailValue: pct(position.dd),
      detailMeta: `Peak ${money(position.peak, 2)}`,
    },
    avgDrawdown: {
      id: "avgDrawdown",
      label: "Avg Drawdown",
      summary: pctNegative(position.avgDrawdown),
      detailValue: pctNegative(position.avgDrawdown),
      detailMeta: `Peak ${money(position.peak, 2)}`,
    },
    corrPercent: {
      id: "corrPercent",
      label: "CORR %",
      summary: pctMagnitude(Math.abs(position.corr)),
      detailValue: pctMagnitude(Math.abs(position.corr)),
      detailMeta: money(position.correctionTrigger, 0),
    },
    corrTrigger: {
      id: "corrTrigger",
      label: "CORR Trigger $",
      summary: money(position.correctionTrigger, 0),
      detailValue: money(position.correctionTrigger, 0),
      detailMeta: pctMagnitude(Math.abs(position.corr)),
    },
    ddpPercent: {
      id: "ddpPercent",
      label: "DD_P %",
      summary: pctMagnitude(Math.abs(position.ddPlan)),
      detailValue: pctMagnitude(Math.abs(position.ddPlan)),
      detailMeta: money(position.drawdownTrigger, 0),
    },
    ddpTrigger: {
      id: "ddpTrigger",
      label: "DD_P Trigger $",
      summary: money(position.drawdownTrigger, 0),
      detailValue: money(position.drawdownTrigger, 0),
      detailMeta: pctMagnitude(Math.abs(position.ddPlan)),
    },
  };
  return configs[id] || configs.valueCurrent;
}

function SignalPill({ signal }) {
  const normalized = (signal || "HOLD").toLowerCase();
  return <span className={`signal-pill signal-${normalized}`}>{signal || "HOLD"}</span>;
}

function SourceBadge({ source }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source)}</span>;
}

function ActionButton({ label, title, danger = false, onClick, icon }) {
  if (!onClick) return null;
  return (
    <button
      aria-label={label}
      className={`toolbar-icon-button mobile-position-card-action${danger ? " toolbar-icon-button-danger" : ""}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export function PositionSummaryMetricPicker({ selectedMetricIds, onChange, showHeader = true, onApply = null }) {
  function toggleMetric(metricId) {
    const isSelected = selectedMetricIds.includes(metricId);
    if (isSelected) {
      onChange(selectedMetricIds.filter((id) => id !== metricId));
      return;
    }
    if (selectedMetricIds.length >= 3) return;
    onChange([...selectedMetricIds, metricId]);
  }

  return (
    <div className="position-metric-picker-panel">
      {showHeader ? (
        <div className="position-metric-picker-copy">
          <strong>Summary metrics</strong>
          <span>Choose up to 3 metrics for the compact card view.</span>
        </div>
      ) : (
        <div className="position-metric-picker-meta">
          <div className="position-metric-picker-meta-row">
            <div className="position-metric-picker-meta-copy">
              <strong>{selectedMetricIds.length}/3 selected</strong>
              <span>Tap metrics to include in compact cards.</span>
            </div>
          </div>
        </div>
      )}
      <div className="position-metric-picker-options">
        {POSITION_SUMMARY_METRIC_OPTIONS.map((metric) => {
          const selected = selectedMetricIds.includes(metric.id);
          const disabled = !selected && selectedMetricIds.length >= 3;
          return (
            <button
              aria-pressed={selected}
              className={`position-metric-pill${selected ? " active" : ""}`}
              disabled={disabled}
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
              type="button"
            >
              {metric.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PositionSummaryMetricControl({
  selectedMetricIds,
  onChange,
  className = "",
  positions = [],
  onReorderPositions = null,
}) {
  const [open, setOpen] = React.useState(false);
  const [draftMetricIds, setDraftMetricIds] = React.useState(() => normalizePositionSummaryMetricIds(selectedMetricIds));
  const [draftOrderIds, setDraftOrderIds] = React.useState(() => buildManualOrderIds(positions));

  function openModal() {
    setDraftMetricIds(normalizePositionSummaryMetricIds(selectedMetricIds));
    setDraftOrderIds(buildManualOrderIds(positions));
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function metricIdsEqual(left, right) {
    if (left.length !== right.length) return false;
    return left.every((id, index) => id === right[index]);
  }

  function orderIdsEqual(left, right) {
    if (left.length !== right.length) return false;
    return left.every((id, index) => id === right[index]);
  }

  async function applySelection() {
    const normalizedDraftMetricIds = normalizePositionSummaryMetricIds(draftMetricIds);
    const normalizedCurrentMetricIds = normalizePositionSummaryMetricIds(selectedMetricIds);
    if (!metricIdsEqual(normalizedDraftMetricIds, normalizedCurrentMetricIds)) {
      await onChange(normalizedDraftMetricIds);
    }
    if (onReorderPositions) {
      const currentOrderIds = buildManualOrderIds(positions);
      if (!orderIdsEqual(draftOrderIds, currentOrderIds)) {
        await onReorderPositions(draftOrderIds);
      }
    }
    setOpen(false);
  }

  const positionsById = React.useMemo(() => {
    const map = new Map();
    for (const position of positions) {
      if (position?.id) map.set(position.id, position);
    }
    return map;
  }, [positions]);

  const draftOrderedPositions = React.useMemo(() => {
    const picked = draftOrderIds
      .map((id) => positionsById.get(id))
      .filter(Boolean);
    const missing = sortPositions(positions).filter((position) => !draftOrderIds.includes(position.id));
    return [...picked, ...missing];
  }, [draftOrderIds, positionsById, positions]);

  return (
    <div className={`position-metric-control ${className}`.trim()}>
      <button
        aria-expanded={open}
        aria-label="Choose summary metrics"
        className={`toolbar-icon-button position-metric-control-button${open ? " active" : ""}`}
        onClick={open ? closeModal : openModal}
        title="Choose summary metrics"
        type="button"
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open ? (
        <ModalSheet
          headerActions={(
            <div className="metrics-picker-modal-actions">
              <button aria-label="Close metric picker" className="toolbar-icon-button modal-icon-action" onClick={closeModal} title="Close" type="button">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          )}
          hideDefaultClose
          backdropClassName="metrics-picker-backdrop"
          className="metrics-picker-sheet"
          onClose={closeModal}
          subtitle="Pick up to 3 metrics for compact cards."
          title="Summary metrics"
        >
          <div className="holdings-columns-picker">
            <div className="holdings-columns-option holdings-columns-option-select">
              <div className="position-order-header">
                <span>Position order (manual)</span>
                <button
                  aria-label="Apply metric selection"
                  className="toolbar-icon-button modal-icon-action position-metric-apply-icon"
                  onClick={applySelection}
                  title="Apply"
                  type="button"
                >
                  <span aria-hidden="true">✓</span>
                </button>
              </div>
              <div className="position-order-list">
                {draftOrderedPositions.map((position, index) => (
                  <div className="position-order-row" key={position.id}>
                    <strong>{position.ticker}</strong>
                    <div className="position-order-row-actions">
                      <button
                        className="mini-button"
                        disabled={index === 0}
                        onClick={() => setDraftOrderIds((current) => moveManualOrderItem(current, position.id, "up"))}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        className="mini-button"
                        disabled={index === draftOrderedPositions.length - 1}
                        onClick={() => setDraftOrderIds((current) => moveManualOrderItem(current, position.id, "down"))}
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <PositionSummaryMetricPicker onApply={applySelection} onChange={setDraftMetricIds} selectedMetricIds={draftMetricIds} showHeader={false} />
        </ModalSheet>
      ) : null}
    </div>
  );
}

export function MobilePositionCard({
  expanded,
  compactStyle = "chips",
  draggable = false,
  onDragOver,
  onDragStart,
  onDrop,
  dropTarget = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onAddTransaction,
  onDelete,
  onEdit,
  onToggle,
  position,
  summaryMetricIds,
}) {
  const isCash = isCashPosition(position);
  const summaryMetrics = normalizePositionSummaryMetricIds(summaryMetricIds).map((id) => getPositionSummaryMetricConfig(id, position)).slice(0, 3);
  function handleToggleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  }

  return (
    <article
      className={`mobile-card mobile-card-position mobile-position-card${expanded ? " is-expanded" : ""}${dropTarget ? " is-drop-target" : ""}`}
      draggable={draggable}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div
        aria-expanded={expanded}
        className="mobile-position-card-toggle"
        onClick={onToggle}
        onKeyDown={handleToggleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="mobile-card-top">
          <div className="mobile-position-card-title-block">
            <div className="mobile-position-card-title-row">
              <div className="mobile-position-card-title-left">
                <strong>{position.ticker}</strong>
                <SignalPill signal={position.signal} />
              </div>
            </div>
            <small>{companyLabel(position)}</small>
          </div>
          {compactStyle === "inline" && !expanded ? (
            <div className="mobile-position-card-inline-values" aria-hidden="true">
              {(isCash ? [getPositionSummaryMetricConfig("valueCurrent", position)] : summaryMetrics).map((metric) => (
                <strong key={metric.id}>{metric.summary}</strong>
              ))}
            </div>
          ) : null}
          {expanded && (onEdit || onDelete || onAddTransaction || onMoveUp || onMoveDown) ? (
            <div className="mobile-position-card-actions mobile-position-card-actions-inline">
              {onMoveUp || onMoveDown ? (
                <>
                  <button
                    aria-label={`Move ${position.ticker} up`}
                    className="toolbar-icon-button mobile-position-card-action"
                    disabled={!canMoveUp}
                    onClick={(event) => {
                      event?.stopPropagation?.();
                      onMoveUp?.(position);
                    }}
                    title="Move up"
                    type="button"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    aria-label={`Move ${position.ticker} down`}
                    className="toolbar-icon-button mobile-position-card-action"
                    disabled={!canMoveDown}
                    onClick={(event) => {
                      event?.stopPropagation?.();
                      onMoveDown?.(position);
                    }}
                    title="Move down"
                    type="button"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </>
              ) : null}
              <ActionButton
                icon={(
                  <span className="txn-icon-stack">
                    <i>🧾</i>
                    <b>Txn</b>
                  </span>
                )}
                label={`Add transaction for ${position.ticker}`}
                onClick={(pos) => {
                  pos?.stopPropagation?.();
                  onAddTransaction?.(position);
                }}
                title="Add transaction"
              />
              <ActionButton
                icon="✎"
                label={`Edit ${position.ticker}`}
                onClick={(pos) => {
                  pos?.stopPropagation?.();
                  onEdit?.(position);
                }}
                title="Edit position"
              />
              <ActionButton
                danger
                icon={<TrashIcon />}
                label={`Delete ${position.ticker}`}
                onClick={(pos) => {
                  pos?.stopPropagation?.();
                  onDelete?.(position);
                }}
                title="Delete position"
              />
            </div>
          ) : null}
        </div>
        {compactStyle === "chips" && !expanded ? (
          <div className="mobile-card-summary">
            {(isCash ? [getPositionSummaryMetricConfig("valueCurrent", position)] : summaryMetrics).map((metric) => (
              <span key={metric.id}>
                <strong>{metric.label}</strong>
                {metric.summary}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="mobile-position-card-stat-grid">
            <div className="mobile-position-card-stat">
              <span>Value</span>
              <div className="mobile-position-card-stat-lines">
                <strong>Invest {money(position.invested, 0)}</strong>
                <strong>Curr {money(position.current, 0)}</strong>
              </div>
            </div>
            {!isCash ? (
              <>
                <div className="mobile-position-card-stat">
                  <span>Allocation</span>
                  <div className="mobile-position-card-stat-lines">
                    <strong>Target {pctPlain(position.target)}</strong>
                    <strong>Curr {pctPlain(position.weight)}</strong>
                  </div>
                </div>
                <div className="mobile-position-card-stat">
                  <span>Shares</span>
                  <div className="mobile-position-card-stat-lines">
                    <strong>{Number(position.shares || 0).toLocaleString()} sh</strong>
                    <strong>Avg {money(averagePrice(position), 2)}</strong>
                  </div>
                </div>
                <div className="mobile-position-card-stat">
                  <span>Price</span>
                  <div className="mobile-position-card-stat-lines mobile-position-card-stat-lines-price">
                    <div className="mobile-position-card-price-row">
                      <strong>{money(position.price, 2)}</strong>
                      <small><SourceBadge source={position.priceSource} /></small>
                    </div>
                    <strong>Peak {money(position.peak, 2)}</strong>
                  </div>
                </div>
                <div className="mobile-position-card-stat">
                  <span>PnL</span>
                  <div className="mobile-position-card-stat-lines">
                    <strong>{money(pnlAmount(position), 0)}</strong>
                    <strong>{pct(position.pnlPct)}</strong>
                  </div>
                </div>
                <div className="mobile-position-card-stat">
                  <span>Drawdown</span>
                  <strong>{pct(position.dd)}</strong>
                </div>
                <div className="mobile-position-card-stat">
                  <span>Avg Drawdown</span>
                  <strong>{pctNegative(position.avgDrawdown)}</strong>
                </div>
                <div className="mobile-position-card-stat">
                  <span>Triggers</span>
                  <div className="mobile-position-card-stat-lines">
                    <strong>CORR {pctMagnitude(Math.abs(position.corr))} {money(position.correctionTrigger, 0)}</strong>
                    <strong>DD_P {pctMagnitude(Math.abs(position.ddPlan))} {money(position.drawdownTrigger, 0)}</strong>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </article>
  );
}
