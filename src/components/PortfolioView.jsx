import React from "react";
import { compactMoney, money, pct, pctMagnitude, pctPlain, sourceLabel } from "../utils/format";
import { ModalSheet } from "./ModalSheet";
import { getPositionSummaryMetricConfig, MobilePositionCard, normalizePositionSummaryMetricIds, PositionSummaryMetricControl } from "./MobilePositionCard";
import { PortfolioBar } from "./PortfolioBar";
import { TrashIcon } from "./icons/TrashIcon";

function SignalBadge({ signal }) {
  const normalized = signal || "HOLD";
  return <span className={`signal-pill signal-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function SourceBadge({ source }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source)}</span>;
}

function isCashPosition(position) {
  return position?.type === "CASH";
}

function companyLabel(position) {
  if (position?.type === "CASH") return "Uninvested cash";
  return (position.company || "").trim() || "—";
}

function PositionDetailsModal({ position, onClose, onEditPosition, onDeletePosition, onAddTransaction }) {
  if (!position) return null;
  const isCash = isCashPosition(position);
  const avgPrice = Number(position.shares || 0) > 0 ? Number(position.invested || 0) / Number(position.shares || 0) : 0;
  const pnlValue = Number(position.current || 0) - Number(position.invested || 0);

  return (
    <ModalSheet
      className="position-details-modal"
      title="Position details"
      onClose={onClose}
      headerActions={onAddTransaction ? (
        <button
          aria-label={`Add transaction for ${position.ticker}`}
          className="toolbar-icon-button txn-toolbar-icon-button"
          onClick={() => onAddTransaction(position)}
          title="Add transaction"
          type="button"
        >
          <span aria-hidden="true" className="txn-icon-stack">
            <i>🧾</i>
            <b>Txn</b>
          </span>
        </button>
      ) : null}
    >
      <div className="position-detail-sheet">
        <div className="position-detail-hero">
          <div className="position-detail-hero-main">
            <div className="position-detail-title">
              <strong>{position.ticker}</strong>
              <SignalBadge signal={position.signal} />
            </div>
            <p>{companyLabel(position)}</p>
          </div>
          <div className="position-detail-title-actions">
            <button
              aria-label={`Edit ${position.ticker}`}
              className="toolbar-icon-button"
              onClick={() => onEditPosition(position)}
              title="Edit"
              type="button"
            >
              <span aria-hidden="true">✎</span>
            </button>
            <button
              aria-label={`Delete ${position.ticker}`}
              className="toolbar-icon-button toolbar-icon-button-danger"
              onClick={() => onDeletePosition(position)}
              title="Delete"
              type="button"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        <div className="position-detail-grid">
          <div className="position-detail-grid-card">
            <span>Value</span>
            <div className="position-detail-lines">
              <strong>Invest {money(position.invested, 0)}</strong>
              <strong>Curr {money(position.current, 0)}</strong>
            </div>
          </div>
          {!isCash ? (
            <>
              <div className="position-detail-grid-card">
                <span>Allocation</span>
                <div className="position-detail-lines">
                  <strong>Target {pctPlain(position.target)}</strong>
                  <strong>Curr {pctPlain(position.weight)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Shares</span>
                <div className="position-detail-lines">
                  <strong>{Number(position.shares || 0).toLocaleString()} sh</strong>
                  <strong>Avg {money(avgPrice, 2)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Price</span>
                <div className="position-detail-price-line">
                  <strong>{money(position.price, 2)}</strong>
                  <small><SourceBadge source={position.priceSource} /></small>
                </div>
                <strong className="position-detail-secondary-value">Peak {money(position.peak, 2)}</strong>
              </div>
              <div className="position-detail-grid-card">
                <span>PnL</span>
                <div className="position-detail-lines">
                  <strong>{money(pnlValue, 0)}</strong>
                  <strong>{pct(position.pnlPct)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Drawdown</span>
                <strong>{pct(position.dd)}</strong>
              </div>
              <div className="position-detail-grid-card">
                <span>Volatility</span>
                <strong>{pctMagnitude(position.volatility)}</strong>
              </div>
              <div className="position-detail-grid-card">
                <span>Triggers</span>
                <div className="position-detail-trigger-lines">
                  <div className="position-detail-trigger-row">
                    <strong>CORR {pctMagnitude(Math.abs(position.corr))}</strong>
                    <strong>{money(position.correctionTrigger, 0)}</strong>
                  </div>
                  <div className="position-detail-trigger-row">
                    <strong>DD_P {pctMagnitude(Math.abs(position.ddPlan))}</strong>
                    <strong>{money(position.drawdownTrigger, 0)}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ModalSheet>
  );
}

export function PortfolioView({
  portfolios,
  portfolioId,
  metrics,
  mobilePositionSummaryMetrics,
  onEditPosition,
  onDeletePosition,
  onAddTransaction,
  onMobilePositionSummaryMetricsChange,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const [detailPosition, setDetailPosition] = React.useState(null);
  const [expandedMobileCard, setExpandedMobileCard] = React.useState(null);
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId) || null;
  const activePositions = (metrics?.positions || []).filter((position) => position.mode !== "WATCHLIST");
  const sortedPositions = [...activePositions].sort((left, right) => Number(right.current || 0) - Number(left.current || 0));
  const summaryMetricIds = normalizePositionSummaryMetricIds(mobilePositionSummaryMetrics);
  const includedCount = activePositions.filter((position) => position.includeInAllocation).length;
  const cashCount = activePositions.filter((position) => position.type === "CASH" || position.type === "CASH_ETF").length;
  const pnlPctValue = Number(metrics?.pnlPct || 0);
  const pnlTrendArrow = pnlPctValue < 0 ? "↓" : "↑";

  return (
    <main className="portfolio-view">
      <div className="portfolio-view-layout">
        <PortfolioBar
          portfolios={portfolios}
          portfolioId={portfolioId}
          onCreate={onCreate}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
        {selected ? (
          <section className="panel portfolio-preview-panel">
            <div className="panel-heading panel-heading-inline positions-heading-row">
              <div>
                <p className="eyebrow">POSITIONS</p>
              </div>
              <PositionSummaryMetricControl
                className="positions-heading-settings"
                onChange={onMobilePositionSummaryMetricsChange}
                selectedMetricIds={summaryMetricIds}
              />
            </div>
            <div className="portfolio-bar-summary portfolio-preview-desktop-list">
              <div className="portfolio-bar-summary-list">
                {sortedPositions.map((position) => (
                  <button
                    className="portfolio-bar-position"
                    key={position.id}
                    onClick={() => setDetailPosition(position)}
                    type="button"
                  >
                    <div className="portfolio-bar-position-main">
                      <div className="portfolio-bar-position-title-row">
                        <div className="portfolio-bar-position-title-main">
                          <div className="portfolio-bar-position-head">
                            <strong>{position.ticker}</strong>
                            <SignalBadge signal={position.signal} />
                          </div>
                          <span className="portfolio-bar-position-company">{companyLabel(position)}</span>
                        </div>
                        <div className="portfolio-bar-position-values">
                          {(isCashPosition(position) ? ["valueCurrent"] : summaryMetricIds).map((metricId) => {
                            const metric = getPositionSummaryMetricConfig(metricId, position);
                            return <strong key={metric.id}>{metric.summary}</strong>;
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!sortedPositions.length ? <div className="portfolio-bar-summary-empty">Add positions to see the portfolio overview here.</div> : null}
              </div>
            </div>
            <div className="portfolio-preview-mobile-list">
              <div className="mobile-list">
                {sortedPositions.map((position) => (
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
                {!sortedPositions.length ? <div className="portfolio-bar-summary-empty">Add positions to see the portfolio overview here.</div> : null}
              </div>
            </div>
          </section>
        ) : null}
        {selected ? (
          <section className="panel portfolio-overview-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">OVERVIEW</p>
                <h2>{selected.name} at a glance</h2>
                <p className="panel-copy">Quick portfolio context before you jump into holdings, watch ideas, or volatility analysis.</p>
              </div>
            </div>
            <div className="portfolio-overview-grid">
              <article className="portfolio-overview-card">
                <span>Active holdings</span>
                <strong>{activePositions.length}</strong>
                <small>{includedCount} included in target model</small>
              </article>
              <article className="portfolio-overview-card">
                <span>Cash positions</span>
                <strong>{cashCount}</strong>
                <small>Cash buckets and treasury ETF sleeves</small>
              </article>
              <article className="portfolio-overview-card">
                <span>Portfolio value</span>
                <div className="portfolio-overview-value-row">
                  <strong>{compactMoney(metrics?.totalValue)}</strong>
                  <i className={`portfolio-overview-trend ${pnlPctValue < 0 ? "down" : "up"}`}>{`· ${pnlTrendArrow} ${compactMoney(Math.abs(metrics?.pnl || 0))} · ${pct(Math.abs(pnlPctValue), 1).replace("+", "")}`}</i>
                </div>
                <small>Current marked-to-market value</small>
              </article>
              <article className="portfolio-overview-card">
                <span>Active signals</span>
                <strong>{metrics?.activeSignals || 0}</strong>
                <small>BUY1 / BUY2 opportunities now</small>
              </article>
            </div>
          </section>
        ) : null}
      </div>
      <PositionDetailsModal
        onAddTransaction={(position) => {
          setDetailPosition(null);
          onAddTransaction?.(position);
        }}
        onClose={() => setDetailPosition(null)}
        onDeletePosition={onDeletePosition}
        onEditPosition={onEditPosition}
        position={detailPosition}
      />
    </main>
  );
}
