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
  const [draftName, setDraftName] = React.useState("");

  function submitCreate() {
    const name = draftName.trim();
    if (!name) return;
    onCreate({name});
    setDraftName("");
  }

  return (
    <section className="portfolio-bar">
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
    </section>
  );
}
