import {useEffect, useRef, useState} from "react";
import {api} from "../services/api";
import {getTelegramInitData, humanizeTelegramAuthError, isTransientTelegramBootstrapError, wait} from "../utils/appHelpers";
import {DEFAULT_AUTH_FORM, DEFAULT_EMAIL_LINK_FORM} from "../constants/appConstants";

export function useAuthFlow({
  googleClientId,
  loadPortfolios,
  onAuthenticated,
  onError,
  onLogoutCleanup,
  telegramInitData,
}) {
  const [authMode, setAuthMode] = useState("login");
  const [authBusy, setAuthBusy] = useState(true);
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [emailLinkForm, setEmailLinkForm] = useState(DEFAULT_EMAIL_LINK_FORM);
  const [telegramLinkCode, setTelegramLinkCode] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [linkSession, setLinkSession] = useState(null);
  const telegramAutoLoginAttempted = useRef(false);
  const loadPortfoliosRef = useRef(loadPortfolios);
  const onErrorRef = useRef(onError);
  const isAuthenticated = Boolean(api.getToken());
  const isTelegramMiniApp = Boolean(telegramInitData);
  const showLogout = !isTelegramMiniApp && Boolean(currentUser);

  useEffect(() => {
    loadPortfoliosRef.current = loadPortfolios;
  }, [loadPortfolios]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    async function boot() {
      setAuthBusy(true);
      try {
        window.Telegram?.WebApp?.ready?.();
        if (api.getToken()) {
          try {
            const user = await api.getCurrentUser();
            setCurrentUser(user);
            await acceptShareInviteFromUrl();
            await loadPortfoliosRef.current();
            return;
          } catch (tokenError) {
            api.setToken("");
            setCurrentUser(null);
            if (!telegramInitData) {
              throw tokenError;
            }
          }
        }
        if (telegramInitData && !telegramAutoLoginAttempted.current) {
          telegramAutoLoginAttempted.current = true;
          const authResponse = await authTelegramWithRetry(telegramInitData);
          setCurrentUser(authResponse);
          onErrorRef.current("");
          await acceptShareInviteFromUrl();
          await loadPortfoliosRef.current();
        }
      } catch (error) {
        api.setToken("");
        setCurrentUser(null);
        onErrorRef.current(telegramInitData ? humanizeTelegramAuthError(error) : String(error.message || error));
      } finally {
        setAuthBusy(false);
      }
    }
    boot();
  }, [telegramInitData]);

  useEffect(() => {
    if (isAuthenticated || telegramInitData || !googleClientId) return;
    let cancelled = false;

    async function waitForGoogle() {
      for (let i = 0; i < 40; i += 1) {
        if (window.google?.accounts?.id) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (cancelled || !window.google?.accounts?.id) {
        if (!cancelled) onErrorRef.current("Google Sign-In script failed to load");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          onErrorRef.current("");
          setAuthBusy(true);
          try {
            const authResponse = await api.authGoogle(response.credential);
            setCurrentUser(authResponse);
            await acceptShareInviteFromUrl();
            await loadPortfoliosRef.current();
          } catch (error) {
            onErrorRef.current(String(error.message || error));
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
    return () => {
      cancelled = true;
    };
  }, [googleClientId, isAuthenticated, telegramInitData]);

  useEffect(() => {
    if (!currentUser) return;
    setEmailLinkForm((current) => ({
      email: current.email || currentUser.email || "",
      password: current.password,
    }));
  }, [currentUser]);

  function updateAuthField(key, value) {
    setAuthForm((current) => ({...current, [key]: value}));
  }

  function updateEmailLinkField(key, value) {
    setEmailLinkForm((current) => ({...current, [key]: value}));
  }

  async function submitAuth(event) {
    event.preventDefault();
    onError("");
    setAuthBusy(true);
    try {
      const authResponse = authMode === "register"
        ? await api.register(authForm)
        : await api.login({email: authForm.email, password: authForm.password});
      setCurrentUser(authResponse);
      await acceptShareInviteFromUrl();
      await loadPortfolios();
    } catch (error) {
      onError(humanizeTelegramAuthError(error));
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

  async function telegramLogin() {
    if (!telegramInitData) return;
    onError("");
    setAuthBusy(true);
    try {
      const authResponse = telegramLinkCode.trim()
        ? await api.linkTelegram(telegramInitData, telegramLinkCode.trim())
        : await authTelegramWithRetry(telegramInitData);
      setCurrentUser(authResponse);
      setTelegramLinkCode("");
      await acceptShareInviteFromUrl();
      await loadPortfolios();
    } catch (error) {
      onError(humanizeTelegramAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleTelegramMerge() {
    if (!telegramInitData || !telegramLinkCode.trim()) return;
    onError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkTelegram(telegramInitData, telegramLinkCode.trim());
      setCurrentUser(authResponse);
      setTelegramLinkCode("");
      setLinkSession(null);
      await acceptShareInviteFromUrl();
      await loadPortfolios();
    } catch (error) {
      onError(String(error.message || error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailLink() {
    onError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkEmail(emailLinkForm);
      setCurrentUser(authResponse);
      setEmailLinkForm({email: authResponse.email || "", password: ""});
      await acceptShareInviteFromUrl();
      await loadPortfolios();
    } catch (error) {
      onError(String(error.message || error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleLink(credential) {
    onError("");
    setAuthBusy(true);
    try {
      const authResponse = await api.linkGoogle(credential);
      setCurrentUser(authResponse);
      await acceptShareInviteFromUrl();
      await loadPortfolios();
    } catch (error) {
      onError(String(error.message || error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function createTelegramLinkCode() {
    onError("");
    try {
      const session = await api.createTelegramLinkSession();
      setLinkSession(session);
    } catch (error) {
      onError(String(error.message || error));
    }
  }

  function logout() {
    api.setToken("");
    window.google?.accounts?.id?.disableAutoSelect?.();
    setCurrentUser(null);
    setAuthBusy(false);
    setLinkSession(null);
    setTelegramLinkCode("");
    setEmailLinkForm(DEFAULT_EMAIL_LINK_FORM);
    onAuthenticated?.(null);
    onError("");
    onLogoutCleanup?.();
  }

  async function acceptShareInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("shareInvite");
    if (!token) return;
    try {
      await api.acceptAccountShareInvite(token);
      params.delete("shareInvite");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", nextUrl);
      onErrorRef.current("");
    } catch (error) {
      onErrorRef.current(`Share invite was not accepted: ${String(error.message || error)}`);
    }
  }

  return {
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
    logout,
    setAuthMode,
    setTelegramLinkCode,
    showLogout,
    submitAuth,
    telegramLinkCode,
    telegramLogin,
    updateAuthField,
    updateEmailLinkField,
  };
}
