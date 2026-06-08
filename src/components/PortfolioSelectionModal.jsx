import React from "react";
import {ModalSheet} from "./ModalSheet";

export function PortfolioSelectionModal({
  onClose,
  onSelect,
  portfolioId,
  portfolios,
  selectedPortfolioIds,
}) {
  const selectionCount = selectedPortfolioIds.length;
  const subtitle = selectionCount > 1
    ? `${selectionCount} portfolios are selected. Tap rows to add or remove them from the shared selection. The current portfolio still drives dashboard, positions, watch list, and avg drawdown.`
    : "Tap rows to build the shared portfolio selection. The current portfolio still drives dashboard, positions, watch list, and avg drawdown.";

  return (
    <ModalSheet title="Switch portfolio" subtitle={subtitle} onClose={onClose}>
      <div className="portfolio-switch-list">
        {portfolios.map((portfolio) => {
          const isCurrent = portfolio.id === portfolioId;
          const isSelected = selectedPortfolioIds.includes(portfolio.id);
          return (
            <button
              className={`portfolio-switch-row ${isCurrent ? "active" : ""} ${isSelected ? "selected" : ""}`}
              key={portfolio.id}
              onClick={() => onSelect(portfolio.id)}
              type="button"
            >
              <div>
                <strong>{portfolio.name}</strong>
                <span>{portfolio.defaultPortfolio ? "Default portfolio" : "Portfolio workspace"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </ModalSheet>
  );
}
