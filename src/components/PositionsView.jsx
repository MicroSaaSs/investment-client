import React from "react";
import { money, pct, pctMagnitude, pctNegative, pctPlain, sourceLabel } from "../utils/format";
import { MobilePositionCard, normalizePositionSummaryMetricIds, PositionSummaryMetricControl } from "./MobilePositionCard";
import { ModalSheet } from "./ModalSheet";
import { TrashIcon } from "./icons/TrashIcon";
import { buildManualOrderIds, moveItemAfter, moveItemBefore, moveManualOrderItem, sortPositions } from "../utils/positionSort";

function companyLabel(position) {
  if (position?.type === "CASH") return "Uninvested cash";
  return (position.company || "").trim() || "—";
}

function pnlAmount(position) {
  return Number(position.current || 0) - Number(position.invested || 0);
}

function averagePrice(position) {
  const shares = Number(position.shares || 0);
  if (!shares) return 0;
  return Number(position.invested || 0) / shares;
}

function ValueBlock({ position }) {
  return (
    <div className="table-dual-value">
      <span>Invest · {money(position.invested, 0)}</span>
      <span>Curr · {money(position.current, 0)}</span>
    </div>
  );
}

function AllocationBlock({ position }) {
  return (
    <div className="table-dual-value">
      <span>Target · {pctPlain(position.target)}</span>
      <span>Curr · {pctPlain(position.weight)}</span>
    </div>
  );
}

function transactionSummary(transaction) {
  const type = String(transaction.type || "").trim().toUpperCase();
  const amount = Number(transaction.shares || 0) > 0 && Number(transaction.price || 0) > 0
    ? Number(transaction.shares || 0) * Number(transaction.price || 0)
    : Number(transaction.shares || 0) || Number(transaction.price || 0) || 0;
  if (["DEPOSIT", "WITHDRAWAL", "DIVIDEND", "FEE"].includes(type)) {
    const parts = [
      transaction.date,
      money(amount, 0),
    ];
    return parts.join(" · ");
  }
  const parts = [
    transaction.date,
    money(transaction.price, 0),
  ];
  if (Number(transaction.fees || 0)) {
    parts.push(`${money(transaction.fees, 0)} fees`);
  }
  return parts.join(" · ");
}

function transactionTypeLabel(transaction) {
  const type = String(transaction.type || "").trim().toUpperCase();
  return ({
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    DIVIDEND: "Dividend",
    FEE: "Fee",
  })[type] || type;
}

function TriggerBlock({ position }) {
  return (
    <div className="trigger-block">
      <span>CORR · {pctMagnitude(Math.abs(position.corr))} · {money(position.correctionTrigger, 0)}</span>
      <span>DD_P · {pctMagnitude(Math.abs(position.ddPlan))} · {money(position.drawdownTrigger, 0)}</span>
    </div>
  );
}

function SignalPill({ signal }) {
  const normalized = (signal || "HOLD").toLowerCase();
  return <span className={`signal-pill signal-${normalized}`}>{signal || "HOLD"}</span>;
}

function SourceBadge({ source }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source)}</span>;
}

function isCashPosition(position) {
  return position?.type === "CASH";
}

function valueOnlyPlaceholder(position, value) {
  return isCashPosition(position) ? "--" : value;
}

const HOLDINGS_METRIC_COLUMNS = [
  { id: "price", label: "Price" },
  { id: "peakPrice", label: "Peak Price" },
  { id: "avgPrice", label: "Avg Price" },
  { id: "value", label: "Value" },
  { id: "pnl", label: "PnL" },
  { id: "allocation", label: "Allocation" },
  { id: "drawdown", label: "Drawdown" },
  { id: "avgDrawdown", label: "Avg Drawdown" },
  { id: "triggers", label: "Triggers" },
  { id: "signal", label: "Signal" },
];

