import {startTransition, useEffect, useMemo, useState} from "react";

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

  const selectedPortfolio = useMemo(
    () => portfolios.find((portfolio) => portfolio.id === portfolioId) || null,
    [portfolioId, portfolios]
  );

  const effectiveSelectedPortfolioIds = selectedPortfolioIds.length
    ? uniqueIds(selectedPortfolioIds)
    : (portfolioId ? [portfolioId] : []);

  const multiPortfolioSelected = effectiveSelectedPortfolioIds.length > 1;
  const topMenuPortfolioLabel = multiPortfolioSelected ? "Multi Selected" : (selectedPortfolio?.name || "");

  useEffect(() => {
    if (!portfolios.length) {
      setSelectedPortfolioIds([]);
      return;
    }
    setSelectedPortfolioIds((current) => {
      const validIds = uniqueIds(current.filter((id) => portfolios.some((portfolio) => portfolio.id === id)));
      if (portfolioId && !validIds.includes(portfolioId)) {
        return [portfolioId, ...validIds];
      }
      if (validIds.length) return validIds;
      return portfolioId ? [portfolioId] : [portfolios[0].id];
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

  function applyPortfolioSelection(nextPortfolioIds) {
    const normalizedIds = uniqueIds([
      portfolioId,
      ...(Array.isArray(nextPortfolioIds) ? nextPortfolioIds : []),
    ].filter((id) => portfolios.some((portfolio) => portfolio.id === id)));
    setSelectedPortfolioIds(normalizedIds);
    if (tab === "portfolios" || tab === "positions") {
      syncPrimaryFromCache(portfolioId);
      ensurePortfolioTabSelectionLoaded(normalizedIds, portfolioId);
    }
  }

  return {
    applyPortfolioSelection,
    effectiveSelectedPortfolioIds,
    multiPortfolioSelected,
    selectedPortfolio,
    selectedPortfolioIds,
    setSelectedPortfolioIds,
    togglePortfolioSelection,
    topMenuPortfolioLabel,
  };
}
