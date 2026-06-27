import {api} from "../services/api";
import {applyDisplayOrderToPositions, hasPortfolioTickerDuplicate, splitAllocationPayload, uniqueLatestAllocationAdjustments} from "../utils/appHelpers";

export function usePortfolioCrud({
  getRawPositionsForPortfolio,
  onError,
  onAfterTransactionMutation,
  loadPortfolios,
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
}) {
  function targetPortfolioIdFrom(payloadPortfolioId) {
    return payloadPortfolioId || portfolioId;
  }

  function positionsForPortfolio(targetPortfolioId) {
    if (!targetPortfolioId) return [];
    if (targetPortfolioId === portfolioId) return rawPositions;
    return getRawPositionsForPortfolio?.(targetPortfolioId) || [];
  }

  async function refreshAfterPortfolioMutation(targetPortfolioId) {
    if (!targetPortfolioId) return;
    if (targetPortfolioId === portfolioId) {
      await refreshPortfolioViews(targetPortfolioId);
      return;
    }
    await refreshPortfolioTabSnapshot?.(targetPortfolioId);
  }

  async function handleCreatePortfolio(payload) {
    onError("");
    const created = await api.createPortfolio({name: payload.name});
    const list = await loadPortfolios();
    const saved = list.find((portfolio) => portfolio.id === created.id) || created;
    setPortfolioId(saved.id);
    setModal(null);
  }

  async function handleRenamePortfolio(payload, targetPortfolio = selectedPortfolio) {
    if (!targetPortfolio) return;
    onError("");
    await api.updatePortfolio(targetPortfolio.id, {...targetPortfolio, name: payload.name});
    await loadPortfolios();
    setModal(null);
  }

  async function handleDeletePortfolio(targetPortfolio = selectedPortfolio) {
    if (!targetPortfolio) return;
    onError("");
    await api.deletePortfolio(targetPortfolio.id);
    setMetrics(null);
    setEquityHistory(null);
    setRawPositions([]);
    setTransactions([]);
    const list = await loadPortfolios();
    setPortfolioId(list[0]?.id || "");
    setModal(null);
  }

  async function handleCreatePosition(payload) {
    const targetPortfolioId = targetPortfolioIdFrom(payload?.portfolioId);
    if (!targetPortfolioId) return;
    onError("");
    const targetPositions = positionsForPortfolio(targetPortfolioId);
    if (hasPortfolioTickerDuplicate(targetPositions, payload.ticker, payload.id)) {
      onError(`Position with ticker ${String(payload.ticker || "").trim().toUpperCase()} already exists in this portfolio`);
      return;
    }
    const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
    const {portfolioId: _ignoredPortfolioId, ...persistedPositionPayload} = positionPayload;
    const normalizedAdjustments = uniqueLatestAllocationAdjustments(allocationAdjustments)
      .filter((adjustment) => {
        const targetPosition = targetPositions.find((item) => item.id === adjustment.id);
        if (!targetPosition) return false;
        const currentTarget = Number(targetPosition.targetAllocationPct ?? targetPosition.target ?? 0);
        return Math.abs(currentTarget - Number(adjustment.targetAllocationPct || 0)) >= 0.0001;
      });
    await api.createPositionWithAdjustments(targetPortfolioId, persistedPositionPayload, normalizedAdjustments);
    await refreshAfterPortfolioMutation(targetPortfolioId);
    setModal(null);
  }

  async function handleCreateTransaction(payload) {
    const targetPortfolioId = targetPortfolioIdFrom(payload?.portfolioId);
    if (!targetPortfolioId) return;
    onError("");
    const {portfolioId: _ignoredPortfolioId, cashTransfer, originalCashTransferId: _ignoredOriginalCashTransferId, ...persistedPayload} = payload;
    await api.createTransaction(targetPortfolioId, persistedPayload);
    if (payload.cashTransfer) {
      const {portfolioId: _ignoredCashTransferPortfolioId, positionId: _ignoredCashTransferPositionId, ...cashTransferPayload} = cashTransfer;
      await api.createTransaction(targetPortfolioId, cashTransferPayload);
    }
    await refreshAfterPortfolioMutation(targetPortfolioId);
    onAfterTransactionMutation?.();
    setModal(null);
  }

  async function handleUploadTransactions(payload) {
    const targetPortfolioId = targetPortfolioIdFrom(payload?.portfolioId);
    if (!targetPortfolioId) return;
    onError("");

    const targetPositions = positionsForPortfolio(targetPortfolioId);
    const existingTickers = new Set(
      targetPositions.map((position) => String(position.ticker || "").trim().toUpperCase()).filter(Boolean)
    );

    for (const positionPayload of payload?.positionsToCreate || []) {
      const normalizedTicker = String(positionPayload?.ticker || "").trim().toUpperCase();
      if (!normalizedTicker || existingTickers.has(normalizedTicker)) continue;
      await api.createPositionWithAdjustments(targetPortfolioId, {
        ...positionPayload,
        ticker: normalizedTicker,
        includeInAllocation: false,
        targetAllocationPct: 0,
      }, []);
      existingTickers.add(normalizedTicker);
    }

    const sortedTransactions = [...(payload?.transactions || [])].sort((left, right) => {
      const leftDate = String(left?.date || "");
      const rightDate = String(right?.date || "");
      if (leftDate === rightDate) return 0;
      return leftDate.localeCompare(rightDate);
    });

    for (const transaction of sortedTransactions) {
      const {portfolioId: _ignoredPortfolioId, ...persistedPayload} = transaction;
      await api.createTransaction(targetPortfolioId, persistedPayload);
    }

    await refreshAfterPortfolioMutation(targetPortfolioId);
    onAfterTransactionMutation?.();
    setModal(null);
  }

  async function handleEditPosition(payload) {
    const targetPortfolioId = targetPortfolioIdFrom(payload?.portfolioId);
    const targetPositions = positionsForPortfolio(targetPortfolioId);
    const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
    const {portfolioId: _ignoredPortfolioId, ...persistedPositionPayload} = positionPayload;
    await api.updatePosition(targetPortfolioId, persistedPositionPayload.id, persistedPositionPayload);
    const normalizedAdjustments = uniqueLatestAllocationAdjustments(allocationAdjustments);
    if (normalizedAdjustments.length) {
      await Promise.all(
        normalizedAdjustments.map((adjustment) => {
          const targetPosition = targetPositions.find((item) => item.id === adjustment.id);
          if (!targetPosition) return Promise.resolve();
          const currentTarget = Number(targetPosition.targetAllocationPct ?? targetPosition.target ?? 0);
          if (Math.abs(currentTarget - Number(adjustment.targetAllocationPct || 0)) < 0.0001) {
            return Promise.resolve();
          }
          return api.updatePosition(targetPortfolioId, adjustment.id, {
            ...targetPosition,
            targetAllocationPct: adjustment.targetAllocationPct,
          });
        })
      );
    }
    await refreshAfterPortfolioMutation(targetPortfolioId);
    setModal(null);
  }

  async function handleDeletePosition(position) {
    const targetPortfolioId = targetPortfolioIdFrom(position?.portfolioId || position?.portfolioContextId);
    await api.deletePosition(targetPortfolioId, position.id);
    await refreshAfterPortfolioMutation(targetPortfolioId);
    setModal(null);
  }

  async function handleEditTransaction(payload) {
    const targetPortfolioId = targetPortfolioIdFrom(payload?.portfolioId || payload?.portfolioContextId);
    const {
      portfolioId: _ignoredPortfolioId,
      portfolioContextId: _ignoredPortfolioContextId,
      cashTransfer,
      originalCashTransferId,
      ...persistedPayload
    } = payload;
    await api.updateTransaction(targetPortfolioId, persistedPayload.id, persistedPayload);
    if (cashTransfer) {
      const {
        id: cashTransferId,
        portfolioId: _ignoredCashTransferPortfolioId,
        positionId: _ignoredCashTransferPositionId,
        ...cashTransferPayload
      } = cashTransfer;
      if (cashTransferId) {
        await api.updateTransaction(targetPortfolioId, cashTransferId, cashTransferPayload);
      } else {
        await api.createTransaction(targetPortfolioId, cashTransferPayload);
      }
    } else if (originalCashTransferId) {
      await api.deleteTransaction(targetPortfolioId, originalCashTransferId);
    }
    await refreshAfterPortfolioMutation(targetPortfolioId);
    onAfterTransactionMutation?.();
    setModal(null);
  }

  async function handleDeleteTransaction(transaction) {
    const targetPortfolioId = targetPortfolioIdFrom(transaction?.portfolioId || transaction?.portfolioContextId);
    await api.deleteTransaction(targetPortfolioId, transaction.id);
    if (transaction?.cashTransfer?.id) {
      await api.deleteTransaction(targetPortfolioId, transaction.cashTransfer.id);
    }
    await refreshAfterPortfolioMutation(targetPortfolioId);
    onAfterTransactionMutation?.();
    setModal(null);
  }

  async function reorderPositions(orderIds) {
    if (!portfolioId || !Array.isArray(orderIds) || !orderIds.length) return;
    const active = rawPositions.filter((position) => (position.mode || "ACTIVE") !== "WATCHLIST");
    const byId = new Map(active.map((position) => [position.id, position]));
    const uniqueIds = [...new Set(orderIds)].filter((id) => byId.has(id));
    const missingIds = active.map((position) => position.id).filter((id) => !uniqueIds.includes(id));
    const finalOrderIds = [...uniqueIds, ...missingIds];
    const currentOrderIds = active
      .slice()
      .sort((left, right) => Number(left.displayOrder || Number.MAX_SAFE_INTEGER) - Number(right.displayOrder || Number.MAX_SAFE_INTEGER))
      .map((position) => position.id);
    if (finalOrderIds.length === currentOrderIds.length && finalOrderIds.every((id, index) => id === currentOrderIds[index])) {
      return;
    }
    await api.reorderPositions(portfolioId, finalOrderIds);
    setRawPositions((current) => applyDisplayOrderToPositions(current, finalOrderIds));
    setMetrics((current) => current ? {
      ...current,
      positions: applyDisplayOrderToPositions(current.positions, finalOrderIds),
    } : current);
  }

  return {
    handleCreatePortfolio,
    handleCreatePosition,
    handleCreateTransaction,
    handleUploadTransactions,
    handleDeletePortfolio,
    handleDeletePosition,
    handleDeleteTransaction,
    handleEditPosition,
    handleEditTransaction,
    handleRenamePortfolio,
    reorderPositions,
  };
}
