import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {AuthScreen} from "./components/AuthScreen";
import {AppModals} from "./components/AppModals";
import {DEFAULT_NEWS_FILTERS} from "./constants/appConstants";
import {useAiWorkspace} from "./hooks/useAiWorkspace";
import {useAuthFlow} from "./hooks/useAuthFlow";
import {usePortfolioMultiSelection} from "./hooks/usePortfolioMultiSelection";
import {usePortfolioCrud} from "./hooks/usePortfolioCrud";
import {useScrollNavVisibility} from "./hooks/useScrollNavVisibility";
import {useWorkspaceData} from "./hooks/useWorkspaceData";
import {AppWorkspaceContent} from "./components/AppWorkspaceContent";
import {
  getTelegramInitData,
} from "./utils/appHelpers";
import "./styles.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  const [equityRange, setEquityRange] = useState("month");
  const [equityMode, setEquityMode] = useState("daily");
  const [tab, setTab] = useState("dashboard");
  const [positionsSubtab, setPositionsSubtab] = useState("positions");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const telegramInitData = getTelegramInitData();
  const {showTopBar, showBottomNav} = useScrollNavVisibility();
  const {
    ensurePortfolioTabSelectionLoaded,
    equityHistory,
    equityHistoryBusy,
    loadPortfolios,
    metrics,
    news,
    newsBusy,
    newsFilters,
    portfolioId,
    portfolioTabBusy,
    portfolioTabDataById,
    portfolios,
    portfoliosBusy,
    rawPositions,
    refreshEquityHistory,
    refreshNews,
    refreshPortfolioViews,
    refreshPortfolioTabSnapshot,
    resetWorkspaceData,
    setEquityHistory,
    setMetrics,
    setNews,
    setNewsFilters,
    setPortfolioId,
    setRawPositions,
    setTransactions,
    transactions,
    workspaceBusy,
  } = useWorkspaceData({
    equityMode,
    equityRange,
    onError: setError,
    tab,
  });
  const {
    authBusy,
    authForm,
    authMode,
    createTelegramLinkCode,
    currentUser,
    emailLinkForm,
    handleEmailLink,
    handleGoogleLink,
    handleTelegramMerge,
    isAuthenticated,
    isTelegramMiniApp,
    linkSession,
    logout: runLogout,
    setAuthMode,
    setTelegramLinkCode,
    showLogout,
    submitAuth,
    telegramLinkCode,
    telegramLogin,
    updateAuthField,
    updateEmailLinkField,
  } = useAuthFlow({
    googleClientId: GOOGLE_CLIENT_ID,
    loadPortfolios,
    onError: setError,
    onLogoutCleanup: () => {
      resetWorkspaceData();
      setModal(null);
    },
    telegramInitData,
  });
  const {
    aiSettings,
    aiSettingsBusy,
    aiSummary,
    aiSummaryBusy,
    fetchAiSummary,
    holdingsPositionSummaryMetrics,
    portfolioPositionSummaryMetrics,
    resetAiWorkspace,
    selectedAiHasInvestedPosition,
    setAiSummary,
    updateAiSetting,
    updatePositionSummaryMetrics,
    saveAiSettings,
  } = useAiWorkspace({
    isAuthenticated,
    metrics,
    onError: setError,
    portfolioId,
    portfolios,
  });
  const {
    applyPortfolioSelection,
    effectiveSelectedPortfolioIds,
    selectedPortfolioIds,
    selectPrimaryPortfolio,
    selectedPortfolio,
    setSelectedPortfolioIds,
    togglePortfolioSelection,
    topMenuPortfolioLabel,
  } = usePortfolioMultiSelection({
    ensurePortfolioTabSelectionLoaded,
    portfolioId,
    portfolioTabDataById,
    portfolios,
    setMetrics,
    setPortfolioId,
    setRawPositions,
    tab,
  });
  const {
    handleCreatePortfolio,
    handleCreatePosition,
    handleCreateTransaction,
    handleDeletePortfolio,
    handleDeletePosition,
    handleDeleteTransaction,
    handleEditPosition,
    handleEditTransaction,
    handleRenamePortfolio,
    reorderPositions,
  } = usePortfolioCrud({
    getRawPositionsForPortfolio: (id) => {
      if (!id) return [];
      if (id === portfolioId) return rawPositions;
      return portfolioTabDataById[id]?.rawPositions || [];
    },
    loadPortfolios,
    onError: setError,
    onAfterTransactionMutation: () => setPositionsSubtab("transactions"),
    portfolioId,
    rawPositions,
    refreshPortfolioTabSnapshot,
    refreshPortfolioViews,
    selectedPortfolio,
    setEquityHistory,
    setMetrics,
    setModal,
    setPortfolioId,
    setRawPositions,
    setTransactions,
  });

  useEffect(() => {
    if (!portfolioId) return;
    setAiSummary(null);
    setNews(null);
    setNewsFilters(DEFAULT_NEWS_FILTERS);
  }, [portfolioId, setNews, setNewsFilters]);

  function handleTabChange(nextTab) {
    setTab(nextTab);
    if (["dashboard", "portfolios", "positions", "watchlist", "news", "avg-drawdown"].includes(nextTab)) {
      ensurePortfolioTabSelectionLoaded(effectiveSelectedPortfolioIds, portfolioId);
    }
  }

  const positions = metrics?.positions || [];
  const activePositions = positions.filter((position) => position.mode !== "WATCHLIST");
  const watchlistPositions = positions.filter((position) => position.mode === "WATCHLIST");
  const activeRawPositions = rawPositions.filter((position) => (position.mode || "ACTIVE") !== "WATCHLIST");
  const selectedPortfolioOptions = useMemo(
    () => effectiveSelectedPortfolioIds
      .map((id) => portfolios.find((portfolio) => portfolio.id === id))
      .filter(Boolean),
    [effectiveSelectedPortfolioIds, portfolios]
  );
  const rawPositionsByPortfolio = useMemo(
    () =>
      Object.fromEntries(
        portfolios.map((portfolio) => [
          portfolio.id,
          portfolio.id === portfolioId ? rawPositions : (portfolioTabDataById[portfolio.id]?.rawPositions || []),
        ])
      ),
    [portfolioId, portfolioTabDataById, portfolios, rawPositions]
  );
  const activeRawPositionsByPortfolio = useMemo(
    () =>
      Object.fromEntries(
        portfolios.map((portfolio) => [
          portfolio.id,
          (rawPositionsByPortfolio[portfolio.id] || []).filter((position) => (position.mode || "ACTIVE") !== "WATCHLIST"),
        ])
      ),
    [portfolios, rawPositionsByPortfolio]
  );
  const portfolioNameById = useMemo(
    () => Object.fromEntries(portfolios.map((portfolio) => [portfolio.id, portfolio.name])),
    [portfolios]
  );
  const selectedHoldingPortfolioIds = useMemo(() => {
    const ids = effectiveSelectedPortfolioIds.length ? effectiveSelectedPortfolioIds : (portfolioId ? [portfolioId] : []);
    return [...new Set(ids.filter(Boolean))];
  }, [effectiveSelectedPortfolioIds, portfolioId]);
  const selectedHoldingPortfolioKey = selectedHoldingPortfolioIds.join("|");
  const holdingsPositions = useMemo(() => {
    const seen = new Set();
    return selectedHoldingPortfolioIds.flatMap((id) => {
      const name = portfolioNameById[id] || "";
      const sourceMetrics = id === portfolioId ? metrics : portfolioTabDataById[id]?.metrics;
      return (sourceMetrics?.positions || [])
        .filter((position) => position.mode !== "WATCHLIST")
        .filter((position) => {
          if (!position?.id) return true;
          const key = `${id}:${position.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((position) => ({
          ...position,
          portfolioContextId: id,
          portfolioId: id,
          portfolioName: name,
        }));
    });
  }, [metrics, portfolioId, portfolioNameById, portfolioTabDataById, selectedHoldingPortfolioIds]);
  const holdingsTransactions = useMemo(() => {
    const seen = new Set();
    return selectedHoldingPortfolioIds.flatMap((id) => {
      const name = portfolioNameById[id] || "";
      const sourceTransactions = id === portfolioId ? transactions : (portfolioTabDataById[id]?.transactions || []);
      return (sourceTransactions || [])
        .filter((transaction) => {
          if (!transaction?.id) return true;
          const key = `${id}:${transaction.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((transaction) => ({
          ...transaction,
          portfolioContextId: id,
          portfolioId: id,
          portfolioName: name,
        }));
    });
  }, [portfolioId, portfolioNameById, portfolioTabDataById, selectedHoldingPortfolioIds, transactions]);
  const selectedWatchlistPositions = useMemo(() => {
    const seen = new Set();
    return selectedHoldingPortfolioIds.flatMap((id) => {
      const name = portfolioNameById[id] || "";
      const sourceMetrics = id === portfolioId ? metrics : portfolioTabDataById[id]?.metrics;
      return (sourceMetrics?.positions || [])
        .filter((position) => position.mode === "WATCHLIST")
        .filter((position) => {
          if (!position?.id) return true;
          const key = `${id}:${position.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((position) => ({
          ...position,
          portfolioContextId: id,
          portfolioId: id,
          portfolioName: name,
        }));
    });
  }, [metrics, portfolioId, portfolioNameById, portfolioTabDataById, selectedHoldingPortfolioIds]);
  const avgDrawdownPositions = useMemo(
    () => holdingsPositions.filter((position) => position.type !== "CASH" && position.type !== "CASH_ETF"),
    [holdingsPositions]
  );
  const dataBusy = portfoliosBusy || workspaceBusy;
  const tickers = useMemo(
    () => [...new Set(selectedHoldingPortfolioIds.flatMap((id) =>
      (rawPositionsByPortfolio[id] || [])
        .map((position) => String(position?.ticker || "").trim().toUpperCase())
        .filter((ticker) => ticker && ticker !== "CASH")
    ))],
    [rawPositionsByPortfolio, selectedHoldingPortfolioIds]
  );
  const dashboardMetrics = useMemo(() => {
    const ids = selectedHoldingPortfolioIds.length ? selectedHoldingPortfolioIds : (portfolioId ? [portfolioId] : []);
    if (!ids.length) return metrics;
    if (ids.length === 1 && ids[0] === portfolioId) return metrics;

    const dashboardPositions = [];
    let totalValue = 0;
    let invested = 0;
    let activeSignals = 0;
    for (const id of ids) {
      const sourceMetrics = id === portfolioId ? metrics : portfolioTabDataById[id]?.metrics;
      if (!sourceMetrics) continue;
      totalValue += Number(sourceMetrics.totalValue || 0);
      invested += Number(sourceMetrics.invested || 0);
      activeSignals += Number(sourceMetrics.activeSignals || 0);
      const portfolioName = portfolioNameById[id] || "";
      dashboardPositions.push(
        ...(sourceMetrics.positions || []).map((position) => ({
          ...position,
          portfolioContextId: id,
          portfolioId: id,
          portfolioName,
        }))
      );
    }
    const pnl = totalValue - invested;
    const cashTrackedValue = dashboardPositions
      .filter((position) => position.mode !== "WATCHLIST")
      .filter((position) => position.type === "CASH" || position.type === "CASH_ETF")
      .reduce((sum, position) => sum + Number(position.current || 0), 0);
    return {
      totalValue,
      invested,
      pnl,
      pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
      cashWeight: totalValue > 0 ? (cashTrackedValue / totalValue) * 100 : 0,
      activeSignals,
      positions: dashboardPositions,
    };
  }, [metrics, portfolioId, portfolioNameById, portfolioTabDataById, selectedHoldingPortfolioIds]);

  useEffect(() => {
    if (!portfolioId || tab !== "news") return;
    ensurePortfolioTabSelectionLoaded(selectedHoldingPortfolioIds, portfolioId);
    refreshNews(selectedHoldingPortfolioIds, {auto: true, filters: newsFilters}).catch((error) => {
      setError(String(error.message || error));
    });
  }, [newsFilters.period, newsFilters.ticker, portfolioId, selectedHoldingPortfolioKey, tab]);

  useEffect(() => {
    if (!portfolioId || tab !== "dashboard" || selectedHoldingPortfolioIds.length <= 1) return;
    ensurePortfolioTabSelectionLoaded(selectedHoldingPortfolioIds, portfolioId);
    refreshEquityHistory(selectedHoldingPortfolioIds, equityRange, equityMode).catch((error) => {
      setError(String(error.message || error));
    });
  }, [equityMode, equityRange, portfolioId, selectedHoldingPortfolioKey, tab]);
  const handleCreatePortfolioModal = () => setModal("create-portfolio");
  const handlePositionCreateModal = () => setModal("position");
  const handleTransactionCreateModal = () => {
    setPositionsSubtab("transactions");
    setModal("transaction");
  };
  const handleApplyPortfolioSelection = (nextSelectedIds) => {
    applyPortfolioSelection(nextSelectedIds);
    const normalizedIds = [...new Set((Array.isArray(nextSelectedIds) ? nextSelectedIds : []).filter(Boolean))];
    const idsToLoad = normalizedIds.length ? normalizedIds : (portfolioId ? [portfolioId] : []);
    if (!idsToLoad.length) return;
    if (["dashboard", "portfolios", "positions", "watchlist", "news", "avg-drawdown"].includes(tab)) {
      ensurePortfolioTabSelectionLoaded(idsToLoad, portfolioId);
    }
    if (tab === "dashboard" && idsToLoad.length > 1) {
      refreshEquityHistory(idsToLoad, equityRange, equityMode).catch((error) => {
        setError(String(error.message || error));
      });
    }
    if (tab === "news") {
      refreshNews(idsToLoad, {filters: newsFilters}).catch((error) => {
        setError(String(error.message || error));
      });
    }
  };
  const handlePortfolioSwitchModal = () => setModal("switch-portfolio");
  const handleWorkspaceAccountModal = () => setModal("account");
  const logout = () => {
    resetAiWorkspace();
    setSelectedPortfolioIds([]);
    runLogout();
  };

  function defaultTransactionPrice(position) {
    return Number(position?.price ?? position?.lastMarketPrice ?? 0);
  }

  function positionSourceForPortfolio(position, contextPortfolioId = portfolioId) {
    const sourcePositions = contextPortfolioId && portfolioTabDataById[contextPortfolioId]?.rawPositions
      ? portfolioTabDataById[contextPortfolioId].rawPositions
      : (contextPortfolioId === portfolioId ? rawPositions : []);
    const source = sourcePositions.find((item) => item.id === position.id) || position;
    return {
      ...source,
      portfolioId: contextPortfolioId,
      portfolioContextId: contextPortfolioId,
      lockedPortfolioId: contextPortfolioId,
    };
  }

  function transactionSeedForPosition(position, contextPortfolioId = portfolioId) {
    return {
      ticker: position.ticker,
      price: defaultTransactionPrice(position),
      portfolioId: contextPortfolioId,
      portfolioContextId: contextPortfolioId,
      lockedPortfolioId: contextPortfolioId,
    };
  }

  function transactionSeedForCurrentPortfolio(position) {
    return {
      ...transactionSeedForPosition(position, portfolioId),
      lockedPortfolioId: portfolioId,
    };
  }

  function transactionRecordWithPortfolioContext(transaction, contextPortfolioId = portfolioId) {
    return {
      ...transaction,
      portfolioId: contextPortfolioId,
      portfolioContextId: contextPortfolioId,
    };
  }

  function parseAutoCashTransferNote(note) {
    const raw = String(note || "").trim();
    if (!raw.startsWith("AUTO_CASH_TRANSFER:")) return null;
    const [, action = "", ticker = ""] = raw.split(":");
    return {
      action: action.trim().toUpperCase(),
      ticker: ticker.trim().toUpperCase(),
    };
  }

  function transactionAmount(transaction) {
    const shares = Math.max(Number(transaction?.shares || 0), 0);
    const price = Math.max(Number(transaction?.price || 0), 0);
    if (shares > 0 && price > 0) return shares * price;
    if (shares > 0) return shares;
    return price;
  }

  function expectedCashTransferAmount(transaction) {
    const type = String(transaction?.type || "").trim().toUpperCase();
    const shares = Math.max(Number(transaction?.shares || 0), 0);
    const price = Math.max(Number(transaction?.price || 0), 0);
    const fees = Math.max(Number(transaction?.fees || 0), 0);
    const notional = shares * price;
    switch (type) {
      case "BUY":
        return notional + fees;
      case "SELL":
        return Math.max(0, notional - fees);
      case "DIVIDEND":
      case "FEE":
        return transactionAmount(transaction);
      default:
        return 0;
    }
  }

  function findCashTransferCompanion(transaction, contextPortfolioId = portfolioId) {
    const normalizedType = String(transaction?.type || "").trim().toUpperCase();
    const normalizedTicker = String(transaction?.ticker || "").trim().toUpperCase();
    if (!transaction?.id || transaction?.ticker === "CASH" || !["BUY", "SELL", "DIVIDEND", "FEE"].includes(normalizedType)) {
      return null;
    }
    const expectedCashType = normalizedType === "BUY" || normalizedType === "FEE" ? "WITHDRAWAL" : "DEPOSIT";
    const expectedAmount = expectedCashTransferAmount(transaction);
    const sourceTransactions = contextPortfolioId === portfolioId
      ? transactions
      : (portfolioTabDataById[contextPortfolioId]?.transactions || []);
    return (sourceTransactions || []).find((candidate) => {
      if (!candidate || candidate.id === transaction.id) return false;
      if (String(candidate.ticker || "").trim().toUpperCase() !== "CASH") return false;
      if (String(candidate.type || "").trim().toUpperCase() !== expectedCashType) return false;
      if (candidate.date !== transaction.date) return false;
      const parsedNote = parseAutoCashTransferNote(candidate.note);
      if (!parsedNote) return false;
      if (parsedNote.action !== normalizedType || parsedNote.ticker !== normalizedTicker) return false;
      return Math.abs(transactionAmount(candidate) - expectedAmount) < 0.0001;
    }) || null;
  }

  function transactionRecordWithCompanion(transaction, contextPortfolioId = portfolioId) {
    const base = transactionRecordWithPortfolioContext(transaction, contextPortfolioId);
    const cashTransfer = findCashTransferCompanion(transaction, contextPortfolioId);
    return cashTransfer ? {
      ...base,
      cashTransfer: transactionRecordWithPortfolioContext(cashTransfer, contextPortfolioId),
    } : base;
  }

  const workspaceAddTransactionHandler = (position) =>
    {
      const contextPortfolioId = position?.portfolioContextId || position?.portfolioId || portfolioId;
      setPositionsSubtab("transactions");
      setModal({type: "transaction", data: transactionSeedForPosition(position, contextPortfolioId)});
    };
  const workspaceEditPositionHandler = (position) =>
    setModal({type: "edit-position", data: positionSourceForPortfolio(position, position?.portfolioContextId || position?.portfolioId || portfolioId)});
  const workspaceDeletePositionHandler = (position) =>
    setModal({type: "delete-position", data: positionSourceForPortfolio(position, position?.portfolioContextId || position?.portfolioId || portfolioId)});
  const workspaceEditTransactionHandler = (transaction) =>
    {
      const contextPortfolioId = transaction?.portfolioContextId || transaction?.portfolioId || portfolioId;
      setPositionsSubtab("transactions");
      setModal({type: "edit-transaction", data: transactionRecordWithCompanion(transaction, contextPortfolioId)});
    };
  const workspaceDeleteTransactionHandler = (transaction) =>
    {
      const contextPortfolioId = transaction?.portfolioContextId || transaction?.portfolioId || portfolioId;
      setPositionsSubtab("transactions");
      setModal({type: "delete-transaction", data: transactionRecordWithCompanion(transaction, contextPortfolioId)});
    };
  const portfolioTabTransactionHandler = (position, contextPortfolioId = portfolioId) =>
    {
      setPositionsSubtab("transactions");
      setModal({type: "transaction", data: transactionSeedForPosition(position, contextPortfolioId)});
    };
  const portfolioTabDeletePositionHandler = (position, contextPortfolioId = portfolioId) =>
    setModal({type: "delete-position", data: positionSourceForPortfolio(position, contextPortfolioId)});
  const portfolioTabEditPositionHandler = (position, contextPortfolioId = portfolioId) =>
    setModal({type: "edit-position", data: positionSourceForPortfolio(position, contextPortfolioId)});

  if (!isAuthenticated) {
    return (
      <AuthScreen
        authBusy={authBusy}
        authForm={authForm}
        authMode={authMode}
        error={error}
        googleClientId={GOOGLE_CLIENT_ID}
        hasTelegramInitData={isTelegramMiniApp}
        telegramMode={isTelegramMiniApp}
        onAuthModeChange={setAuthMode}
        onTelegramLogin={telegramLogin}
        onFieldChange={updateAuthField}
        onSubmit={submitAuth}
        onTelegramLinkCodeChange={setTelegramLinkCode}
        telegramLinkCode={telegramLinkCode}
      />
    );
  }

  if (dataBusy) {
    return (
      <div className="app-shell">
        <div className="app">
          <AppWorkspaceContent
            aiSettings={aiSettings}
            aiSettingsBusy={aiSettingsBusy}
            aiSummary={aiSummary}
            aiSummaryBusy={aiSummaryBusy}
            avgDrawdownPositions={avgDrawdownPositions}
            currentUser={currentUser}
            effectiveSelectedPortfolioIds={effectiveSelectedPortfolioIds}
            equityHistory={equityHistory}
            equityHistoryBusy={equityHistoryBusy}
            equityMode={equityMode}
            equityRange={equityRange}
            error={error}
            fetchAiSummary={() => fetchAiSummary(selectedPortfolio?.name || "")}
            onOpenCreatePortfolio={handleCreatePortfolioModal}
            handleTabChange={handleTabChange}
            holdingsPositionSummaryMetrics={holdingsPositionSummaryMetrics}
            metrics={metrics}
            dashboardMetrics={dashboardMetrics}
            news={news}
            newsBusy={newsBusy}
            newsFilters={newsFilters}
            onAccount={handleWorkspaceAccountModal}
            onAddPosition={handlePositionCreateModal}
            onAddTransaction={handleTransactionCreateModal}
            onPositionAddTransaction={workspaceAddTransactionHandler}
            onCreateWatch={() => setModal("watchlist")}
            onDeletePortfolio={(portfolio) => setModal({type: "delete-portfolio", data: portfolio})}
            onDeletePosition={workspaceDeletePositionHandler}
            onDeleteTransaction={workspaceDeleteTransactionHandler}
            onEditPosition={workspaceEditPositionHandler}
            onEditTransaction={workspaceEditTransactionHandler}
            onEquityModeChange={setEquityMode}
            onEquityRangeChange={setEquityRange}
            onLogout={logout}
            onNewsRefresh={(nextFilters = {}) => refreshNews(selectedHoldingPortfolioIds, {
              filters: {
                ticker: nextFilters.ticker || newsFilters.ticker,
                period: nextFilters.period || newsFilters.period,
              },
            }).catch((e) => setError(String(e.message || e)))}
            onOpenPortfolioSwitch={handlePortfolioSwitchModal}
            onApplyPortfolioSelection={handleApplyPortfolioSelection}
            onPortfolioPositionSummaryMetricsChange={(nextMetricIds) => updatePositionSummaryMetrics("portfolio", nextMetricIds)}
            onPortfolioRename={(portfolio) => setModal({type: "rename-portfolio", data: portfolio})}
            onPortfolioSelect={selectPrimaryPortfolio}
            onPositionsSubtabChange={setPositionsSubtab}
            onReorderPositions={reorderPositions}
            onSaveAiSettings={saveAiSettings}
            onSettingsChange={updateAiSetting}
            onTransactionFromPortfolio={portfolioTabTransactionHandler}
            onWatchDelete={workspaceDeletePositionHandler}
            onWorkspacePortfolioDeletePosition={portfolioTabDeletePositionHandler}
            onWorkspacePortfolioEditPosition={portfolioTabEditPositionHandler}
            portfolioId={portfolioId}
            portfolioName={topMenuPortfolioLabel || selectedPortfolio?.name || ""}
            portfolioPositionSummaryMetrics={portfolioPositionSummaryMetrics}
            portfolioTabBusy={portfolioTabBusy}
            portfolioTabDataById={portfolioTabDataById}
            portfolios={portfolios}
            positions={holdingsPositions}
            positionsSubtab={positionsSubtab}
            rawPositions={rawPositions}
            selectedAiHasInvestedPosition={selectedAiHasInvestedPosition}
            selectedPortfolio={selectedPortfolio}
            showBottomNav={showBottomNav}
            showLogout={showLogout}
            showTopBar={showTopBar}
            summaryBusy={false}
            tab={tab}
            tickers={tickers}
            topMenuPortfolioLabel={topMenuPortfolioLabel}
            transactions={holdingsTransactions}
            updatePositionSummaryMetrics={updatePositionSummaryMetrics}
            watchlistPositions={selectedWatchlistPositions}
          />
          <div className="app-loading-screen" role="status" aria-live="polite">
            <div className="app-loading-screen-card">
              <div className="app-loading-spinner app-loading-spinner-large" />
              <div className="app-loading-copy">
                <strong>Loading portfolio data</strong>
                <span>Fetching portfolios, prices, transactions, and analytics.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppWorkspaceContent
        aiSettings={aiSettings}
        aiSettingsBusy={aiSettingsBusy}
        aiSummary={aiSummary}
        aiSummaryBusy={aiSummaryBusy}
        avgDrawdownPositions={avgDrawdownPositions}
        currentUser={currentUser}
        effectiveSelectedPortfolioIds={effectiveSelectedPortfolioIds}
        equityHistory={equityHistory}
        equityHistoryBusy={equityHistoryBusy}
        equityMode={equityMode}
        equityRange={equityRange}
        error={error}
        fetchAiSummary={() => fetchAiSummary(selectedPortfolio?.name || "")}
        onOpenCreatePortfolio={handleCreatePortfolioModal}
        handleTabChange={handleTabChange}
        holdingsPositionSummaryMetrics={holdingsPositionSummaryMetrics}
        metrics={metrics}
        dashboardMetrics={dashboardMetrics}
        news={news}
        newsBusy={newsBusy}
        newsFilters={newsFilters}
        onAccount={handleWorkspaceAccountModal}
        onAddPosition={handlePositionCreateModal}
        onAddTransaction={handleTransactionCreateModal}
        onPositionAddTransaction={workspaceAddTransactionHandler}
        onCreateWatch={() => setModal("watchlist")}
        onDeletePortfolio={(portfolio) => setModal({type: "delete-portfolio", data: portfolio})}
        onDeletePosition={workspaceDeletePositionHandler}
        onDeleteTransaction={workspaceDeleteTransactionHandler}
        onEditPosition={workspaceEditPositionHandler}
        onEditTransaction={workspaceEditTransactionHandler}
        onEquityModeChange={setEquityMode}
        onEquityRangeChange={setEquityRange}
        onLogout={logout}
        onNewsRefresh={(nextFilters = {}) => refreshNews(selectedHoldingPortfolioIds, {
          filters: {
            ticker: nextFilters.ticker || newsFilters.ticker,
            period: nextFilters.period || newsFilters.period,
          },
        }).catch((e) => setError(String(e.message || e)))}
        onOpenPortfolioSwitch={handlePortfolioSwitchModal}
        onApplyPortfolioSelection={handleApplyPortfolioSelection}
        onPortfolioPositionSummaryMetricsChange={(nextMetricIds) => updatePositionSummaryMetrics("portfolio", nextMetricIds)}
        onPortfolioRename={(portfolio) => setModal({type: "rename-portfolio", data: portfolio})}
        onPortfolioSelect={selectPrimaryPortfolio}
        onPositionsSubtabChange={setPositionsSubtab}
        onReorderPositions={reorderPositions}
        onSaveAiSettings={saveAiSettings}
        onSettingsChange={updateAiSetting}
        onTransactionFromPortfolio={portfolioTabTransactionHandler}
        onWatchDelete={workspaceDeletePositionHandler}
        onWorkspacePortfolioDeletePosition={portfolioTabDeletePositionHandler}
        onWorkspacePortfolioEditPosition={portfolioTabEditPositionHandler}
        portfolioId={portfolioId}
        portfolioName={topMenuPortfolioLabel || selectedPortfolio?.name || ""}
        portfolioPositionSummaryMetrics={portfolioPositionSummaryMetrics}
        portfolioTabBusy={portfolioTabBusy}
        portfolioTabDataById={portfolioTabDataById}
        portfolios={portfolios}
        positions={holdingsPositions}
        positionsSubtab={positionsSubtab}
        rawPositions={rawPositions}
        selectedAiHasInvestedPosition={selectedAiHasInvestedPosition}
        selectedPortfolio={selectedPortfolio}
        showBottomNav={showBottomNav}
        showLogout={showLogout}
        showTopBar={showTopBar}
        summaryBusy={false}
        tab={tab}
        tickers={tickers}
        topMenuPortfolioLabel={topMenuPortfolioLabel}
        transactions={holdingsTransactions}
        updatePositionSummaryMetrics={updatePositionSummaryMetrics}
        watchlistPositions={selectedWatchlistPositions}
      />

      <AppModals
        activeRawPositions={activeRawPositions}
        activeRawPositionsByPortfolio={activeRawPositionsByPortfolio}
        authBusy={authBusy}
        currentUser={currentUser}
        emailLinkForm={emailLinkForm}
        googleClientId={GOOGLE_CLIENT_ID}
        hasTelegramInitData={isTelegramMiniApp}
        linkSession={linkSession}
        modal={modal}
        onClose={() => setModal(null)}
        onCreateLinkCode={createTelegramLinkCode}
        onCreatePortfolio={handleCreatePortfolio}
        onCreatePosition={handleCreatePosition}
        onCreateTransaction={handleCreateTransaction}
        onDeletePortfolio={handleDeletePortfolio}
        onDeletePosition={handleDeletePosition}
        onDeleteTransaction={handleDeleteTransaction}
        onEditPosition={handleEditPosition}
        onEditTransaction={handleEditTransaction}
        onEmailLinkFieldChange={updateEmailLinkField}
        onGoogleCredential={handleGoogleLink}
        onLinkEmail={handleEmailLink}
        onLinkTelegram={handleTelegramMerge}
        onRenamePortfolio={handleRenamePortfolio}
        onApplyPortfolioSelection={handleApplyPortfolioSelection}
        portfolioId={portfolioId}
        portfolioOptions={portfolios}
        portfolios={portfolios}
        positionModalPositions={rawPositions}
        positionModalPositionsByPortfolio={rawPositionsByPortfolio}
        selectedPortfolioIds={selectedPortfolioIds}
        telegramLinkCode={telegramLinkCode}
        onTelegramLinkCodeChange={setTelegramLinkCode}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
