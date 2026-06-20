import React from "react";
import {TopMenuBar} from "./TopMenuBar";

export function AppHeaderMiddle({
  hasPortfolio,
  canWritePortfolio,
  onAddPosition,
  onAddTransaction,
  onOpenPortfolioSwitch,
  selectedPortfolioName,
}) {
  return (
    <TopMenuBar
      embedded
      canWritePortfolio={canWritePortfolio}
      hasPortfolio={hasPortfolio}
      onAddPosition={onAddPosition}
      onAddTransaction={onAddTransaction}
      onOpenPortfolioSwitch={onOpenPortfolioSwitch}
      selectedPortfolioName={selectedPortfolioName}
      visible
    />
  );
}
