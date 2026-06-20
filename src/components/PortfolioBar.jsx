import React from "react";
import { TrashIcon } from "./icons/TrashIcon";

export function PortfolioBar({
  portfolios,
  portfolioId,
  selectedPortfolioIds,
  onApplySelection,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const [draftName, setDraftName] = React.useState("");
  const [draftSelectedIds, setDraftSelectedIds] = React.useState(selectedPortfolioIds);
  const draftSelectedIdSet = React.useMemo(() => new Set(draftSelectedIds || []), [draftSelectedIds]);

  React.useEffect(() => {
    setDraftSelectedIds(selectedPortfolioIds);
  }, [selectedPortfolioIds]);

  function submitCreate() {
    const name = draftName.trim();
    if (!name) return;
    onCreate({name});
    setDraftName("");
  }

  function toggleDraftSelection(nextPortfolioId) {
    if (!nextPortfolioId) return;
    setDraftSelectedIds((current) => (
      current.includes(nextPortfolioId)
        ? current.filter((id) => id !== nextPortfolioId)
        : [...current, nextPortfolioId]
    ));
  }

  function applySelection() {
    onApplySelection(draftSelectedIds, portfolioId);
  }

  const portfolioGroups = [
    {title: "Owned by me", items: portfolios.filter((portfolio) => !portfolio.shared)},
    {title: "Shared with me", items: portfolios.filter((portfolio) => portfolio.shared)},
  ].filter((group) => group.items.length);

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
          {portfolioGroups.map((group) => (
            <div className="portfolio-list-group" key={group.title}>
              <p className="portfolio-list-group-title">{group.title}</p>
              {group.items.map((portfolio) => (
                <div
                  className={`portfolio-list-item ${draftSelectedIdSet.has(portfolio.id) ? "active" : ""}`}
                  key={portfolio.id}
                >
              <div
                className={`portfolio-chip ${draftSelectedIdSet.has(portfolio.id) ? "active" : ""} ${portfolio.id === portfolioId ? "current" : ""}`}
              >
                <button
                  className="portfolio-chip-select"
                  onClick={() => onSelect(portfolio.id)}
                  type="button"
                >
                  <span>{portfolio.name}</span>
                  {portfolio.defaultPortfolio ? <small>DEFAULT</small> : null}
                  {portfolio.shared ? <small>{portfolio.accessLevel === "FULL" ? `SHARED FULL${portfolio.ownerEmail ? ` | ${portfolio.ownerEmail}` : ""}` : `SHARED READ${portfolio.ownerEmail ? ` | ${portfolio.ownerEmail}` : ""}`}</small> : null}
                </button>
                <label className="portfolio-list-item-check">
                  <input
                    checked={draftSelectedIdSet.has(portfolio.id)}
                    onChange={() => toggleDraftSelection(portfolio.id)}
                    type="checkbox"
                  />
                </label>
              </div>
              <div className="portfolio-list-item-actions">
                <button
                  aria-label={`Rename ${portfolio.name}`}
                  className="toolbar-icon-button portfolio-list-item-action"
                  disabled={portfolio.shared && portfolio.accessLevel !== "FULL"}
                  onClick={() => onRename(portfolio)}
                  title={portfolio.shared && portfolio.accessLevel !== "FULL" ? "Read-only shared portfolio" : "Rename portfolio"}
                  type="button"
                >
                  <span aria-hidden="true">✎</span>
                </button>
                <button
                  aria-label={`Delete ${portfolio.name}`}
                  className="toolbar-icon-button toolbar-icon-button-danger portfolio-list-item-action"
                  disabled={portfolio.shared}
                  onClick={() => onDelete(portfolio)}
                  title={portfolio.shared ? "Only the owner can delete a portfolio" : "Delete portfolio"}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
              ))}
            </div>
          ))}
        </div>
        <div className="portfolio-switch-actions portfolio-bar-apply-row">
          <button
            className="modal-close portfolio-switch-apply"
            onClick={applySelection}
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </section>
  );
}
