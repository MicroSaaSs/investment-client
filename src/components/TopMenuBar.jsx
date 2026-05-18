import React from "react";

export function TopMenuBar({
  hasPortfolio,
  onAddPosition,
  onAddTransaction,
  onOpenPortfolioSwitch,
  selectedPortfolioName,
  visible = true,
}) {
  return (
    <div className={`top-menu-bar ${visible ? "is-visible" : "is-hidden"}`}>
      <div className="top-menu-bar-inner">
        <button
          className="top-menu-portfolio"
          disabled={!hasPortfolio}
          onClick={onOpenPortfolioSwitch}
          type="button"
        >
          <strong>{selectedPortfolioName || "Select portfolio"}</strong>
        </button>
        <div className="top-menu-actions">
          <button
            aria-label="Add position"
            className="top-menu-action-button"
            disabled={!hasPortfolio}
            onClick={onAddPosition}
            title="Add position"
            type="button"
          >
            <span className="top-menu-action-label">Add/Edit Position</span>
          </button>
          <button
            aria-label="Add transaction"
            className="top-menu-action-button"
            disabled={!hasPortfolio}
            onClick={onAddTransaction}
            title="Add transaction"
            type="button"
          >
            <span className="top-menu-action-label">Add Transaction</span>
          </button>
        </div>
      </div>
    </div>
  );
}
