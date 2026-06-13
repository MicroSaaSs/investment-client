import React from "react";
import {AppHeader} from "./AppHeader";
import {AppHeaderMiddle} from "./AppHeaderMiddle";
import {TopMenuBar} from "./TopMenuBar";
import {TabNav} from "./TabNav";
import {EmptyState} from "./EmptyState";
import {PortfolioView} from "./PortfolioView";
import {DashboardView} from "./DashboardView";
import {PositionsView} from "./PositionsView";
import {WatchListView} from "./WatchListView";
import {NewsView} from "./NewsView";
import {AvgDrawdownView} from "./AvgDrawdownView";
import {AiView} from "./AiView";

export function AppWorkspaceContent(props) {
  const {
    aiSettings,
    aiSettingsBusy,
    aiSummary,
    aiSummaryBusy,
    avgDrawdownPositions,
    currentUser,
    dashboardMetrics,
    effectiveSelectedPortfolioIds,
    equityHistory,
    equityHistoryBusy,
    equityMode,
    equityRange,
    error,
    fetchAiSummary,
    onOpenCreatePortfolio,
    handleTabChange,
    holdingsPositionSummaryMetrics,
    metrics,
    news,
    newsBusy,
    newsFilters,
    onAccount,
    onAddPosition,
    onAddTransaction,
    onPositionAddTransaction,
    onCreateWatch,
    onDeletePortfolio,
    onDeletePosition,
    onDeleteTransaction,
    onEditPosition,
    onEditTransaction,
    onEquityModeChange,
    onEquityRangeChange,
    onLogout,
    onNewsRefresh,
    onOpenPortfolioSwitch,
    onPortfolioPositionSummaryMetricsChange,
    onPortfolioRename,
    onPortfolioSelect,
    onReorderPositions,
    onSettingsChange,
    onPositionsSubtabChange,
    onTransactionFromPortfolio,
    onWatchDelete,
    onWorkspacePortfolioDeletePosition,
    onWorkspacePortfolioEditPosition,
    portfolioId,
    portfolioName,
    portfolioPositionSummaryMetrics,
    portfolioTabBusy,
    portfolioTabDataById,
    portfolios,
    positions,
    rawPositions,
    selectedAiHasInvestedPosition,
    selectedPortfolio,
    showBottomNav,
    showLogout,
    showTopBar,
    summaryBusy,
    tab,
    tickers,
    topMenuPortfolioLabel,
    transactions,
    updatePositionSummaryMetrics,
    watchlistPositions,
    positionsSubtab,
  } = props;

  return (
    <div className="app-shell">
      <div className="app">
        <AppHeader
          middle={(
            <AppHeaderMiddle
              hasPortfolio={Boolean(selectedPortfolio)}
              onAddPosition={onAddPosition}
              onAddTransaction={onAddTransaction}
              onOpenPortfolioSwitch={onOpenPortfolioSwitch}
              selectedPortfolioName={topMenuPortfolioLabel}
            />
          )}
          onAccount={onAccount}
          onLogout={onLogout}
          showLogout={showLogout}
        />

        <TopMenuBar
          hasPortfolio={Boolean(selectedPortfolio)}
          onAddPosition={onAddPosition}
          onAddTransaction={onAddTransaction}
          onOpenPortfolioSwitch={onOpenPortfolioSwitch}
          selectedPortfolioName={topMenuPortfolioLabel}
          visible={showTopBar}
        />

        {error ? <div className="error">{error}</div> : null}

        <TabNav
          onChange={handleTabChange}
          tab={tab}
          visible={showBottomNav}
        />

        {!portfolios.length ? <EmptyState onCreatePortfolio={onOpenCreatePortfolio} /> : null}
        {portfolios.length && tab === "portfolios" ? (
          <PortfolioView
            metrics={metrics}
            mobilePositionSummaryMetrics={portfolioPositionSummaryMetrics}
            onMobilePositionSummaryMetricsChange={onPortfolioPositionSummaryMetricsChange}
            onReorderPositions={onReorderPositions}
            portfolioId={portfolioId}
            portfolioTabBusy={portfolioTabBusy}
            portfolioTabDataById={portfolioTabDataById}
            portfolios={portfolios}
            selectedPortfolioIds={effectiveSelectedPortfolioIds}
            onAddTransaction={onTransactionFromPortfolio}
            onCreate={onOpenCreatePortfolio}
            onDelete={onDeletePortfolio}
            onDeletePosition={onWorkspacePortfolioDeletePosition}
            onEditPosition={onWorkspacePortfolioEditPosition}
            onRename={onPortfolioRename}
            onSelect={onPortfolioSelect}
          />
        ) : null}
        {portfolios.length && tab === "dashboard" ? (
          <DashboardView
            equityHistory={equityHistory}
            equityHistoryBusy={equityHistoryBusy}
            equityMode={equityMode}
            equityRange={equityRange}
            metrics={dashboardMetrics || metrics}
            multiPortfolioMode={effectiveSelectedPortfolioIds.length > 1}
            onEquityModeChange={onEquityModeChange}
            onEquityRangeChange={onEquityRangeChange}
          />
        ) : null}
        {portfolios.length && tab === "positions" ? (
          <PositionsView
            activeSubtab={positionsSubtab}
            mobilePositionSummaryMetrics={holdingsPositionSummaryMetrics}
            onAddTransaction={onPositionAddTransaction}
            onDeletePosition={onDeletePosition}
            onDeleteTransaction={onDeleteTransaction}
            onEditPosition={onEditPosition}
            onEditTransaction={onEditTransaction}
            onMobilePositionSummaryMetricsChange={(nextMetricIds) => updatePositionSummaryMetrics("holdings", nextMetricIds)}
            onReorderPositions={onReorderPositions}
            onSubtabChange={onPositionsSubtabChange}
            positions={positions}
            transactions={transactions}
          />
        ) : null}
        {portfolios.length && tab === "watchlist" ? (
          <WatchListView
            onCreateWatch={onCreateWatch}
            onDeleteWatch={onWatchDelete}
            positions={watchlistPositions}
          />
        ) : null}
        {portfolios.length && tab === "news" ? (
          <NewsView
            news={news}
            newsBusy={newsBusy}
            newsFilters={newsFilters}
            onRefresh={onNewsRefresh}
            portfolioName={portfolioName}
            tickers={tickers}
          />
        ) : null}
        {portfolios.length && tab === "avg-drawdown" ? <AvgDrawdownView avgDrawdown={avgDrawdownPositions} /> : null}
        {portfolios.length && tab === "ai" ? (
          <AiView
            aiSettings={aiSettings}
            aiSummary={aiSummary}
            currentUser={currentUser}
            onFetchSummary={fetchAiSummary}
            onSaveSettings={props.onSaveAiSettings}
            onSettingsChange={onSettingsChange}
            hasInvestedPosition={selectedAiHasInvestedPosition}
            portfolios={portfolios}
            portfolioId={portfolioId}
            portfolioName={portfolioName}
            settingsBusy={aiSettingsBusy}
            summaryBusy={summaryBusy || aiSummaryBusy}
          />
        ) : null}
      </div>
    </div>
  );
}
