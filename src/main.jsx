import React, {startTransition, useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {api} from "./services/api";
import {AuthScreen} from "./components/AuthScreen";
import {AppHeader} from "./components/AppHeader";
import {TopMenuBar} from "./components/TopMenuBar";
import {PortfolioView} from "./components/PortfolioView";
import {TabNav} from "./components/TabNav";
import {DashboardView} from "./components/DashboardView";
import {PositionsView} from "./components/PositionsView";
import {WatchListView} from "./components/WatchListView";
import {AvgDrawdownView} from "./components/AvgDrawdownView";
import {AiView} from "./components/AiView";
import {EmptyState} from "./components/EmptyState";
import {PortfolioModal} from "./components/PortfolioModal";
import {ConfirmModal} from "./components/ConfirmModal";
import {PositionModal} from "./components/PositionModal";
import {TransactionModal} from "./components/TransactionModal";
import {AccountModal} from "./components/AccountModal";
import {ModalSheet} from "./components/ModalSheet";
import {DEFAULT_POSITION_SUMMARY_METRICS, normalizePositionSummaryMetricIds} from "./components/MobilePositionCard";
import "./styles.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function getTelegramInitData() {
  const initData = window.Telegram?.WebApp?.initData;
  return typeof initData === "string" && initData.trim() ? initData : "";
}

function splitAllocationPayload(payload) {
  const {allocationAdjustments = [], ...positionPayload} = payload;
  return {allocationAdjustments, positionPayload};
}

function uniqueLatestAllocationAdjustments(adjustments) {
  const map = new Map();
  for (const adjustment of adjustments || []) {
    if (!adjustment?.id) continue;
    map.set(adjustment.id, adjustment);
  }
  return [...map.values()];
}

function hasPortfolioTickerDuplicate(positions, ticker, excludedId = null) {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  if (!normalizedTicker) return false;
  return (positions || []).some((position) =>
    position
      && String(position.ticker || "").trim().toUpperCase() === normalizedTicker
      && position.id !== excludedId
      && !position.archived
  );
}

