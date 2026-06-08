import React from "react";

const DATE_FILTERS = [
  {value: "24h", label: "24h"},
  {value: "7d", label: "7 days"},
  {value: "30d", label: "30 days"},
  {value: "all", label: "All"},
];

function formatNewsDate(value) {
  if (!value) return "Recent";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function NewsItemCard({ item }) {
  if (!item) return null;
  return (
    <article className="news-card">
      <div className="news-card-meta">
        <span>{item.ticker || item.provider}</span>
        {item.portfolioName ? <span className="portfolio-row-hint news-portfolio-hint">{item.portfolioName}</span> : null}
        <span>{formatNewsDate(item.publishedAt)}</span>
      </div>
      <h3>{item.headline}</h3>
      {item.summary ? <p>{item.summary}</p> : null}
      <div className="news-card-footer">
        <span>{item.source || item.provider}</span>
        <a href={item.url} rel="noreferrer" target="_blank">Open</a>
      </div>
    </article>
  );
}

function NewsSection({ eyebrow, title, items, emptyText }) {
  return (
    <section className="news-section">
      <div className="news-section-head">
        <p className="eyebrow">{eyebrow}</p>
        <strong>{title}</strong>
      </div>
      {items?.length ? (
        <div className="news-grid">
          {items.map((item) => <NewsItemCard item={item} key={item.id || item.url} />)}
        </div>
      ) : (
        <div className="news-empty">{emptyText}</div>
      )}
    </section>
  );
}

export function NewsView({ news, newsBusy, newsFilters, onRefresh, portfolioName, tickers }) {
  const trackedTickers = tickers || [];

  return (
    <main className="news-layout">
      <section className="panel news-panel">
        <div className="panel-heading panel-heading-inline">
          <div>
            <p className="eyebrow">NEWS</p>
            <h2>Market and company flow</h2>
            <p className="panel-copy">Scan broad market headlines, ticker-specific updates, and official press releases for {portfolioName || "this portfolio"} without leaving the workspace.</p>
          </div>
          <button className="action-button" disabled={newsBusy} onClick={onRefresh} type="button">
            {newsBusy ? "Refreshing..." : "Refresh news"}
          </button>
        </div>

        <div className="news-summary-strip">
          <div className="news-summary-card">
            <span>Tracked tickers</span>
            <strong>{trackedTickers.length}</strong>
            <small>{trackedTickers.length ? trackedTickers.join(" · ") : "No tickers available yet"}</small>
          </div>
          <div className="news-summary-card">
            <span>Market headlines</span>
            <strong>{news?.marketNews?.length || 0}</strong>
            <small>Broad market context from Finnhub</small>
          </div>
          <div className="news-summary-card">
            <span>Company updates</span>
            <strong>{(news?.companyNews?.length || 0) + (news?.pressReleases?.length || 0)}</strong>
            <small>Portfolio-specific stories across tracked holdings</small>
          </div>
        </div>

        <div className="news-filter-row">
          <label className="news-filter">
            <span>Ticker</span>
            <select onChange={(event) => onRefresh({ticker: event.target.value})} value={newsFilters?.ticker || "all"}>
              <option value="all">All tickers</option>
              {trackedTickers.map((ticker) => (
                <option key={ticker} value={ticker}>{ticker}</option>
              ))}
            </select>
          </label>
          <label className="news-filter">
            <span>Date</span>
            <select onChange={(event) => onRefresh({period: event.target.value})} value={newsFilters?.period || "7d"}>
              {DATE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <NewsSection
          emptyText="No company-specific headlines were returned for the tracked tickers."
          eyebrow="COMPANY"
          items={news?.companyNews}
          title="Ticker-specific news"
        />
        <NewsSection
          emptyText="No recent press releases were returned for the tracked tickers."
          eyebrow="PRESS"
          items={news?.pressReleases}
          title="Official press releases"
        />
        <NewsSection
          emptyText="No broad market headlines returned right now."
          eyebrow="MARKET"
          items={news?.marketNews}
          title="Market pulse"
        />
      </section>
    </main>
  );
}
