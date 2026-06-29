import {startTransition, useEffect, useMemo, useRef, useState} from "react";

function uniqueIds(ids = []) {
  return [...new Set(ids.filter(Boolean))];
}

export function usePortfolioMultiSelection({
  ensurePortfolioTabSelectionLoaded,
  portfolioId,
  portfolioTabDataById,
  portfolios,
  setMetrics,
  setPortfolioId,
  setRawPositions,
  tab,
}) {
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState([]);
  const selectionInitializedRef = useRef(false);

  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === portfolioId) || null,
    [portfolioId, portfolios]
  );

  const effectiveSelectedPortfolioIds = selectedPortfolioIds.length
    ? uniqueIds(selectedPortfolioIds)
    : (portfolioId ? [portfolioId] : []);

  const multiPortfolioSelected = effectiveSelectedPortfolioIds.length > 1;
  const selectedPortfolioLabel = portfolios.find((portfolio) => portfolio.id === effectiveSelectedPortfolioIds[0])?.name || "";
  const topMenuPortfolioLabel = multiPortfolioSelected ? "Multi Selected" : (selectedPortfolioLabel || selectedPortfolio?.name || "");

  useEffect(() => {
    if (!portfolios.length) {
      setSelectedPortfolioIds([]);
      selectionInitializedRef.current = false;
      return;
    }
    setSelectedPortfolioIds((current) => {
      const validIds = uniqueIds(current.filter((id) => portfolios.some((portfolio) => portfolio.id === id)));
      if (!selectionInitializedRef.current) {
        selectionInitializedRef.current = true;
        return validIds.length ? validIds : (portfolioId ? [portfolioId] : [portfolios[0].id]);
      }
      return validIds;
    });
  }, [portfolioId, portfolios]);

  function syncPrimaryFromCache(nextPrimary) {
    if (!nextPrimary) return;
    const cached = portfolioTabDataById[nextPrimary];
    if (cached?.metrics && Array.isArray(cached?.rawPositions)) {
      startTransition(() => {
        setMetrics(cached.metrics || null);
        setRawPositions(cached.rawPositions || []);
      });
    }
  }

  function togglePortfolioSelection(nextPortfolioId) {
    if (!nextPortfolioId) return;
    const validCurrent = effectiveSelectedPortfolioIds.filter((id) => portfolios.some((portfolio) => portfolio.id === id));
    const alreadySelected = validCurrent.includes(nextPortfolioId);
    let nextSelected = validCurrent;
    let nextPrimary = portfolioId;
    if (!alreadySelected) {
      nextSelected = uniqueIds([...validCurrent, nextPortfolioId]);
      nextPrimary = nextPortfolioId;
    } else if (validCurrent.length === 1) {
      nextSelected = validCurrent;
      nextPrimary = nextPortfolioId;
    } else {
      nextSelected = uniqueIds(validCurrent.filter((id) => id !== nextPortfolioId));
      nextPrimary = portfolioId === nextPortfolioId ? (nextSelected[0] || "") : portfolioId;
    }
    setSelectedPortfolioIds(nextSelected);
    if (nextPrimary && nextPrimary !== portfolioId) {
      setPortfolioId(nextPrimary);
    }
    if (tab === "portfolios" || tab === "positions") {
      syncPrimaryFromCache(nextPrimary);
      ensurePortfolioTabSelectionLoaded(nextSelected, nextPrimary || nextPortfolioId);
    }
  }

  function selectPrimaryPortfolio(nextPortfolioId) {
    if (!nextPortfolioId) return;
    const nextSelectedIds = [nextPortfolioId];
    setSelectedPortfolioIds(nextSelectedIds);
    if (nextPortfolioId !== portfolioId) {
      setPortfolioId(nextPortfolioId);
    }
    if (["dashboard", "portfolios", "positions", "watchlist", "news", "avg-drawdown"].includes(tab)) {
      syncPrimaryFromCache(nextPortfolioId);
      ensurePortfolioTabSelectionLoaded(nextSelectedIds, nextPortfolioId);
    }
  }

  function applyPortfolioSelection(nextPortfolioIds, nextPrimaryId = portfolioId) {
    const normalizedIds = uniqueIds(
      (Array.isArray(nextPortfolioIds) ? nextPortfolioIds : [])
        .filter((id) => portfolios.some((portfolio) => portfolio.id === id))
    );
    const resolvedPrimaryId = normalizedIds.includes(nextPrimaryId)
      ? nextPrimaryId
      : (normalizedIds[0] || (portfolioId && portfolios.some((portfolio) => portfolio.id === portfolioId) ? portfolioId : portfolios[0]?.id || ""));
    setSelectedPortfolioIds(normalizedIds);
    if (resolvedPrimaryId && resolvedPrimaryId !== portfolioId) {
      setPortfolioId(resolvedPrimaryId);
    }
    if (["dashboard", "portfolios", "positions", "watchlist", "news", "avg-drawdown"].includes(tab)) {
      syncPrimaryFromCache(resolvedPrimaryId);
      ensurePortfolioTabSelectionLoaded(normalizedIds.length ? normalizedIds : [resolvedPrimaryId], resolvedPrimaryId);
    }
  }

  return {
    applyPortfolioSelection,
    effectiveSelectedPortfolioIds,
    multiPortfolioSelected,
    selectPrimaryPortfolio,
    selectedPortfolio,
    selectedPortfolioIds,
    setSelectedPortfolioIds,
    togglePortfolioSelection,
    topMenuPortfolioLabel,
  };
}
