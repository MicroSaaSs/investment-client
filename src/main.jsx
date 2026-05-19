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
import {VolatilityView} from "./components/VolatilityView";
import {EmptyState} from "./components/EmptyState";
import {PortfolioModal} from "./components/PortfolioModal";
import {ConfirmModal} from "./components/ConfirmModal";
import {PositionModal} from "./components/PositionModal";
import {TransactionModal} from "./components/TransactionModal";
import {AccountModal} from "./components/AccountModal";
import {ModalSheet} from "./components/ModalSheet";
import "./styles.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function getTelegramInitData() {
  const initData = window.Telegram?.WebApp?.initData;
  return typeof initData === "string" && initData.trim() ? initData : "";
}

function buildEquityFromMetrics(nextMetrics) {
  if (!nextMetrics) return [];
  return [
    {day: "Invested", value: nextMetrics.invested || 0},
    {day: "Current", value: nextMetrics.totalValue || 0},
  ];
}

function splitAllocationPayload(payload) {
  const {allocationAdjustments = [], ...positionPayload} = payload;
  return {allocationAdjustments, positionPayload};
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
  const [authMode, setAuthMode] = useState("login");
  const [authBusy, setAuthBusy] = useState(true);
  const [authForm, setAuthForm] = useState({email: "", password: "", firstName: "", lastName: ""});
  const [emailLinkForm, setEmailLinkForm] = useState({email: "", password: ""});
  const [telegramLinkCode, setTelegramLinkCode] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [rawPositions, setRawPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [equity, setEquity] = useState([]);
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
  const showLogout = currentUser?.authProvider !== "TELEGRAM";

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
          const authResponse = await api.authTelegram(telegramInitData);
          setCurrentUser(authResponse);
          await loadPortfolios();
        }
      } catch (e) {
        api.setToken("");
        setCurrentUser(null);
        setError(String(e.message || e));
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
    refreshPortfolioViews(portfolioId).catch((e) => setError(String(e.message || e)));
  }, [portfolioId]);

  async function loadPortfolios() {
    const list = await api.getPortfolios();
    setPortfolios(list);
    setPortfolioId((current) => {
      if (list.some((portfolio) => portfolio.id === current)) return current;
      return list[0]?.id || "";
    });
    return list;
  }

  async function refreshPortfolioViews(id = portfolioId) {
    if (!id) return;
    const [nextMetrics, nextPositions, nextTransactions] = await Promise.all([
      api.getMetrics(id),
      api.getPositions(id),
      api.getTransactions(id),
    ]);
    startTransition(() => {
      setMetrics(nextMetrics);
      setEquity(buildEquityFromMetrics(nextMetrics));
      setRawPositions(nextPositions);
      setTransactions(nextTransactions);
    });
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
      setError(String(e.message || e));
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
        : await api.authTelegram(telegramInitData);
      setCurrentUser(authResponse);
      setTelegramLinkCode("");
      await loadPortfolios();
    } catch (e) {
      setError(String(e.message || e));
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

  async function handleRenamePortfolio(payload) {
    if (!selectedPortfolio) return;
    setError("");
    await api.updatePortfolio(selectedPortfolio.id, {...selectedPortfolio, name: payload.name});
    await loadPortfolios();
    setModal(null);
  }

  async function handleDeletePortfolio() {
    if (!selectedPortfolio) return;
    setError("");
    await api.deletePortfolio(selectedPortfolio.id);
    setMetrics(null);
    setEquity([]);
    setRawPositions([]);
    setTransactions([]);
    const list = await loadPortfolios();
    setPortfolioId(list[0]?.id || "");
    setModal(null);
  }

  async function handleCreatePosition(payload) {
    if (!portfolioId) return;
    setError("");
    const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
    await api.createPosition(portfolioId, positionPayload);
    if (allocationAdjustments.length) {
      await Promise.all(
        allocationAdjustments.map((adjustment) => {
          const targetPosition = rawPositions.find((item) => item.id === adjustment.id);
          if (!targetPosition) return Promise.resolve();
          return api.updatePosition(portfolioId, adjustment.id, {
            ...targetPosition,
            targetAllocationPct: adjustment.targetAllocationPct,
          });
        })
      );
    }
    await refreshPortfolioViews(portfolioId);
    setModal(null);
  }

  async function handleCreateTransaction(payload) {
    if (!portfolioId) return;
    setError("");
    await api.createTransaction(portfolioId, payload);
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
    setEquity([]);
    setRawPositions([]);
    setTransactions([]);
    setError("");
    setAuthBusy(false);
    setModal(null);
    setLinkSession(null);
    setTelegramLinkCode("");
    setEmailLinkForm({email: "", password: ""});
  }

  const positions = metrics?.positions || [];
  const activePositions = positions.filter((position) => position.mode !== "WATCHLIST");
  const watchlistPositions = positions.filter((position) => position.mode === "WATCHLIST");
  const activeRawPositions = rawPositions.filter((position) => (position.mode || "ACTIVE") !== "WATCHLIST");
  const volatilityPositions = activePositions.filter((position) => position.type !== "CASH" && position.type !== "CASH_ETF");

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

  return (
    <div className="app-shell">
      <div className="app">
        <AppHeader
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
            portfolioId={portfolioId}
            portfolios={portfolios}
            onCreate={handleCreatePortfolio}
            onDelete={() => setModal("delete-portfolio")}
            onDeletePosition={(position) => setModal({type: "delete-position", data: position})}
            onEditPosition={(position) => {
              const source = rawPositions.find((item) => item.id === position.id) || position;
              setModal({type: "edit-position", data: source});
            }}
            onRename={() => setModal("rename-portfolio")}
            onSelect={setPortfolioId}
          />
        ) : null}
        {portfolios.length && tab === "dashboard" ? <DashboardView equity={equity} metrics={metrics} /> : null}
        {portfolios.length && tab === "positions" ? (
          <PositionsView
            onDeletePosition={(position) => setModal({type: "delete-position", data: position})}
            onDeleteTransaction={(transaction) => setModal({type: "delete-transaction", data: transaction})}
            onEditPosition={(position) => {
              const source = rawPositions.find((item) => item.id === position.id) || position;
              setModal({type: "edit-position", data: source});
            }}
            onEditTransaction={(transaction) => setModal({type: "edit-transaction", data: transaction})}
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
        {portfolios.length && tab === "volatility" ? <VolatilityView volatility={volatilityPositions} /> : null}
      </div>

      {modal === "create-portfolio" ? <PortfolioModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreatePortfolio} /> : null}
      {modal === "switch-portfolio" ? (
        <ModalSheet title="Switch portfolio" subtitle="Choose the portfolio to display across dashboard, positions, watch list, and volatility." onClose={() => setModal(null)}>
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
      {modal === "rename-portfolio" && selectedPortfolio ? <PortfolioModal mode="edit" onClose={() => setModal(null)} onSubmit={handleRenamePortfolio} portfolio={selectedPortfolio} /> : null}
      {modal === "delete-portfolio" && selectedPortfolio ? <ConfirmModal confirmLabel="Delete portfolio" onClose={() => setModal(null)} onConfirm={handleDeletePortfolio} subtitle={`Delete "${selectedPortfolio.name}" together with its positions and transactions?`} title="Delete portfolio" /> : null}
      {modal === "position" ? <PositionModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreatePosition} positions={activeRawPositions} /> : null}
      {modal === "watchlist" ? <PositionModal mode="create" variant="watchlist" onClose={() => setModal(null)} onSubmit={handleCreatePosition} positions={activeRawPositions} /> : null}
      {modal === "transaction" ? <TransactionModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreateTransaction} positions={activeRawPositions} /> : null}
      {modal?.type === "edit-position" ? <PositionModal mode="edit" onClose={() => setModal(null)} onSubmit={async (payload) => {
        const {allocationAdjustments, positionPayload} = splitAllocationPayload(payload);
        await api.updatePosition(portfolioId, positionPayload.id, positionPayload);
        if (allocationAdjustments.length) {
          await Promise.all(
            allocationAdjustments.map((adjustment) => {
              const targetPosition = rawPositions.find((item) => item.id === adjustment.id);
              if (!targetPosition) return Promise.resolve();
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
