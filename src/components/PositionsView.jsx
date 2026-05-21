import React from "react";
import { money, pct, pctMagnitude, pctPlain, sourceLabel } from "../utils/format";

function companyLabel(position) {
  return (position.company || "").trim() || "—";
}

function pnlAmount(position) {
  return Number(position.current || 0) - Number(position.invested || 0);
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

export function PositionsView({
  positions,
  transactions,
  onDeletePosition,
  onDeleteTransaction,
  onEditPosition,
  onEditTransaction,
}) {
  const [expandedMobileCard, setExpandedMobileCard] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("positions");

  return (
    <div className="positions-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="panel-subtabs" role="tablist" aria-label="Positions content tabs">
              <button
                aria-selected={activeTab === "positions"}
                className={`panel-subtab ${activeTab === "positions" ? "active" : ""}`}
                onClick={() => setActiveTab("positions")}
                role="tab"
                type="button"
              >
                <span className="eyebrow">POSITIONS</span>
                <strong>Holdings and model drift</strong>
              </button>
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
        <div className="table-wrap desktop-table positions-desktop-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th className="table-center">Price</th>
                <th className="table-center">Peak Price</th>
                <th className="table-center">Value</th>
                <th className="table-center">PnL %</th>
                <th className="table-center">PnL $</th>
                <th className="table-center">Allocation</th>
                <th className="table-center">Drawdown</th>
                <th className="table-center">Volatility</th>
                <th className="table-center">Triggers</th>
                <th className="table-center">Signal</th>
                <th className="table-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
                  <td>
                    <div className="table-cell-stack">
                      <strong>{position.ticker}</strong>
                      <small className="shares-tag">{Number(position.shares || 0).toLocaleString()} sh</small>
                    </div>
                  </td>
                  <td>
                    <div className="table-cell-stack table-company-cell">
                      <span>{companyLabel(position)}</span>
                    </div>
                  </td>
                  <td className="table-center">
                    <div className="table-cell-stack table-cell-stack-center">
                      <span>{money(position.price, 2)}</span>
                      <small><SourceBadge source={position.priceSource} /></small>
                    </div>
                  </td>
                  <td className="table-center">{money(position.peak, 2)}</td>
                  <td className="table-center">
                    <div className="table-cell-stack table-cell-stack-center">
                      <ValueBlock position={position} />
                    </div>
                  </td>
                  <td className="table-center">{pct(position.pnlPct)}</td>
                  <td className="table-center">{money(pnlAmount(position), 0)}</td>
                  <td className="table-center">
                    <div className="table-cell-stack table-cell-stack-center">
                      <AllocationBlock position={position} />
                    </div>
                  </td>
                  <td className="table-center">{pct(position.dd)}</td>
                  <td className="table-center">{pctMagnitude(position.volatility)}</td>
                  <td className="table-center">
                    <TriggerBlock position={position} />
                  </td>
                  <td className="table-center"><SignalPill signal={position.signal} /></td>
                  <td className="table-center">
                    <div className="row-actions row-actions-center">
                      <button className="mini-button" onClick={() => onEditPosition(position)} type="button">Edit</button>
                      <button className="mini-button mini-button-danger" onClick={() => onDeletePosition(position)} type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-list">
          {positions.map((position) => (
            <article className="mobile-card mobile-card-position" key={position.id}>
              <button
                className="mobile-card-toggle"
                onClick={() => setExpandedMobileCard((current) => current === position.id ? null : position.id)}
                type="button"
              >
                <div className="mobile-card-top">
                  <div>
                    <strong>{position.ticker}</strong>
                    <small>{companyLabel(position)}</small>
                  </div>
                  <div className="mobile-card-top-meta">
                    <SignalPill signal={position.signal} />
                    <span className="mobile-expand-label">{expandedMobileCard === position.id ? "Hide" : "Open"}</span>
                  </div>
                </div>
                <div className="mobile-card-summary">
                  <span>{money(position.price, 0)} price</span>
                  <span>{money(pnlAmount(position), 0)} pnl $</span>
                  <span>{pct(position.dd)} dd %</span>
                </div>
              </button>
              {expandedMobileCard === position.id ? (
                <>
                  <div className="mobile-stat-grid">
                    <div><span>Peak</span><strong>{money(position.peak, 2)}</strong></div>
                    <div>
                      <span>Value</span>
                      <div className="mobile-dual-value">
                        <strong>Invest {money(position.invested, 0)}</strong>
                        <small>Curr {money(position.current, 0)}</small>
                      </div>
                    </div>
                    <div><span>PnL %</span><strong>{pct(position.pnlPct)}</strong></div>
                    <div>
                      <span>Allocation</span>
                      <div className="mobile-dual-value">
                        <strong>Target {pctPlain(position.target)}</strong>
                        <small>Curr {pctPlain(position.weight)}</small>
                      </div>
                    </div>
                    <div><span>Volatility</span><strong>{pctMagnitude(position.volatility)}</strong></div>
                    <div className="mobile-trigger-cell">
                      <span>Triggers</span>
                      <div className="mobile-trigger-block">
                        <div className="trigger-value-row">
                          <strong>CORR</strong>
                          <strong>{pctMagnitude(Math.abs(position.corr))}</strong>
                          <small>{money(position.correctionTrigger, 0)}</small>
                        </div>
                        <div className="trigger-value-row">
                          <strong>DD_P</strong>
                          <strong>{pctMagnitude(Math.abs(position.ddPlan))}</strong>
                          <small>{money(position.drawdownTrigger, 0)}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row-actions row-actions-mobile">
                    <button className="mini-button" onClick={() => onEditPosition(position)} type="button">Edit</button>
                    <button className="mini-button mini-button-danger" onClick={() => onDeletePosition(position)} type="button">Delete</button>
                  </div>
                </>
              ) : null}
            </article>
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
                    <span aria-hidden="true">×</span>
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
