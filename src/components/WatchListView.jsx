import React from "react";
import { money, pct, pctNegative, sourceLabel } from "../utils/format";
import { TrashIcon } from "./icons/TrashIcon";

const DEFAULT_WATCH_SETTINGS = {
  peakWindowMonths: 5,
  avgDrawdownWindowMonths: 36,
  stepSizeMonths: 4,
};

function companyLabel(position) {
  return (position.company || "").trim() || "—";
}

function SourceBadge({ source, type }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source, type)}</span>;
}

function portfolioHint(position) {
  return String(position?.portfolioName || "").trim();
}

export function WatchListView({ positions, onCreateWatch, onDeleteWatch }) {
  const watchSettings = DEFAULT_WATCH_SETTINGS;
  const settingsLine = `Default watch settings: Peak window ${watchSettings.peakWindowMonths} mo · Avg drawdown window ${watchSettings.avgDrawdownWindowMonths} mo · Step size ${watchSettings.stepSizeMonths} mo.`;
  const sorted = [...positions].sort((left, right) => left.avgDrawdown - right.avgDrawdown);
  const highestAvgDrawdown = sorted[0] || null;
  const deepestDrawdown = [...positions].sort((left, right) => left.dd - right.dd)[0] || null;

  if (!positions.length) {
    return (
      <section className="panel watchlist-panel">
        <div className="panel-heading panel-heading-inline">
          <div>
            <p className="eyebrow">WATCH LIST</p>
            <h2>Potential holdings to monitor</h2>
            <p className="panel-copy">Add tickers you are researching and keep an eye on price, peak pressure, and avg drawdown before they become active positions. {settingsLine}</p>
          </div>
          <button className="action-button" onClick={onCreateWatch} type="button">Add Watch</button>
        </div>
        <div className="watchlist-empty">
          <div className="watchlist-empty-card">
            <p className="modal-kicker">READY FOR RESEARCH</p>
            <h3>No watch items yet</h3>
            <p>Start with the names you are considering next. Each watch item keeps the market snapshot simple: price, peak, drawdown, and average drawdown. {settingsLine}</p>
            <button className="action-button action-button-secondary" onClick={onCreateWatch} type="button">Create first watch item</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel watchlist-panel">
      <div className="panel-heading panel-heading-inline">
        <div>
          <p className="eyebrow">WATCH LIST</p>
          <h2>Potential holdings to monitor</h2>
          <p className="panel-copy">Track price, peak pressure, and average drawdown before a position joins the portfolio. {settingsLine}</p>
        </div>
        <button className="action-button" onClick={onCreateWatch} type="button">Add Watch</button>
      </div>
      <div className="watchlist-summary-grid">
        <article className="watchlist-summary-card">
          <span>Items tracked</span>
          <strong>{positions.length}</strong>
          <small>Research names on this list</small>
        </article>
        <article className="watchlist-summary-card">
          <span>Highest avg drawdown</span>
          <strong>{highestAvgDrawdown ? `${highestAvgDrawdown.ticker}: ${pctNegative(highestAvgDrawdown.avgDrawdown)}` : "—"}</strong>
          <small>{highestAvgDrawdown ? companyLabel(highestAvgDrawdown) : "No data yet"}</small>
        </article>
        <article className="watchlist-summary-card">
          <span>Deepest drawdown</span>
          <strong>{deepestDrawdown ? `${deepestDrawdown.ticker}: ${pct(deepestDrawdown.dd)}` : "—"}</strong>
          <small>{deepestDrawdown ? `Peak ${money(deepestDrawdown.peak, 2)}` : "No data yet"}</small>
        </article>
      </div>
      <div className="table-wrap desktop-table watchlist-desktop-table">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th className="table-center">Price</th>
              <th className="table-center">Peak Price</th>
              <th className="table-center">Drawdown</th>
              <th className="table-center">Avg Drawdown</th>
              <th className="table-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((position) => (
              <tr key={`${position.portfolioContextId || position.portfolioId || "portfolio"}:${position.id}`} title={portfolioHint(position) ? `Portfolio: ${portfolioHint(position)}` : undefined}>
                <td><strong>{position.ticker}</strong></td>
                <td>{companyLabel(position)}</td>
                <td className="table-center">
                  <div className="table-cell-stack table-cell-stack-center">
                    <span>{money(position.price, 2)}</span>
                    <small><SourceBadge source={position.priceSource} type={position.type} /></small>
                  </div>
                </td>
                <td className="table-center">{money(position.peak, 2)}</td>
                <td className="table-center">{pct(position.dd)}</td>
                <td className="table-center">{pctNegative(position.avgDrawdown)}</td>
                <td className="table-center">
                  <div className="row-actions row-actions-center">
                    <button className="mini-button mini-button-danger" onClick={() => onDeleteWatch(position)} type="button">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {sorted.map((position) => (
          <article className="mobile-card mobile-card-position" key={`${position.portfolioContextId || position.portfolioId || "portfolio"}:${position.id}`}>
            <div className="mobile-card-top">
              <div>
                <div className="mobile-transaction-title-block">
                  <strong>{position.ticker}</strong>
                  {portfolioHint(position) ? <span className="portfolio-row-hint mobile-portfolio-row-hint">{portfolioHint(position)}</span> : null}
                </div>
                <small>{companyLabel(position)}</small>
              </div>
              <div className="mobile-position-card-actions mobile-position-card-actions-inline">
                <button
                  aria-label={`Delete ${position.ticker} watch item`}
                  className="toolbar-icon-button toolbar-icon-button-danger mobile-position-card-action"
                  onClick={() => onDeleteWatch(position)}
                  title="Delete watch item"
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
            <div className="mobile-stat-grid">
              <div>
                <span>Price</span>
                <strong>{money(position.price, 2)}</strong>
                <small><SourceBadge source={position.priceSource} type={position.type} /></small>
              </div>
              <div><span>Peak</span><strong>{money(position.peak, 2)}</strong></div>
              <div><span>Drawdown</span><strong>{pct(position.dd)}</strong></div>
              <div><span>Avg Drawdown</span><strong>{pctNegative(position.avgDrawdown)}</strong></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
