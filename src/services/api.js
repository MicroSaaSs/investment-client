const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
const TOKEN_KEY = "investment-platform-token";
let token = window.localStorage.getItem(TOKEN_KEY) || "";

async function request(path, options = {}) {
  const headers = {"Content-Type": "application/json", ...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});
  const text = await response.text();
  if (!response.ok) {
    try {
      const payload = text ? JSON.parse(text) : null;
      throw new Error(payload?.message || payload?.error || payload?.reason || `${response.status} ${response.statusText}`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || `${response.status} ${response.statusText}`);
      }
      throw error;
    }
  }
  if (response.status === 204) return null;
  return text ? JSON.parse(text) : null;
}

export const api = {
  setToken(value) {
    token = value || "";
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  },
  getToken() { return token; },
  async register(payload) {
    const res = await request("/api/auth/register", {method: "POST", body: JSON.stringify(payload)});
    this.setToken(res.token);
    return res;
  },
  async login(payload) {
    const res = await request("/api/auth/login", {method: "POST", body: JSON.stringify(payload)});
    this.setToken(res.token);
    return res;
  },
  async authGoogle(credential) {
    const res = await request("/api/auth/google", {method: "POST", body: JSON.stringify({credential})});
    this.setToken(res.token);
    return res;
  },
  async linkGoogle(credential) {
    const res = await request("/api/auth/google/link", {method: "POST", body: JSON.stringify({credential})});
    this.setToken(res.token);
    return res;
  },
  async authTelegram(initData) {
    const res = await request("/api/auth/telegram", {method: "POST", body: JSON.stringify({initData})});
    this.setToken(res.token);
    return res;
  },
  async linkTelegram(initData, code) {
    const res = await request("/api/auth/telegram/link", {method: "POST", body: JSON.stringify({initData, code})});
    this.setToken(res.token);
    return res;
  },
  async linkEmail(payload) {
    const res = await request("/api/auth/email/link", {method: "POST", body: JSON.stringify(payload)});
    this.setToken(res.token);
    return res;
  },
  getCurrentUser: () => request("/api/auth/me"),
  createTelegramLinkSession: () => request("/api/auth/telegram/link-session", {method: "POST"}),
  getAccountShares: (ownerUserId = "") => request(`/api/account/shares${ownerUserId ? `?ownerUserId=${encodeURIComponent(ownerUserId)}` : ""}`),
  getAccountAudit: () => request("/api/account/audit"),
  saveAccountShare: (payload) => request("/api/account/shares", {method: "POST", body: JSON.stringify(payload)}),
  acceptAccountShareInvite: (token) => request("/api/account/shares/accept", {method: "POST", body: JSON.stringify({token})}),
  deleteAccountShare: (id, ownerUserId = "") => request(`/api/account/shares/${id}${ownerUserId ? `?ownerUserId=${encodeURIComponent(ownerUserId)}` : ""}`, {method: "DELETE"}),
  getAiSettings: () => request("/api/ai/settings"),
  updateAiSettings: (payload) => request("/api/ai/settings", {method: "PUT", body: JSON.stringify(payload)}),
  getAiSummary: (portfolioId) => request(`/api/ai/summary?portfolioId=${encodeURIComponent(portfolioId)}`),
  getPortfolios: () => request("/api/portfolios"),
  createPortfolio: (payload) => request("/api/portfolios", {method: "POST", body: JSON.stringify(payload)}),
  updatePortfolio: (id, payload) => request(`/api/portfolios/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  deletePortfolio: (id) => request(`/api/portfolios/${id}`, {method: "DELETE"}),
  getWorkspace: (id, range = "month", mode = "daily") => request(`/api/portfolios/${id}/workspace?range=${encodeURIComponent(range)}&mode=${encodeURIComponent(mode)}`),
  getMetrics: (id) => request(`/api/portfolios/${id}/metrics`),
  getNews: (id, ticker = "all", period = "7d") => request(`/api/portfolios/${id}/news?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(period)}`),
  getEquityCurve: (id, range = "month", mode = "daily", options = {}) =>
    request(`/api/portfolios/${id}/equity-history?range=${encodeURIComponent(range)}&mode=${encodeURIComponent(mode)}`, options),
  getPositions: (id) => request(`/api/portfolios/${id}/positions`),
  createPosition: (id, payload) => request(`/api/portfolios/${id}/positions`, {method: "POST", body: JSON.stringify(payload)}),
  createPositionWithAdjustments: (id, payload, allocationAdjustments = []) =>
    request(`/api/portfolios/${id}/positions/with-adjustments`, {
      method: "POST",
      body: JSON.stringify({position: payload, allocationAdjustments}),
    }),
  updatePosition: (portfolioId, id, payload) => request(`/api/portfolios/${portfolioId}/positions/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  reorderPositions: (portfolioId, orderedIds) => request(`/api/portfolios/${portfolioId}/positions/reorder`, {method: "PUT", body: JSON.stringify({orderedIds})}),
  deletePosition: (portfolioId, id) => request(`/api/portfolios/${portfolioId}/positions/${id}`, {method: "DELETE"}),
  getTransactions: (id) => request(`/api/portfolios/${id}/transactions`),
  createTransaction: (id, payload) => request(`/api/portfolios/${id}/transactions`, {method: "POST", body: JSON.stringify(payload)}),
  updateTransaction: (portfolioId, id, payload) => request(`/api/portfolios/${portfolioId}/transactions/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  deleteTransaction: (portfolioId, id) => request(`/api/portfolios/${portfolioId}/transactions/${id}`, {method: "DELETE"})
};
