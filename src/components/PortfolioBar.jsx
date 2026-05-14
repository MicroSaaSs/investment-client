import React from "react";

export function PortfolioBar({
  portfolios,
  portfolioId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId);

  return (
    <section className="portfolio-bar">
      <div className="portfolio-bar-top">
        <div>
          <p className="eyebrow">PORTFOLIOS</p>
          <h2>{selected ? selected.name : "Select a portfolio"}</h2>
        </div>
        <div className="portfolio-toolbar">
          <button className="toolbar-button" onClick={onCreate} type="button">New</button>
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
    </section>
  );
}
