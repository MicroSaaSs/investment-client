import React from "react";
import {money, pct, pctMagnitude, sourceLabel} from "../utils/format";

function companyLabel(position) {
  return (position.company || "").trim() || "—";
}

function pnlAmount(position) {
  return Number(position.current || 0) - Number(position.invested || 0);
}

function SignalPill({signal}) {
  const normalized = (signal || "HOLD").toLowerCase();
  return <span className={`signal-pill signal-${normalized}`}>{signal || "HOLD"}</span>;
}

function SourceBadge({source}) {
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

  return (
    <div className="positions-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">POSITIONS</p>
            <h2>Holdings and model drift</h2>
            <p className="panel-copy">Track live pricing, target weights, and drawdown pressure across your current positions.</p>
          </div>
        </div>
        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th className="table-center">Price</th>
                <th className="table-center">Peak Price</th>
                <th className="table-center">PnL</th>
                <th className="table-center">PnL $</th>
                <th className="table-center">Weight</th>
                <th className="table-center">Target</th>
                <th className="table-center">Drawdown</th>
                <th className="table-center">Volatility</th>
                <th className="table-center">Signal</th>
                <th className="table-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
                  <td>
                    <strong>{position.ticker}</strong>
                  </td>
                  <td>
                    <div className="table-cell-stack">
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
                  <td className="table-center">{pct(position.pnlPct)}</td>
                  <td className="table-center">{money(pnlAmount(position), 0)}</td>
                  <td className="table-center">{pct(position.weight)}</td>
                  <td className="table-center">{pct(position.target)}</td>
                  <td className="table-center">{pct(position.dd)}</td>
                  <td className="table-center">{pctMagnitude(position.volatility)}</td>
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
                <span>{money(position.current)} current</span>
                <span>{pct(position.weight)} weight</span>
                <span>{pct(position.dd)} drawdown</span>
              </div>
              </button>
              {expandedMobileCard === position.id ? (
                <>
                  <div className="mobile-stat-grid">
                    <div>
                      <span>Price</span>
                      <strong>{money(position.price, 2)}</strong>
                      <small><SourceBadge source={position.priceSource} /></small>
                    </div>
                    <div><span>Peak</span><strong>{money(position.peak, 2)}</strong></div>
                    <div><span>PnL %</span><strong>{pct(position.pnlPct)}</strong></div>
                    <div><span>PnL $</span><strong>{money(pnlAmount(position), 0)}</strong></div>
                    <div><span>Weight</span><strong>{pct(position.weight)}</strong></div>
                    <div><span>Target</span><strong>{pct(position.target)}</strong></div>
                    <div><span>Drawdown</span><strong>{pct(position.dd)}</strong></div>
                    <div><span>Volatility</span><strong>{pctMagnitude(position.volatility)}</strong></div>
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
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TRANSACTIONS</p>
            <h2>Execution history</h2>
            <p className="panel-copy">Review the trades that built this portfolio and keep every entry editable.</p>
          </div>
        </div>
        <div className="table-wrap desktop-table">
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
                  <small>{transaction.date}</small>
                </div>
                <span className="signal-pill signal-hold">{transaction.type}</span>
              </div>
              <div className="mobile-stat-grid">
                <div><span>Shares</span><strong>{Number(transaction.shares || 0).toLocaleString()}</strong></div>
                <div><span>Price</span><strong>{money(transaction.price, 2)}</strong></div>
                <div><span>Fees</span><strong>{money(transaction.fees, 2)}</strong></div>
              </div>
              <div className="row-actions row-actions-mobile">
                <button className="mini-button" onClick={() => onEditTransaction(transaction)} type="button">Edit</button>
                <button className="mini-button mini-button-danger" onClick={() => onDeleteTransaction(transaction)} type="button">Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
