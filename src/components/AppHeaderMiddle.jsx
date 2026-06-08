import React from "react";
import {TopMenuBar} from "./TopMenuBar";

export function AppHeaderMiddle({
  hasPortfolio,
  onAddPosition,
  onAddTransaction,
  onOpenPortfolioSwitch,
  selectedPortfolioName,
}) {
  return (
    <TopMenuBar
      embedded
      hasPortfolio={hasPortfolio}
      onAddPosition={onAddPosition}
      onAddTransaction={onAddTransaction}
      onOpenPortfolioSwitch={onOpenPortfolioSwitch}
      selectedPortfolioName={selectedPortfolioName}
      visible
    />
  );
}
