import {startTransition, useCallback, useEffect, useRef, useState} from "react";
import {api} from "../services/api";
import {DEFAULT_NEWS_FILTERS} from "../constants/appConstants";

const newsAutoRequestState = new Map();

function isAbortError(error) {
  return error?.name === "AbortError";
}

export function useWorkspaceData({equityMode, equityRange, onError, tab}) {
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [portfoliosBusy, setPortfoliosBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [portfolioTabBusy, setPortfolioTabBusy] = useState(false);
  const [rawPositions, setRawPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [portfolioTabDataById, setPortfolioTabDataById] = useState({});
  const [equityHistory, setEquityHistory] = useState(null);
  const [equityHistoryBusy, setEquityHistoryBusy] = useState(false);
  const [news, setNews] = useState(null);
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsFilters, setNewsFilters] = useState(DEFAULT_NEWS_FILTERS);
  const equityHistoryRequestRef = useRef({controller: null, key: ""});
  const portfolioTabRequestRef = useRef({requestId: 0});

  useEffect(() => {
    if (!portfolioId) return;
    refreshPortfolioBaseData(portfolioId).catch((error) => onError?.(String(error.message || error)));
  }, [portfolioId]);

  useEffect(() => {
    if (!portfolioId || tab !== "dashboard") return;
    refreshEquityHistory(portfolioId, equityRange, equityMode).catch((error) => {
      if (!isAbortError(error)) onError?.(String(error.message || error));
    });
  }, [equityMode, equityRange, portfolioId, tab]);

  const loadPortfolios = useCallback(async function loadPortfolios() {
    setPortfoliosBusy(true);
    try {
      const list = await api.getPortfolios();
      setPortfolios(list);
      setPortfolioId((current) => {
        if (list.some((portfolio) => portfolio.id === current)) return current;
        return list[0]?.id || "";
      });
      return list;
    } finally {
      setPortfoliosBusy(false);
    }
  }, []);

  async function refreshPortfolioBaseData(id = portfolioId) {
    if (!id) return;
    setWorkspaceBusy(true);
    try {
      const [portfolioMetrics, portfolioPositions, portfolioTransactions] = await Promise.all([
        api.getMetrics(id),
        api.getPositions(id),
        api.getTransactions(id),
      ]);
      startTransition(() => {
        setMetrics(portfolioMetrics || null);
        setRawPositions(portfolioPositions || []);
        setTransactions(portfolioTransactions || []);
        setPortfolioTabDataById((current) => ({
          ...current,
          [id]: {
            metrics: portfolioMetrics || null,
            rawPositions: portfolioPositions || [],
            transactions: portfolioTransactions || [],
          },
        }));
      });
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function refreshPortfolioTabSnapshot(id) {
    if (!id) return;
    const [portfolioMetrics, portfolioPositions, portfolioTransactions] = await Promise.all([
      api.getMetrics(id),
      api.getPositions(id),
      api.getTransactions(id),
    ]);
    startTransition(() => {
      setPortfolioTabDataById((current) => ({
        ...current,
        [id]: {
          metrics: portfolioMetrics || null,
          rawPositions: portfolioPositions || [],
          transactions: portfolioTransactions || [],
        },
      }));
      if (id === portfolioId) {
        setMetrics(portfolioMetrics || null);
        setRawPositions(portfolioPositions || []);
        setTransactions(portfolioTransactions || []);
      }
    });
  }

  async function refreshEquityHistory(id = portfolioId, range = equityRange, mode = equityMode) {
    if (!id) return;
    const requestKey = `${id}:${range}:${mode}`;
    if (equityHistoryRequestRef.current.controller) {
      equityHistoryRequestRef.current.controller.abort();
    }
    const controller = new AbortController();
    equityHistoryRequestRef.current = {controller, key: requestKey};
    setEquityHistoryBusy(true);
    try {
      const history = await api.getEquityCurve(id, range, mode, {signal: controller.signal});
      if (equityHistoryRequestRef.current.key !== requestKey) return;
      startTransition(() => {
        setEquityHistory(history || null);
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      throw error;
    } finally {
      if (equityHistoryRequestRef.current.key === requestKey) {
        setEquityHistoryBusy(false);
      }
    }
  }

  function mergeNewsResponses(responses) {
    const validResponses = (responses || []).filter(Boolean);
    if (!validResponses.length) return null;
    const availableTickers = [...new Set(validResponses.flatMap((item) => item.availableTickers || []))];

    function mergeItems(key) {
      const byId = new Map();
      for (const response of validResponses) {
        for (const item of response[key] || []) {
          const itemKey = item?.id || item?.url;
          if (!itemKey) continue;
          const existing = byId.get(itemKey);
          const portfolioNames = new Set([
            ...((existing?.portfolioNames || (existing?.portfolioName ? [existing.portfolioName] : []))),
            response.portfolioName,
          ].filter(Boolean));
          byId.set(itemKey, {
            ...(existing || item),
            portfolioName: [...portfolioNames].join(" · "),
            portfolioNames: [...portfolioNames],
          });
        }
      }
      return [...byId.values()].sort((left, right) => {
        const leftTime = Date.parse(left.publishedAt || "") || 0;
        const rightTime = Date.parse(right.publishedAt || "") || 0;
        return rightTime - leftTime;
      });
    }

    return {
      portfolioId: validResponses.map((item) => item.portfolioId).filter(Boolean).join(","),
      portfolioName: validResponses.length > 1 ? "Selected portfolios" : validResponses[0].portfolioName,
      generatedAt: new Date().toISOString(),
      availableTickers,
      marketNews: mergeItems("marketNews"),
      companyNews: mergeItems("companyNews"),
      pressReleases: mergeItems("pressReleases"),
    };
  }

  async function refreshNews(id = portfolioId, options = {}) {
    const ids = [...new Set((Array.isArray(id) ? id : [id]).filter(Boolean))];
    if (!ids.length) return;
    const {auto = false} = options;
    const nextFilters = {
      ticker: options.filters?.ticker || newsFilters.ticker || DEFAULT_NEWS_FILTERS.ticker,
      period: options.filters?.period || newsFilters.period || DEFAULT_NEWS_FILTERS.period,
    };
    const requestKey = `${ids.join(",")}:${nextFilters.ticker}:${nextFilters.period}`;
    const requestState = newsAutoRequestState.get(requestKey);
    if (auto && (requestState === "loading" || requestState === "loaded" || requestState === "failed")) return;
    if (auto) newsAutoRequestState.set(requestKey, "loading");
    setNewsBusy(true);
    try {
      const responses = await Promise.all(ids.map((portfolioId) => api.getNews(portfolioId, nextFilters.ticker, nextFilters.period)));
      const payload = mergeNewsResponses(responses);
      newsAutoRequestState.set(requestKey, "loaded");
      startTransition(() => {
        setNews(payload || null);
        setNewsFilters(nextFilters);
      });
    } catch (error) {
      if (auto) newsAutoRequestState.set(requestKey, "failed");
      throw error;
    } finally {
      setNewsBusy(false);
    }
  }

  async function refreshPortfolioViews(id = portfolioId) {
    if (!id) return;
    await Promise.all([
      refreshPortfolioBaseData(id),
      refreshEquityHistory(id),
    ]);
  }

  async function ensurePortfolioTabSelectionLoaded(selectedIds, primaryId = portfolioId) {
    const normalizedIds = (selectedIds || []).filter(Boolean);
    if (!normalizedIds.length) {
      setPortfolioTabBusy(false);
      return;
    }
    const missingIds = normalizedIds.filter((id) => {
      if (id === primaryId) return false;
      const cached = portfolioTabDataById[id];
      return !cached?.metrics || !Array.isArray(cached?.rawPositions) || !Array.isArray(cached?.transactions);
    });
    if (!missingIds.length) {
      setPortfolioTabBusy(false);
      return;
    }
    const requestId = portfolioTabRequestRef.current.requestId + 1;
    portfolioTabRequestRef.current.requestId = requestId;
    setPortfolioTabBusy(true);
    try {
      const entries = await Promise.all(
        missingIds.map(async (id) => {
          const [portfolioMetrics, portfolioPositions, portfolioTransactions] = await Promise.all([
            api.getMetrics(id),
            api.getPositions(id),
            api.getTransactions(id),
          ]);
          return {
            id,
            metrics: portfolioMetrics || null,
            rawPositions: portfolioPositions || [],
            transactions: portfolioTransactions || [],
          };
        })
      );
      if (portfolioTabRequestRef.current.requestId !== requestId) return;
      startTransition(() => {
        setPortfolioTabDataById((current) => {
          const next = {...current};
          entries.forEach((entry) => {
            next[entry.id] = {
              metrics: entry.metrics,
              rawPositions: entry.rawPositions,
              transactions: entry.transactions,
            };
          });
          return next;
        });
      });
    } catch (error) {
      onError?.(String(error.message || error));
    } finally {
      if (portfolioTabRequestRef.current.requestId === requestId) {
        setPortfolioTabBusy(false);
      }
    }
  }

  function resetWorkspaceData() {
    if (equityHistoryRequestRef.current.controller) {
      equityHistoryRequestRef.current.controller.abort();
    }
    newsAutoRequestState.clear();
    setPortfolios([]);
    setPortfolioId("");
    setRawPositions([]);
    setTransactions([]);
    setMetrics(null);
    setPortfolioTabDataById({});
    setEquityHistory(null);
    setNews(null);
    setNewsFilters(DEFAULT_NEWS_FILTERS);
    setPortfolioTabBusy(false);
    setWorkspaceBusy(false);
    setPortfoliosBusy(false);
  }

  return {
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
    refreshPortfolioBaseData,
    refreshPortfolioTabSnapshot,
    refreshPortfolioViews,
    resetWorkspaceData,
    setEquityHistory,
    setMetrics,
    setNews,
    setNewsFilters,
    setPortfolioId,
    setPortfolioTabDataById,
    setPortfolios,
    setRawPositions,
    setTransactions,
    transactions,
    workspaceBusy,
  };
}
