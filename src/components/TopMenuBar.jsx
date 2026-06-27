import React from "react";

export function TopMenuBar({
  embedded = false,
  hasPortfolio,
  canWritePortfolio = true,
  onAddPosition,
  onAddTransaction,
  onUploadTransactions,
  onOpenPortfolioSwitch,
  selectedPortfolioName,
  visible = true,
}) {
  return (
    <div className={`top-menu-bar ${embedded ? "top-menu-bar-embedded" : ""} ${visible ? "is-visible" : "is-hidden"}`}>
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
            disabled={!hasPortfolio || !canWritePortfolio}
            onClick={onAddPosition}
            title={!canWritePortfolio ? "Read-only shared portfolio" : "Add position"}
            type="button"
          >
            <span aria-hidden="true" className="top-menu-action-icon">💼</span>
            <span className="top-menu-action-label top-menu-action-label-desktop">Add/Edit Position</span>
            <span className="top-menu-action-label top-menu-action-label-mobile">Pos</span>
          </button>
          <button
            aria-label="Add transaction"
            className="top-menu-action-button"
            disabled={!hasPortfolio || !canWritePortfolio}
            onClick={onAddTransaction}
            title={!canWritePortfolio ? "Read-only shared portfolio" : "Add transaction"}
            type="button"
          >
            <span aria-hidden="true" className="top-menu-action-icon">🧾</span>
            <span className="top-menu-action-label top-menu-action-label-desktop">Add Transaction</span>
            <span className="top-menu-action-label top-menu-action-label-mobile">Txn</span>
          </button>
          <button
            aria-label="Upload transactions"
            className="top-menu-action-button"
            disabled={!hasPortfolio || !canWritePortfolio}
            onClick={onUploadTransactions}
            title={!canWritePortfolio ? "Read-only shared portfolio" : "Upload transactions"}
            type="button"
          >
            <span aria-hidden="true" className="top-menu-action-icon">⬆️</span>
            <span className="top-menu-action-label">Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
