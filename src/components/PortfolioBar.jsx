import React from "react";
import { TrashIcon } from "./icons/TrashIcon";

export function PortfolioBar({
  portfolios,
  portfolioId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId);
  const [draftName, setDraftName] = React.useState("");

  function submitCreate() {
    const name = draftName.trim();
    if (!name) return;
    onCreate({name});
    setDraftName("");
  }

  return (
    <section className="portfolio-bar">
      <div className="portfolio-bar-main">
        <div className="portfolio-bar-top">
          <p className="eyebrow">PORTFOLIOS</p>
          <div className="portfolio-toolbar">
            <div className="portfolio-toolbar-create">
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
              <button
                aria-label="Create portfolio"
                className="toolbar-icon-button"
                onClick={submitCreate}
                title="Create portfolio"
                type="button"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        </div>
        <div className="portfolio-chip-row">
          {portfolios.map((portfolio) => (
            <div className={`portfolio-list-item ${portfolio.id === portfolioId ? "active" : ""}`} key={portfolio.id}>
              <button
                className={`portfolio-chip ${portfolio.id === portfolioId ? "active" : ""}`}
                onClick={() => onSelect(portfolio.id)}
                type="button"
              >
                <span>{portfolio.name}</span>
                {portfolio.defaultPortfolio ? <small>DEFAULT</small> : null}
              </button>
              <div className="portfolio-list-item-actions">
                <button
                  aria-label={`Rename ${portfolio.name}`}
                  className="toolbar-icon-button portfolio-list-item-action"
                  onClick={() => onRename(portfolio)}
                  title="Rename portfolio"
                  type="button"
                >
                  <span aria-hidden="true">✎</span>
                </button>
                <button
                  aria-label={`Delete ${portfolio.name}`}
                  className="toolbar-icon-button toolbar-icon-button-danger portfolio-list-item-action"
                  onClick={() => onDelete(portfolio)}
                  title="Delete portfolio"
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
