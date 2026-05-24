import React from "react";
import { money, pct, pctMagnitude, pctPlain, sourceLabel } from "../utils/format";
import { MobilePositionCard, normalizePositionSummaryMetricIds, PositionSummaryMetricControl } from "./MobilePositionCard";
import { ModalSheet } from "./ModalSheet";
import { TrashIcon } from "./icons/TrashIcon";

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
  const parts = [
    transaction.date,
    money(transaction.price, 0),
  ];
  if (Number(transaction.fees || 0)) {
    parts.push(`${money(transaction.fees, 0)} fees`);
  }
  return parts.join(" · ");
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
  { id: "pnlPercent", label: "PnL %" },
  { id: "pnlValue", label: "PnL $" },
  { id: "allocation", label: "Allocation" },
  { id: "drawdown", label: "Drawdown" },
  { id: "volatility", label: "Volatility" },
  { id: "triggers", label: "Triggers" },
  { id: "signal", label: "Signal" },
];

export function PositionsView({
  mobilePositionSummaryMetrics,
  onMobilePositionSummaryMetricsChange,
  positions,
  transactions,
  onAddTransaction,
  onDeletePosition,
  onDeleteTransaction,
  onEditPosition,
  onEditTransaction,
}) {
  const [expandedMobileCard, setExpandedMobileCard] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("positions");
  const [showColumnsPicker, setShowColumnsPicker] = React.useState(false);
  const [visibleColumns, setVisibleColumns] = React.useState(() => new Set(HOLDINGS_METRIC_COLUMNS.map((column) => column.id)));
  const summaryMetricIds = normalizePositionSummaryMetricIds(mobilePositionSummaryMetrics);
  const isColumnVisible = React.useCallback((columnId) => visibleColumns.has(columnId), [visibleColumns]);

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
                  selectedMetricIds={summaryMetricIds}
                />
                <div className="panel-subtab-control panel-subtab-control-desktop-only">
                  <button
                    aria-expanded={showColumnsPicker}
                    className={`position-metric-control-button ${showColumnsPicker ? "active" : ""}`}
                    onClick={() => setShowColumnsPicker((current) => !current)}
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
            subtitle="Choose holdings table columns"
            onClose={() => setShowColumnsPicker(false)}
            className="holdings-columns-sheet"
          >
            <div className="holdings-columns-picker" role="dialog" aria-label="Holdings column picker">
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
                {isColumnVisible("pnlPercent") ? <th className="table-center">PnL %</th> : null}
                {isColumnVisible("pnlValue") ? <th className="table-center">PnL $</th> : null}
                {isColumnVisible("allocation") ? <th className="table-center">Allocation</th> : null}
                {isColumnVisible("drawdown") ? <th className="table-center">Drawdown</th> : null}
                {isColumnVisible("volatility") ? <th className="table-center">Volatility</th> : null}
                {isColumnVisible("triggers") ? <th className="table-center">Triggers</th> : null}
                {isColumnVisible("signal") ? <th className="table-center">Signal</th> : null}
                <th className="table-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
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
                  {isColumnVisible("pnlPercent") ? <td className="table-center">{valueOnlyPlaceholder(position, pct(position.pnlPct))}</td> : null}
                  {isColumnVisible("pnlValue") ? <td className="table-center">{valueOnlyPlaceholder(position, money(pnlAmount(position), 0))}</td> : null}
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
                  {isColumnVisible("volatility") ? <td className="table-center">{valueOnlyPlaceholder(position, pctMagnitude(position.volatility))}</td> : null}
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
          {positions.map((position) => (
            <MobilePositionCard
              compactStyle="inline"
              expanded={expandedMobileCard === position.id}
              key={position.id}
              onAddTransaction={onAddTransaction}
              onDelete={onDeletePosition}
              onEdit={onEditPosition}
              onToggle={() => setExpandedMobileCard((current) => current === position.id ? null : position.id)}
              position={position}
              summaryMetricIds={summaryMetricIds}
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
                  <td>{transaction.type}</td>
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
                <span className="signal-pill signal-hold">{transaction.type}</span>
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
