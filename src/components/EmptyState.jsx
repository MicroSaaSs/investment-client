import React from "react";

export function EmptyState({onCreatePortfolio}) {
  return (
    <section className="empty-state">
      <p className="eyebrow">GET STARTED</p>
      <h2>No portfolios yet</h2>
      <p>Create your first portfolio to start tracking positions, transactions, volatility, and AI-ready signals.</p>
      <button className="action-button action-button-secondary" onClick={onCreatePortfolio} type="button">Create Portfolio</button>
    </section>
  );
}
