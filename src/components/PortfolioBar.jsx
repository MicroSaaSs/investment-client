import React from "react";
import {compactMoney} from "../utils/format";

function SignalBadge({signal}) {
  const normalized = signal || "HOLD";
  return <span className={`signal-pill signal-${normalized.toLowerCase()}`}>{normalized}</span>;
}

export function PortfolioBar({
  portfolios,
  portfolioId,
  metrics,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId);
  const [draftName, setDraftName] = React.useState("");
  const positions = (metrics?.positions || []).filter((position) => position.mode !== "WATCHLIST");
  const sortedPositions = [...positions].sort((left, right) => Number(right.current || 0) - Number(left.current || 0));

  function submitCreate() {
    const name = draftName.trim();
    if (!name) return;
    onCreate({name});
    setDraftName("");
  }

  return (
    <section className="portfolio-bar">
      <div className="portfolio-bar-grid">
        <div className="portfolio-bar-main">
          <div className="portfolio-bar-top">
            <div>
              <p className="eyebrow">PORTFOLIOS</p>
              <h2>{selected ? selected.name : "Choose a portfolio"}</h2>
            </div>
            <div className="portfolio-toolbar">
              <button className="toolbar-button" disabled={!selected} onClick={() => selected && onRename(selected)} type="button">Rename</button>
              <button className="toolbar-button toolbar-button-danger" disabled={!selected} onClick={() => selected && onDelete(selected)} type="button">Delete</button>
            </div>
          </div>
          <div className="portfolio-chip-row">
            {portfolios.map((portfolio) => (
              <button
                className={`portfolio-chip ${portfolio.id === portfolioId ? "active" : ""}`}
                key={portfolio.id}
                onClick={() => onSelect(portfolio.id)}
                type="button"
              >
                <span>{portfolio.name}</span>
                {portfolio.defaultPortfolio ? <small>DEFAULT</small> : null}
              </button>
            ))}
          </div>
          <div className="portfolio-create-row">
            <input
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCreate();
                }
              }}
              placeholder="New portfolio name"
              type="text"
              value={draftName}
            />
            <button className="portfolio-create-button" onClick={submitCreate} type="button">Create</button>
          </div>
        </div>

        <aside className="portfolio-bar-summary">
          <div className="portfolio-bar-summary-list">
            {sortedPositions.map((position) => (
              <article className="portfolio-bar-position" key={position.id}>
                <div className="portfolio-bar-position-head">
                  <strong>{position.ticker}</strong>
                  <SignalBadge signal={position.signal} />
                </div>
                <small>{compactMoney(position.current)} · {Number(position.weight || 0).toFixed(1)}% · {Number(position.shares || 0).toLocaleString()} sh</small>
              </article>
            ))}
            {!sortedPositions.length ? <div className="portfolio-bar-summary-empty">Add positions to see the portfolio overview here.</div> : null}
          </div>
        </aside>
      </div>
      <div className="portfolio-mobile-summary">
        <div className="portfolio-mobile-summary-list">
          {sortedPositions.map((position) => (
            <article className="portfolio-mobile-position" key={position.id}>
              <div className="portfolio-bar-position-head">
                <strong>{position.ticker}</strong>
                <SignalBadge signal={position.signal} />
              </div>
              <small>{compactMoney(position.current)} · {Number(position.weight || 0).toFixed(1)}% · {Number(position.shares || 0).toLocaleString()} sh</small>
            </article>
          ))}
          {!sortedPositions.length ? <div className="portfolio-bar-summary-empty">Add positions to see the portfolio overview here.</div> : null}
        </div>
      </div>
    </section>
  );
}