function humanizeTelegramAuthError(error) {
  const message = String(error?.message || error || "").trim();
  if (!message) return "Telegram sign-in failed. Reopen the Mini App from Telegram and try again.";
  if (/unauthorized/i.test(message)
    || /Telegram auth is too old/i.test(message)
    || /Telegram hash/i.test(message)
    || /Telegram initData/i.test(message)
    || /Telegram user/i.test(message)
    || /auth_date/i.test(message)) {
    return "Telegram session expired or could not be verified. Reopen the Mini App from Telegram and try again.";
  }
  return message;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isTransientTelegramBootstrapError(error) {
  const message = String(error?.message || error || "");
  return /Failed to fetch|Load failed|NetworkError|fetch failed|502|503|504|timeout|timed out|Bad Gateway|Service Unavailable|Gateway Timeout/i.test(message);
}

function applyDisplayOrderToPositions(positions, orderedIds) {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return (positions || []).map((position) => {
    const nextOrder = orderMap.get(position.id);
    return nextOrder ? {...position, displayOrder: nextOrder} : position;
  });
}

function useScrollNavVisibility() {
  const [direction, setDirection] = useState("up");
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let ticking = false;

    function update() {
      const currentY = window.scrollY || 0;
      const delta = currentY - lastY;
      const nextAtTop = currentY <= 8;

      setAtTop(nextAtTop);

      if (Math.abs(delta) > 8) {
        if (nextAtTop) {
          setDirection("up");
        } else {
          setDirection(delta > 0 ? "down" : "up");
        }
        lastY = currentY;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, {passive: true});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return {
    showTopBar: !atTop && direction === "down",
    showBottomNav: atTop || direction === "up",
  };
}

function App() {
  const [portfolioPositionSummaryMetrics, setPortfolioPositionSummaryMetrics] = useState(DEFAULT_POSITION_SUMMARY_METRICS);
  const [holdingsPositionSummaryMetrics, setHoldingsPositionSummaryMetrics] = useState(DEFAULT_POSITION_SUMMARY_METRICS);
  const [authMode, setAuthMode] = useState("login");
  const [authBusy, setAuthBusy] = useState(true);
  const [authForm, setAuthForm] = useState({email: "", password: "", firstName: "", lastName: ""});
  const [emailLinkForm, setEmailLinkForm] = useState({email: "", password: ""});
  const [telegramLinkCode, setTelegramLinkCode] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [portfoliosBusy, setPortfoliosBusy] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [rawPositions, setRawPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [equityHistory, setEquityHistory] = useState(null);
  const [equityRange, setEquityRange] = useState("month");
  const [equityMode, setEquityMode] = useState("daily");
  const [aiSettings, setAiSettings] = useState({
    notificationsEnabled: false,
    schedule: "DAILY",
    weekday: "MONDAY",
    monthDay: 1,
    time: "17:45",
    portfolioId: "",
  });
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false);
  const [aiSettingsBusy, setAiSettingsBusy] = useState(false);
  const [aiPortfolioInvestedById, setAiPortfolioInvestedById] = useState({});
  const [tab, setTab] = useState("dashboard");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [linkSession, setLinkSession] = useState(null);
  const telegramAutoLoginAttempted = useRef(false);
  const isAuthenticated = Boolean(api.getToken());
  const telegramInitData = getTelegramInitData();
  const isTelegramMiniApp = Boolean(telegramInitData);
  const {showTopBar, showBottomNav} = useScrollNavVisibility();
  const selectedPortfolio = portfolios.find((portfolio) => portfolio.id === portfolioId) || null;
  const selectedAiPortfolioId = aiSettings.portfolioId || portfolioId;
  const selectedAiHasInvestedPosition = selectedAiPortfolioId
    ? (selectedAiPortfolioId === portfolioId
      ? Number(metrics?.invested || 0) > 0
      : Boolean(aiPortfolioInvestedById[selectedAiPortfolioId]))
    : false;
  const showLogout = !isTelegramMiniApp && Boolean(currentUser);

  useEffect(() => {
    async function boot() {
      setAuthBusy(true);
      try {
        window.Telegram?.WebApp?.ready?.();
        if (api.getToken()) {
          const user = await api.getCurrentUser();
          setCurrentUser(user);
          await loadPortfolios();
        } else if (telegramInitData && !telegramAutoLoginAttempted.current) {
          telegramAutoLoginAttempted.current = true;
          const authResponse = await authTelegramWithRetry(telegramInitData);
          setCurrentUser(authResponse);
          await loadPortfolios();
        }
      } catch (e) {
        api.setToken("");
        setCurrentUser(null);
        setError(telegramInitData ? humanizeTelegramAuthError(e) : String(e.message || e));
      } finally {
        setAuthBusy(false);
      }
    }
    boot();
  }, [telegramInitData]);

  useEffect(() => {
    if (isAuthenticated || telegramInitData || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    async function waitForGoogle() {
      for (let i = 0; i < 40; i += 1) {
        if (window.google?.accounts?.id) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (cancelled || !window.google?.accounts?.id) {
        if (!cancelled) setError("Google Sign-In script failed to load");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError("");
          setAuthBusy(true);
          try {
            const authResponse = await api.authGoogle(response.credential);
            setCurrentUser(authResponse);
            await loadPortfolios();
          } catch (e) {
            setError(String(e.message || e));
          } finally {
            setAuthBusy(false);
          }
        }
      });
      const button = document.getElementById("google-signin-button");
      if (button) {
        button.innerHTML = "";
        window.google.accounts.id.renderButton(button, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320
        });
      }
    }

    waitForGoogle();
    return () => { cancelled = true; };
  }, [isAuthenticated, telegramInitData]);

  useEffect(() => {
    if (!currentUser) return;
    setEmailLinkForm((current) => ({
      email: current.email || currentUser.email || "",
      password: current.password,
    }));
  }, [currentUser]);

  useEffect(() => {
    if (!portfolioId) return;
    setAiSummary(null);
    refreshPortfolioBaseData(portfolioId).catch((e) => setError(String(e.message || e)));
    refreshEquityHistory(portfolioId, equityRange, equityMode).catch((e) => setError(String(e.message || e)));
  }, [portfolioId]);

  useEffect(() => {
    if (!portfolioId) return;
    refreshEquityHistory(portfolioId, equityRange, equityMode).catch((e) => setError(String(e.message || e)));
  }, [equityRange, equityMode]);

  useEffect(() => {
    const targetPortfolioId = aiSettings.portfolioId;
    if (!targetPortfolioId || targetPortfolioId === portfolioId) return;
    if (Object.prototype.hasOwnProperty.call(aiPortfolioInvestedById, targetPortfolioId)) return;
    let cancelled = false;
    api.getMetrics(targetPortfolioId)
      .then((portfolioMetrics) => {
        if (cancelled) return;
        setAiPortfolioInvestedById((current) => ({
          ...current,
          [targetPortfolioId]: Number(portfolioMetrics?.invested || 0) > 0,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setAiPortfolioInvestedById((current) => ({
          ...current,
          [targetPortfolioId]: false,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [aiSettings.portfolioId, portfolioId, aiPortfolioInvestedById]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getAiSettings()
      .then((settings) => {
        setAiSettings({
          notificationsEnabled: settings.notificationsEnabled,
          schedule: settings.schedule || "DAILY",
          weekday: settings.weekday || "MONDAY",
          monthDay: settings.monthDay || 1,
          time: settings.time || "17:45",
          portfolioId: settings.portfolioId || "",
        });
        setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(settings.portfolioPositionSummaryMetricIds));
        setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(settings.holdingsPositionSummaryMetricIds));
      })
      .catch((e) => setError(String(e.message || e)));
  }, [isAuthenticated]);

  async function loadPortfolios() {
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
  }

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
      });
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function refreshEquityHistory(id = portfolioId, range = equityRange, mode = equityMode) {
    if (!id) return;
    const history = await api.getEquityCurve(id, range, mode);
    startTransition(() => {
      setEquityHistory(history || null);
    });
  }

  async function refreshPortfolioViews(id = portfolioId) {
    if (!id) return;
    await Promise.all([
      refreshPortfolioBaseData(id),
      refreshEquityHistory(id),
    ]);
  }

  function updateAiSetting(key, value) {
    setAiSettings((current) => ({
      ...current,
      [key]: value,
      portfolioId: key === "portfolioId" ? value : current.portfolioId || portfolioId,
    }));
  }

  function updateAuthField(key, value) {
    setAuthForm((current) => ({...current, [key]: value}));
  }

  function updateEmailLinkField(key, value) {
    setEmailLinkForm((current) => ({...current, [key]: value}));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setAuthBusy(true);
    try {
      let authResponse;
      if (authMode === "register") {
        authResponse = await api.register(authForm);
      } else {
        authResponse = await api.login({email: authForm.email, password: authForm.password});
      }
      setCurrentUser(authResponse);
      await loadPortfolios();
    } catch (e) {
      setError(humanizeTelegramAuthError(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function telegramLogin() {
    if (!telegramInitData) return;
    setError("");
    setAuthBusy(true);
    try {
      const authResponse = telegramLinkCode.trim()
        ? await api.linkTelegram(telegramInitData, telegramLinkCode.trim())
        : await authTelegramWithRetry(telegramInitData);
      setCurrentUser(authResponse);
      setTelegramLinkCode("");
      await loadPortfolios();
    } catch (e) {
      setError(humanizeTelegramAuthError(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleTelegramMerge() {
    if (!telegramInitData || !telegramLinkCode.trim()) return;
    setError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkTelegram(telegramInitData, telegramLinkCode.trim());
      setCurrentUser(authResponse);
      setTelegramLinkCode("");
      setLinkSession(null);
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function authTelegramWithRetry(initData) {
    let lastError;
    const retryDelaysMs = [0, 1500, 3500, 7000];
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
      if (retryDelaysMs[attempt] > 0) {
        await wait(retryDelaysMs[attempt]);
      }
      try {
        return await api.authTelegram(getTelegramInitData() || initData);
      } catch (error) {
        lastError = error;
        if (!isTransientTelegramBootstrapError(error) || attempt === retryDelaysMs.length - 1) {
          throw error;
        }
      }
    }
    throw lastError || new Error("Telegram sign-in failed");
  }

  async function handleEmailLink() {
    setError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkEmail(emailLinkForm);
      setCurrentUser(authResponse);
      setEmailLinkForm({email: authResponse.email || "", password: ""});
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleLink(credential) {
    setError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkGoogle(credential);
      setCurrentUser(authResponse);
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function createTelegramLinkCode() {
    setError("");
    try {
      const session = await api.createTelegramLinkSession();
      setLinkSession(session);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function handleCreatePortfolio(payload) {
    setError("");
    const created = await api.createPortfolio({name: payload.name});
    const list = await loadPortfolios();
    const saved = list.find((portfolio) => portfolio.id === created.id) || created;
    setPortfolioId(saved.id);
    setModal(null);
  }

  async function handleRenamePortfolio(payload, targetPortfolio = selectedPortfolio) {
    if (!targetPortfolio) return;
    setError("");
    await api.updatePortfolio(targetPortfolio.id, {...targetPortfolio, name: payload.name});
    await loadPortfolios();
    setModal(null);
  }

  async function handleDeletePortfolio(targetPortfolio = selectedPortfolio) {
    if (!targetPortfolio) return;
    setError("");
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
    if (!portfolioId) return;
    setError("");
    if (hasPortfolioTickerDuplicate(rawPositions, payload.ticker, payload.id)) {
      setError(`Position with ticker ${String(payload.ticker || "").trim().toUpperCase()} already exists in this portfolio`);
      return;
    }
    const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
    const normalizedAdjustments = uniqueLatestAllocationAdjustments(allocationAdjustments)
      .filter((adjustment) => {
        const targetPosition = rawPositions.find((item) => item.id === adjustment.id);
        if (!targetPosition) return false;
        const currentTarget = Number(targetPosition.targetAllocationPct ?? targetPosition.target ?? 0);
        return Math.abs(currentTarget - Number(adjustment.targetAllocationPct || 0)) >= 0.0001;
      });
    await api.createPositionWithAdjustments(portfolioId, positionPayload, normalizedAdjustments);
    await refreshPortfolioViews(portfolioId);
    setModal(null);
  }

  async function handleCreateTransaction(payload) {
    if (!portfolioId) return;
    setError("");
    await api.createTransaction(portfolioId, payload);
    if (payload.cashTransfer) {
      await api.createTransaction(portfolioId, payload.cashTransfer);
    }
    await refreshPortfolioViews(portfolioId);
    setModal(null);
  }

  function logout() {
    api.setToken("");
    window.google?.accounts?.id?.disableAutoSelect?.();
    setCurrentUser(null);
    setPortfolios([]);
    setPortfolioId("");
    setMetrics(null);
    setEquityHistory(null);
    setAiSettings({
      notificationsEnabled: false,
      schedule: "DAILY",
      weekday: "MONDAY",
      monthDay: 1,
      time: "17:45",
      portfolioId: "",
    });
    setAiSummary(null);
    setAiPortfolioInvestedById({});
    setRawPositions([]);
    setTransactions([]);
    setError("");
    setAuthBusy(false);
    setModal(null);
    setLinkSession(null);
    setTelegramLinkCode("");
    setEmailLinkForm({email: "", password: ""});
  }

  async function saveAiSettings() {
    const targetPortfolioId = aiSettings.portfolioId || portfolioId;
    if (!targetPortfolioId) return;
    setError("");
    setAiSettingsBusy(true);
    try {
      const saved = await api.updateAiSettings({
        notificationsEnabled: aiSettings.notificationsEnabled,
        schedule: aiSettings.schedule,
        weekday: aiSettings.weekday,
        monthDay: aiSettings.monthDay,
        time: aiSettings.time,
        portfolioId: targetPortfolioId,
        portfolioPositionSummaryMetricIds: portfolioPositionSummaryMetrics,
        holdingsPositionSummaryMetricIds: holdingsPositionSummaryMetrics,
      });
      setAiSettings({
        notificationsEnabled: saved.notificationsEnabled,
        schedule: saved.schedule || "DAILY",
        weekday: saved.weekday || "MONDAY",
        monthDay: saved.monthDay || 1,
        time: saved.time || "17:45",
        portfolioId: saved.portfolioId || "",
      });
      setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.portfolioPositionSummaryMetricIds));
      setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.holdingsPositionSummaryMetricIds));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setAiSettingsBusy(false);
    }
  }

  async function updatePositionSummaryMetrics(kind, nextMetricIds) {
    const normalized = normalizePositionSummaryMetricIds(nextMetricIds);
    const currentNormalized = kind === "portfolio"
      ? normalizePositionSummaryMetricIds(portfolioPositionSummaryMetrics)
      : normalizePositionSummaryMetricIds(holdingsPositionSummaryMetrics);
    if (normalized.length === currentNormalized.length && normalized.every((id, index) => id === currentNormalized[index])) {
      return;
    }
    setError("");
    if (kind === "portfolio") setPortfolioPositionSummaryMetrics(normalized);
    else setHoldingsPositionSummaryMetrics(normalized);
    try {
      const saved = await api.updateAiSettings({
        notificationsEnabled: aiSettings.notificationsEnabled,
        schedule: aiSettings.schedule,
        weekday: aiSettings.weekday,
        monthDay: aiSettings.monthDay,
        time: aiSettings.time,
        portfolioId: aiSettings.portfolioId,
        portfolioPositionSummaryMetricIds: kind === "portfolio" ? normalized : portfolioPositionSummaryMetrics,
        holdingsPositionSummaryMetricIds: kind === "holdings" ? normalized : holdingsPositionSummaryMetrics,
      });
      setAiSettings({
        notificationsEnabled: saved.notificationsEnabled,
        schedule: saved.schedule || "DAILY",
        weekday: saved.weekday || "MONDAY",
        monthDay: saved.monthDay || 1,
        time: saved.time || "17:45",
        portfolioId: saved.portfolioId || "",
      });
      setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.portfolioPositionSummaryMetricIds));
      setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.holdingsPositionSummaryMetricIds));
    } catch (e) {
      setError(String(e.message || e));
    }
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

  async function fetchAiSummary() {
    const targetPortfolioId = aiSettings.portfolioId || portfolioId;
    if (!targetPortfolioId) return;
    setError("");
    setAiSummaryBusy(true);
    try {
      const response = await api.getAiSummary(targetPortfolioId);
      setAiSummary(response);
    } catch (e) {
      const targetPortfolioName = portfolios.find((portfolio) => portfolio.id === targetPortfolioId)?.name || selectedPortfolio?.name || "";
      if (String(e.message || e).includes("once per day")) {
        setAiSummary((current) => ({
          ...current,
          portfolioId: targetPortfolioId,
          portfolioName: targetPortfolioName || current?.portfolioName || "",
          nextAvailableAt: "locked",
          text: current?.text || "",
        }));
      }
      setError(String(e.message || e));
    } finally {
      setAiSummaryBusy(false);
    }
  }

  const positions = metrics?.positions || [];
  const activePositions = positions.filter((position) => position.mode !== "WATCHLIST");
  const watchlistPositions = positions.filter((position) => position.mode === "WATCHLIST");
  const activeRawPositions = rawPositions.filter((position) => (position.mode || "ACTIVE") !== "WATCHLIST");
  const avgDrawdownPositions = activePositions.filter((position) => position.type !== "CASH" && position.type !== "CASH_ETF");
  const dataBusy = portfoliosBusy || workspaceBusy;

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
          <AppHeader
            middle={(
              <TopMenuBar
                embedded
                hasPortfolio={Boolean(selectedPortfolio)}
                onAddPosition={() => setModal("position")}
                onAddTransaction={() => setModal("transaction")}
                onOpenPortfolioSwitch={() => setModal("switch-portfolio")}
                selectedPortfolioName={selectedPortfolio?.name || ""}
                visible
              />
            )}
            onAccount={() => setModal("account")}
            onLogout={logout}
            showLogout={showLogout}
          />

          {error ? <div className="error">{error}</div> : null}

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
    <div className="app-shell">
      <div className="app">
        <AppHeader
          middle={(
            <TopMenuBar
              embedded
              hasPortfolio={Boolean(selectedPortfolio)}
              onAddPosition={() => setModal("position")}
              onAddTransaction={() => setModal("transaction")}
              onOpenPortfolioSwitch={() => setModal("switch-portfolio")}
              selectedPortfolioName={selectedPortfolio?.name || ""}
              visible
            />
          )}
          onAccount={() => setModal("account")}
          onLogout={logout}
          showLogout={showLogout}
        />

        <TopMenuBar
          hasPortfolio={Boolean(selectedPortfolio)}
          onAddPosition={() => setModal("position")}
          onAddTransaction={() => setModal("transaction")}
          onOpenPortfolioSwitch={() => setModal("switch-portfolio")}
          selectedPortfolioName={selectedPortfolio?.name || ""}
          visible={showTopBar}
        />

        {error ? <div className="error">{error}</div> : null}

        <TabNav
          onChange={setTab}
          tab={tab}
          visible={showBottomNav}
        />

        {!portfolios.length ? <EmptyState onCreatePortfolio={() => setModal("create-portfolio")} /> : null}
        {portfolios.length && tab === "portfolios" ? (
          <PortfolioView
            metrics={metrics}
            mobilePositionSummaryMetrics={portfolioPositionSummaryMetrics}
            onMobilePositionSummaryMetricsChange={(nextMetricIds) => updatePositionSummaryMetrics("portfolio", nextMetricIds)}
            onReorderPositions={reorderPositions}
            portfolioId={portfolioId}
            portfolios={portfolios}
            onAddTransaction={(position) => setModal({
              type: "transaction",
              data: {
                ticker: position.ticker,
                price: Number(position.price || 0),
              },
            })}
            onCreate={handleCreatePortfolio}
            onDelete={(portfolio) => setModal({type: "delete-portfolio", data: portfolio})}
            onDeletePosition={(position) => setModal({type: "delete-position", data: position})}
            onEditPosition={(position) => {
              const source = rawPositions.find((item) => item.id === position.id) || position;
              setModal({type: "edit-position", data: source});
            }}
            onRename={(portfolio) => setModal({type: "rename-portfolio", data: portfolio})}
            onSelect={setPortfolioId}
          />
        ) : null}
        {portfolios.length && tab === "dashboard" ? (
          <DashboardView
            equityHistory={equityHistory}
            equityMode={equityMode}
            equityRange={equityRange}
            metrics={metrics}
            onEquityModeChange={setEquityMode}
            onEquityRangeChange={setEquityRange}
          />
        ) : null}
        {portfolios.length && tab === "positions" ? (
          <PositionsView
            mobilePositionSummaryMetrics={holdingsPositionSummaryMetrics}
            onAddTransaction={(position) => setModal({
              type: "transaction",
              data: {
                ticker: position.ticker,
                price: Number(position.price || 0),
              },
            })}
            onDeletePosition={(position) => setModal({type: "delete-position", data: position})}
            onDeleteTransaction={(transaction) => setModal({type: "delete-transaction", data: transaction})}
            onEditPosition={(position) => {
              const source = rawPositions.find((item) => item.id === position.id) || position;
              setModal({type: "edit-position", data: source});
            }}
            onEditTransaction={(transaction) => setModal({type: "edit-transaction", data: transaction})}
            onMobilePositionSummaryMetricsChange={(nextMetricIds) => updatePositionSummaryMetrics("holdings", nextMetricIds)}
            onReorderPositions={reorderPositions}
            positions={activePositions}
            transactions={transactions}
          />
        ) : null}
        {portfolios.length && tab === "watchlist" ? (
          <WatchListView
            onCreateWatch={() => setModal("watchlist")}
            onDeleteWatch={(position) => setModal({type: "delete-position", data: position})}
            positions={watchlistPositions}
          />
        ) : null}
        {portfolios.length && tab === "avg-drawdown" ? <AvgDrawdownView avgDrawdown={avgDrawdownPositions} /> : null}
        {portfolios.length && tab === "ai" ? (
          <AiView
            aiSettings={aiSettings}
            aiSummary={aiSummary}
            currentUser={currentUser}
            onFetchSummary={fetchAiSummary}
            onSaveSettings={saveAiSettings}
            onSettingsChange={updateAiSetting}
            hasInvestedPosition={selectedAiHasInvestedPosition}
            portfolios={portfolios}
            portfolioId={portfolioId}
            portfolioName={selectedPortfolio?.name || ""}
            settingsBusy={aiSettingsBusy}
            summaryBusy={aiSummaryBusy}
          />
        ) : null}
      </div>

      {modal === "create-portfolio" ? <PortfolioModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreatePortfolio} /> : null}
      {modal === "switch-portfolio" ? (
        <ModalSheet title="Switch portfolio" subtitle="Choose the portfolio to display across dashboard, positions, watch list, and avg drawdown." onClose={() => setModal(null)}>
          <div className="portfolio-switch-list">
            {portfolios.map((portfolio) => (
              <button
                className={`portfolio-switch-row ${portfolio.id === portfolioId ? "active" : ""}`}
                key={portfolio.id}
                onClick={() => {
                  setPortfolioId(portfolio.id);
                  setModal(null);
                }}
                type="button"
              >
                <div>
                  <strong>{portfolio.name}</strong>
                  {portfolio.defaultPortfolio ? <span>Default portfolio</span> : <span>Open this workspace</span>}
                </div>
                <i>{portfolio.id === portfolioId ? "Current" : "Open"}</i>
              </button>
            ))}
          </div>
        </ModalSheet>
      ) : null}
      {modal === "account" ? (
        <AccountModal
          authBusy={authBusy}
          currentUser={currentUser}
          emailLinkForm={emailLinkForm}
          googleClientId={GOOGLE_CLIENT_ID}
          hasTelegramInitData={isTelegramMiniApp}
          linkSession={linkSession}
          onClose={() => setModal(null)}
          onCreateLinkCode={createTelegramLinkCode}
          onGoogleCredential={handleGoogleLink}
          onLinkEmail={handleEmailLink}
          onLinkTelegram={handleTelegramMerge}
          onEmailLinkFieldChange={updateEmailLinkField}
          onTelegramLinkCodeChange={setTelegramLinkCode}
          telegramLinkCode={telegramLinkCode}
        />
      ) : null}
      {modal?.type === "rename-portfolio" && modal.data ? (
        <PortfolioModal
          mode="edit"
          onClose={() => setModal(null)}
          onSubmit={(payload) => handleRenamePortfolio(payload, modal.data)}
          portfolio={modal.data}
        />
      ) : null}
      {modal?.type === "delete-portfolio" && modal.data ? (
        <ConfirmModal
          confirmLabel="Delete portfolio"
          onClose={() => setModal(null)}
          onConfirm={() => handleDeletePortfolio(modal.data)}
          subtitle={`Delete "${modal.data.name}" together with its positions and transactions?`}
          title="Delete portfolio"
        />
      ) : null}
      {modal === "position" ? <PositionModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreatePosition} positions={activeRawPositions} /> : null}
      {modal === "watchlist" ? <PositionModal mode="create" variant="watchlist" onClose={() => setModal(null)} onSubmit={handleCreatePosition} positions={activeRawPositions} /> : null}
      {modal === "transaction" || modal?.type === "transaction" ? (
        <TransactionModal
          mode="create"
          onClose={() => setModal(null)}
          onSubmit={handleCreateTransaction}
          positions={activeRawPositions}
          transaction={modal?.type === "transaction" ? modal.data : null}
        />
      ) : null}
      {modal?.type === "edit-position" ? <PositionModal mode="edit" onClose={() => setModal(null)} onSubmit={async (payload) => {
        const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
        await api.updatePosition(portfolioId, positionPayload.id, positionPayload);
        const normalizedAdjustments = uniqueLatestAllocationAdjustments(allocationAdjustments);
        if (normalizedAdjustments.length) {
          await Promise.all(
            normalizedAdjustments.map((adjustment) => {
              const targetPosition = rawPositions.find((item) => item.id === adjustment.id);
              if (!targetPosition) return Promise.resolve();
              const currentTarget = Number(targetPosition.targetAllocationPct ?? targetPosition.target ?? 0);
              if (Math.abs(currentTarget - Number(adjustment.targetAllocationPct || 0)) < 0.0001) {
                return Promise.resolve();
              }
              return api.updatePosition(portfolioId, adjustment.id, {
                ...targetPosition,
                targetAllocationPct: adjustment.targetAllocationPct,
              });
            })
          );
        }
        await refreshPortfolioViews(portfolioId);
        setModal(null);
      }} position={modal.data} positions={activeRawPositions} /> : null}
      {modal?.type === "delete-position" ? <ConfirmModal confirmLabel="Delete position" onClose={() => setModal(null)} onConfirm={async () => {
        await api.deletePosition(portfolioId, modal.data.id);
        await refreshPortfolioViews(portfolioId);
        setModal(null);
      }} subtitle={`Archive ${modal.data.ticker} from this portfolio?`} title="Delete position" /> : null}
      {modal?.type === "edit-transaction" ? <TransactionModal mode="edit" onClose={() => setModal(null)} onSubmit={async (payload) => {
        await api.updateTransaction(portfolioId, payload.id, payload);
        await refreshPortfolioViews(portfolioId);
        setModal(null);
      }} positions={activeRawPositions} transaction={modal.data} /> : null}
      {modal?.type === "delete-transaction" ? <ConfirmModal confirmLabel="Delete transaction" onClose={() => setModal(null)} onConfirm={async () => {
        await api.deleteTransaction(portfolioId, modal.data.id);
        await refreshPortfolioViews(portfolioId);
        setModal(null);
      }} subtitle={`Delete ${modal.data.type} ${modal.data.ticker} from the transaction history?`} title="Delete transaction" /> : null}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
