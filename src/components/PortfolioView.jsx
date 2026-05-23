import React from "react";
import { compactMoney, money, pct, pctMagnitude, pctPlain, sourceLabel } from "../utils/format";
import { ModalSheet } from "./ModalSheet";
import { getPositionSummaryMetricConfig, MobilePositionCard, normalizePositionSummaryMetricIds, PositionSummaryMetricControl } from "./MobilePositionCard";
import { PortfolioBar } from "./PortfolioBar";

function SignalBadge({ signal }) {
  const normalized = signal || "HOLD";
  return <span className={`signal-pill signal-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function SourceBadge({ source }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source)}</span>;
}

function PositionDetailsModal({ position, onClose, onEditPosition, onDeletePosition }) {
  if (!position) return null;

  return (
    <ModalSheet title="Position details" subtitle={`${position.ticker} overview`} onClose={onClose}>
      <div className="position-detail-sheet">
        <div className="position-detail-hero">
          <div className="position-detail-hero-main">
            <div className="position-detail-title">
              <strong>{position.ticker}</strong>
              <SignalBadge signal={position.signal} />
            </div>
            <p>{(position.company || "").trim() || "—"}</p>
          </div>
          <div className="position-detail-title-actions">
            <button className="mini-button mini-button-secondary" onClick={() => onEditPosition(position)} type="button">Edit</button>
            <button className="mini-button mini-button-danger" onClick={() => onDeletePosition(position)} type="button">Delete</button>
          </div>
        </div>
        <div className="position-detail-summary-strip">
          <div className="position-detail-grid-card">
            <span>Value</span>
            <strong>{compactMoney(position.current)}</strong>
          </div>
          <div className="position-detail-grid-card">
            <span>Allocation</span>
            <strong>{Number(position.weight || 0).toFixed(1)}%</strong>
          </div>
          <div className="position-detail-grid-card">
            <span>Shares</span>
            <strong>{Number(position.shares || 0).toLocaleString()} sh</strong>
          </div>
          <div className="position-detail-grid-card">
            <span>Avg Price</span>
            <strong>{money(Number(position.shares || 0) > 0 ? Number(position.invested || 0) / Number(position.shares || 0) : 0, 2)}</strong>
          </div>
        </div>
        <div className="position-detail-grid">
          <div>
            <span>Price</span>
            <strong>{money(position.price, 2)}</strong>
            <small><SourceBadge source={position.priceSource} /></small>
          </div>
          <div><span>Peak Price</span><strong>{money(position.peak, 2)}</strong></div>
          <div><span>PnL</span><strong>{pct(position.pnlPct)}</strong></div>
          <div><span>PnL $</span><strong>{money(Number(position.current || 0) - Number(position.invested || 0), 0)}</strong></div>
          <div><span>Weight</span><strong>{pctPlain(position.weight)}</strong></div>
          <div><span>Target</span><strong>{pctPlain(position.target)}</strong></div>
          <div><span>Drawdown</span><strong>{pct(position.dd)}</strong></div>
          <div><span>Volatility</span><strong>{pctMagnitude(position.volatility)}</strong></div>
          <div><span>Corr Trigger</span><strong>{pctMagnitude(Math.abs(position.corr))}</strong><small>{money(position.correctionTrigger, 0)}</small></div>
          <div><span>DD_P Trigger</span><strong>{pctMagnitude(Math.abs(position.ddPlan))}</strong><small>{money(position.drawdownTrigger, 0)}</small></div>
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
                          <span className="portfolio-bar-position-company">{position.company || "—"}</span>
                        </div>
                        <div className="portfolio-bar-position-values">
                          {summaryMetricIds.map((metricId) => {
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
        onClose={() => setDetailPosition(null)}
        onDeletePosition={onDeletePosition}
        onEditPosition={onEditPosition}
        position={detailPosition}
      />
    </main>
  );
}
