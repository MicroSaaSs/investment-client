import React from "react";
import {ModalSheet} from "./ModalSheet";

export function PortfolioSelectionModal({
  onApply,
  onClose,
  portfolioId,
  portfolios,
  selectedPortfolioIds,
}) {
  const [draftSelectedIds, setDraftSelectedIds] = React.useState(selectedPortfolioIds);

  React.useEffect(() => {
    setDraftSelectedIds(selectedPortfolioIds);
  }, [selectedPortfolioIds]);

  const selectionCount = draftSelectedIds.length;
  const subtitle = selectionCount > 1
    ? `${selectionCount} portfolios are selected. Choose which portfolios should be included, then apply the shared selection. The current portfolio still drives dashboard, positions, watch list, and avg drawdown.`
    : "Choose which portfolios should be included, then apply the shared selection. The current portfolio still drives dashboard, positions, watch list, and avg drawdown.";

  function toggleDraftSelection(nextPortfolioId) {
    if (!nextPortfolioId) return;
    setDraftSelectedIds((current) => (
      current.includes(nextPortfolioId)
        ? current.filter((id) => id !== nextPortfolioId)
        : [...current, nextPortfolioId]
    ));
  }

  function handleApply() {
    onApply(draftSelectedIds);
    onClose();
  }

  return (
    <ModalSheet title="Switch portfolio" subtitle={subtitle} onClose={onClose}>
      <div className="portfolio-switch-list">
        {portfolios.map((portfolio) => {
          const isCurrent = portfolio.id === portfolioId;
          const isSelected = draftSelectedIds.includes(portfolio.id);
          return (
            <label
              className={`portfolio-switch-row ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""}`}
              key={portfolio.id}
            >
              <div className="portfolio-switch-copy">
                <strong>{portfolio.name}</strong>
                <span>{isCurrent ? "Current portfolio" : (portfolio.defaultPortfolio ? "Default portfolio" : "Portfolio workspace")}</span>
              </div>
              <input
                checked={isSelected}
                onChange={() => toggleDraftSelection(portfolio.id)}
                type="checkbox"
              />
            </label>
          );
        })}
      </div>
      <div className="portfolio-switch-actions">
        <button
          className="modal-close portfolio-switch-apply"
          onClick={handleApply}
          type="button"
        >
          Apply
        </button>
      </div>
    </ModalSheet>
  );
}