export function PositionsView({
  mobilePositionSummaryMetrics,
  onMobilePositionSummaryMetricsChange,
  onReorderPositions,
  positions,
  transactions,
  onAddTransaction,
  onDeletePosition,
  onDeleteTransaction,
  onEditPosition,
  onEditTransaction,
}) {
  const dragPositionIdRef = React.useRef(null);
  const [expandedMobileCard, setExpandedMobileCard] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("positions");
  const [showColumnsPicker, setShowColumnsPicker] = React.useState(false);
  const [dragPositionId, setDragPositionId] = React.useState(null);
  const [draftOrderIds, setDraftOrderIds] = React.useState(() => buildManualOrderIds(positions));
  const [draftDragId, setDraftDragId] = React.useState(null);
  const [dropTargetId, setDropTargetId] = React.useState(null);
  const [draftDropTargetId, setDraftDropTargetId] = React.useState(null);
  const [visibleColumns, setVisibleColumns] = React.useState(() => new Set(HOLDINGS_METRIC_COLUMNS.map((column) => column.id)));
  const summaryMetricIds = normalizePositionSummaryMetricIds(mobilePositionSummaryMetrics);
  const sortedPositions = sortPositions(positions);
  const isColumnVisible = React.useCallback((columnId) => visibleColumns.has(columnId), [visibleColumns]);
  const positionsById = React.useMemo(() => {
    const map = new Map();
    for (const position of positions) {
      if (position?.id) map.set(position.id, position);
    }
    return map;
  }, [positions]);
  const draftOrderedPositions = React.useMemo(() => {
    const picked = draftOrderIds.map((id) => positionsById.get(id)).filter(Boolean);
    const missing = sortedPositions.filter((position) => !draftOrderIds.includes(position.id));
    return [...picked, ...missing];
  }, [draftOrderIds, positionsById, sortedPositions]);

  const toggleColumn = React.useCallback((columnId) => {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  async function applyManualOrder() {
    if (!onReorderPositions) return;
    await onReorderPositions(draftOrderedPositions.map((position) => position.id));
    setShowColumnsPicker(false);
  }

  async function handleDropOnPosition(targetPositionId, sourcePositionId = null, placement = "after") {
    const movingId = sourcePositionId || dragPositionIdRef.current || dragPositionId;
    if (!movingId || !targetPositionId || movingId === targetPositionId) return;
    const orderIds = sortedPositions.map((position) => position.id);
    const nextOrderIds = placement === "before"
      ? moveItemBefore(orderIds, movingId, targetPositionId)
      : moveItemAfter(orderIds, movingId, targetPositionId);
    setDragPositionId(null);
    dragPositionIdRef.current = null;
    setDropTargetId(null);
    await onReorderPositions?.(nextOrderIds);
  }

  async function movePositionByStep(positionId, direction) {
    const orderIds = sortedPositions.map((position) => position.id);
    const nextOrderIds = moveManualOrderItem(orderIds, positionId, direction);
    if (nextOrderIds.join(",") === orderIds.join(",")) return;
    await onReorderPositions?.(nextOrderIds);
  }

  return (
    <div className="positions-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="panel-subtabs" role="tablist" aria-label="Positions content tabs">
              <div className={`panel-subtab-shell ${activeTab === "positions" ? "active" : ""}`}>
                <button
                  aria-selected={activeTab === "positions"}
                  className={`panel-subtab panel-subtab-with-control ${activeTab === "positions" ? "active" : ""}`}
                  onClick={() => setActiveTab("positions")}
                  role="tab"
                  type="button"
                >
                  <span className="eyebrow">HOLDINGS</span>
                  <strong>Holdings and model drift</strong>
                </button>
                <PositionSummaryMetricControl
                  className="panel-subtab-control panel-subtab-control-mobile-only"
                  onChange={onMobilePositionSummaryMetricsChange}
                  onReorderPositions={onReorderPositions}
                  positions={positions}
                  selectedMetricIds={summaryMetricIds}
                />
                <div className="panel-subtab-control panel-subtab-control-desktop-only">
                  <button
                    aria-expanded={showColumnsPicker}
                    className={`position-metric-control-button ${showColumnsPicker ? "active" : ""}`}
                    onClick={() => {
                      setDraftOrderIds(buildManualOrderIds(positions));
                      setShowColumnsPicker((current) => !current);
                    }}
                    title="Choose visible columns"
                    type="button"
                  >
                    <span aria-hidden="true">⚙</span>
                  </button>
                </div>
              </div>
              <button
                aria-selected={activeTab === "transactions"}
                className={`panel-subtab ${activeTab === "transactions" ? "active" : ""}`}
                onClick={() => setActiveTab("transactions")}
                role="tab"
                type="button"
              >
                <span className="eyebrow">TRANSACTIONS</span>
                <strong>Execution history</strong>
              </button>
            </div>
            <p className="panel-copy">
              {activeTab === "positions"
                ? "Track live pricing, target weights, and drawdown pressure across your current positions."
                : "Review the trades that built this portfolio and keep every entry editable."}
            </p>
          </div>
        </div>
        {activeTab === "positions" ? (
        <>
        {showColumnsPicker ? (
          <ModalSheet
            title="COLUMN VISIBILITY"
            subtitle="Choose holdings table columns and manual order"
            onClose={() => setShowColumnsPicker(false)}
            className="holdings-columns-sheet"
          >
            <div className="holdings-columns-layout" role="dialog" aria-label="Holdings column picker">
              <div className="holdings-order-section">
                <span>Position order (manual)</span>
                <div className="position-order-list">
                  {draftOrderedPositions.map((position, index) => (
                    <div
                      className="position-order-row"
                      draggable
                      key={position.id}
                      onDragEnd={() => setDraftDragId(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDraftDropTargetId(position.id);
                      }}
                      onDragStart={(event) => {
                        setDraftDragId(position.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", position.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = draftDragId || event.dataTransfer.getData("text/plain");
                        if (!sourceId) return;
                        setDraftOrderIds((current) => moveItemBefore(current, sourceId, position.id));
                        setDraftDragId(null);
                        setDraftDropTargetId(null);
                      }}
                      onDragLeave={() => setDraftDropTargetId((current) => (current === position.id ? null : current))}
                      data-drop-target={draftDropTargetId === position.id ? "true" : "false"}
                    >
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
                <button className="action-button action-button-secondary" onClick={applyManualOrder} type="button">Apply order</button>
              </div>
              <div className="holdings-columns-picker">
                {HOLDINGS_METRIC_COLUMNS.map((column) => (
                  <label className="holdings-columns-option" key={column.id}>
                    <input
                      checked={isColumnVisible(column.id)}
                      onChange={() => toggleColumn(column.id)}
                      type="checkbox"
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </ModalSheet>
        ) : null}
        <div className="table-wrap desktop-table positions-desktop-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                {isColumnVisible("price") ? <th className="table-center">Price</th> : null}
                {isColumnVisible("peakPrice") ? <th className="table-center">Peak Price</th> : null}
                {isColumnVisible("avgPrice") ? <th className="table-center">Avg Price</th> : null}
                {isColumnVisible("value") ? <th className="table-center">Value</th> : null}
                {isColumnVisible("pnl") ? <th className="table-center">PnL</th> : null}
                {isColumnVisible("allocation") ? <th className="table-center">Allocation</th> : null}
                {isColumnVisible("drawdown") ? <th className="table-center">Drawdown</th> : null}
                {isColumnVisible("avgDrawdown") ? <th className="table-center">Avg Drawdown</th> : null}
                {isColumnVisible("triggers") ? <th className="table-center">Triggers</th> : null}
                {isColumnVisible("signal") ? <th className="table-center">Signal</th> : null}
                <th className="table-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPositions.map((position) => (
                <tr
                  draggable
                  key={position.id}
                  onDragEnd={() => {
                    setDragPositionId(null);
                    dragPositionIdRef.current = null;
                    setDropTargetId(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTargetId(position.id);
                  }}
                  onDragStart={(event) => {
                    setDragPositionId(position.id);
                    dragPositionIdRef.current = position.id;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", position.id);
                    event.dataTransfer.setData("text", position.id);
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    const sourceId = dragPositionIdRef.current || dragPositionId || event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text");
                    if (!sourceId) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                    await handleDropOnPosition(position.id, sourceId, placement);
                  }}
                  onDragLeave={() => setDropTargetId((current) => (current === position.id ? null : current))}
                  data-drop-target={dropTargetId === position.id ? "true" : "false"}
                >
                  <td>
                    <div className="table-cell-stack">
                      <strong>{position.ticker}</strong>
                      {!isCashPosition(position) ? (
                        <small className="shares-tag">{Number(position.shares || 0).toLocaleString()} sh</small>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="table-cell-stack table-company-cell">
                      <span>{companyLabel(position)}</span>
                    </div>
                  </td>
                  {isColumnVisible("price") ? (
                    <td className="table-center">
                      {isCashPosition(position) ? "--" : (
                        <div className="table-cell-stack table-cell-stack-center">
                          <span>{money(position.price, 2)}</span>
                          <small><SourceBadge source={position.priceSource} /></small>
                        </div>
                      )}
                    </td>
                  ) : null}
                  {isColumnVisible("peakPrice") ? <td className="table-center">{valueOnlyPlaceholder(position, money(position.peak, 2))}</td> : null}
                  {isColumnVisible("avgPrice") ? <td className="table-center">{valueOnlyPlaceholder(position, money(averagePrice(position), 2))}</td> : null}
                  {isColumnVisible("value") ? (
                    <td className="table-center">
                      <div className="table-cell-stack table-cell-stack-center">
                        <ValueBlock position={position} />
                      </div>
                    </td>
                  ) : null}
                  {isColumnVisible("pnl") ? (
                    <td className="table-center">
                      {isCashPosition(position) ? "--" : (
                        <div className="table-cell-stack table-cell-stack-center">
                          <span>{pct(position.pnlPct)}</span>
                          <span>{money(pnlAmount(position), 0)}</span>
                        </div>
                      )}
                    </td>
                  ) : null}
                  {isColumnVisible("allocation") ? (
                    <td className="table-center">
                      {isCashPosition(position) ? "--" : (
                        <div className="table-cell-stack table-cell-stack-center">
                          <AllocationBlock position={position} />
                        </div>
                      )}
                    </td>
                  ) : null}
                  {isColumnVisible("drawdown") ? <td className="table-center">{valueOnlyPlaceholder(position, pct(position.dd))}</td> : null}
                  {isColumnVisible("avgDrawdown") ? <td className="table-center">{valueOnlyPlaceholder(position, pctNegative(position.avgDrawdown))}</td> : null}
                  {isColumnVisible("triggers") ? (
                    <td className="table-center">
                      {isCashPosition(position) ? "--" : <TriggerBlock position={position} />}
                    </td>
                  ) : null}
                  {isColumnVisible("signal") ? <td className="table-center"><SignalPill signal={position.signal} /></td> : null}
                  <td className="table-center">
                    <div className="row-actions row-actions-center">
                      <button
                        aria-label={`Edit ${position.ticker} holding`}
                        className="toolbar-icon-button"
                        onClick={() => onEditPosition(position)}
                        title="Edit holding"
                        type="button"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                      <button
                        aria-label={`Delete ${position.ticker} holding`}
                        className="toolbar-icon-button toolbar-icon-button-danger"
                        onClick={() => onDeletePosition(position)}
                        title="Delete holding"
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-list">
          {sortedPositions.map((position) => (
            <MobilePositionCard
              compactStyle="inline"
              draggable
              expanded={expandedMobileCard === position.id}
              key={position.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => {
                setDragPositionId(position.id);
                dragPositionIdRef.current = position.id;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", position.id);
                event.dataTransfer.setData("text", position.id);
              }}
              onDragEnd={() => {
                setDragPositionId(null);
                dragPositionIdRef.current = null;
              }}
              onDrop={async (event) => {
                event.preventDefault();
                const sourceId = dragPositionIdRef.current || dragPositionId || event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text");
                if (!sourceId) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                await handleDropOnPosition(position.id, sourceId, placement);
              }}
              onDragOverCapture={() => setDropTargetId(position.id)}
              onDragLeave={() => setDropTargetId((current) => (current === position.id ? null : current))}
              onAddTransaction={onAddTransaction}
              onDelete={onDeletePosition}
              onEdit={onEditPosition}
              canMoveUp={sortedPositions.findIndex((item) => item.id === position.id) > 0}
              canMoveDown={sortedPositions.findIndex((item) => item.id === position.id) < sortedPositions.length - 1}
              onMoveUp={() => movePositionByStep(position.id, "up")}
              onMoveDown={() => movePositionByStep(position.id, "down")}
              onToggle={() => setExpandedMobileCard((current) => current === position.id ? null : position.id)}
              position={position}
              summaryMetricIds={summaryMetricIds}
              dropTarget={dropTargetId === position.id}
            />
          ))}
        </div>
        </>
        ) : (
        <>
        <div className="table-wrap desktop-table transactions-desktop-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Type</th>
                <th className="table-center">Shares</th>
                <th className="table-center">Price</th>
                <th className="table-center">Fees</th>
                <th className="table-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td><strong>{transaction.date}</strong></td>
                  <td>{transaction.ticker}</td>
                  <td>{transactionTypeLabel(transaction)}</td>
                  <td className="table-center">{Number(transaction.shares || 0).toLocaleString()}</td>
                  <td className="table-center">{money(transaction.price, 2)}</td>
                  <td className="table-center">{money(transaction.fees, 2)}</td>
                  <td className="table-center">
                    <div className="row-actions row-actions-center">
                      <button className="mini-button" onClick={() => onEditTransaction(transaction)} type="button">Edit</button>
                      <button className="mini-button mini-button-danger" onClick={() => onDeleteTransaction(transaction)} type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-list">
          {transactions.map((transaction) => (
            <article className="mobile-card mobile-card-transaction" key={transaction.id}>
              <div className="mobile-card-top">
                <div>
                  <strong>{transaction.ticker}</strong>
                </div>
                <span className="signal-pill signal-hold">{transactionTypeLabel(transaction)}</span>
              </div>
              <div className="mobile-card-transaction-row">
                <div className="mobile-card-transaction-summary">
                  <span>{transactionSummary(transaction)}</span>
                </div>
                <div className="mobile-card-transaction-actions">
                  <button
                    aria-label={`Edit ${transaction.ticker} transaction`}
                    className="toolbar-icon-button mobile-transaction-action"
                    onClick={() => onEditTransaction(transaction)}
                    title="Edit transaction"
                    type="button"
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    aria-label={`Delete ${transaction.ticker} transaction`}
                    className="toolbar-icon-button toolbar-icon-button-danger mobile-transaction-action"
                    onClick={() => onDeleteTransaction(transaction)}
                    title="Delete transaction"
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        </>
        )}
      </section>
    </div>
  );
}
