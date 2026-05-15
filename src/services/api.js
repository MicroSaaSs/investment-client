const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
const TOKEN_KEY = "investment-platform-token";
let token = window.localStorage.getItem(TOKEN_KEY) || "";

async function request(path, options = {}) {
  const headers = {"Content-Type": "application/json", ...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (response.status === 204) return null;
  const text = await response.text();
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
  getPortfolios: () => request("/api/portfolios"),
  createPortfolio: (payload) => request("/api/portfolios", {method: "POST", body: JSON.stringify(payload)}),
  updatePortfolio: (id, payload) => request(`/api/portfolios/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  deletePortfolio: (id) => request(`/api/portfolios/${id}`, {method: "DELETE"}),
  getMetrics: (id) => request(`/api/portfolios/${id}/metrics`),
  getEquityCurve: (id) => request(`/api/portfolios/${id}/equity-curve`),
  getVolatility: (id) => request(`/api/portfolios/${id}/volatility`),
  getPositions: (id) => request(`/api/portfolios/${id}/positions`),
  createPosition: (id, payload) => request(`/api/portfolios/${id}/positions`, {method: "POST", body: JSON.stringify(payload)}),
  updatePosition: (portfolioId, id, payload) => request(`/api/portfolios/${portfolioId}/positions/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  deletePosition: (portfolioId, id) => request(`/api/portfolios/${portfolioId}/positions/${id}`, {method: "DELETE"}),
  getTransactions: (id) => request(`/api/portfolios/${id}/transactions`),
  createTransaction: (id, payload) => request(`/api/portfolios/${id}/transactions`, {method: "POST", body: JSON.stringify(payload)}),
  updateTransaction: (portfolioId, id, payload) => request(`/api/portfolios/${portfolioId}/transactions/${id}`, {method: "PUT", body: JSON.stringify(payload)}),
  deleteTransaction: (portfolioId, id) => request(`/api/portfolios/${portfolioId}/transactions/${id}`, {method: "DELETE"})
};
