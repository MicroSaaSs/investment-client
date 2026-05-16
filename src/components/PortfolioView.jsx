import {compactMoney} from "../utils/format";
import {PortfolioBar} from "./PortfolioBar";

export function PortfolioView({
  portfolios,
  portfolioId,
  metrics,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId) || null;
  const activePositions = (metrics?.positions || []).filter((position) => position.mode !== "WATCHLIST");
  const includedCount = activePositions.filter((position) => position.includeInAllocation).length;
  const cashCount = activePositions.filter((position) => position.type === "CASH" || position.type === "CASH_ETF").length;

  return (
    <main className="portfolio-view">
      <PortfolioBar
        metrics={metrics}
        portfolios={portfolios}
        portfolioId={portfolioId}
        onCreate={onCreate}
        onDelete={onDelete}
        onRename={onRename}
        onSelect={onSelect}
      />
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
              <strong>{compactMoney(metrics?.totalValue)}</strong>
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
    </main>
  );
}
