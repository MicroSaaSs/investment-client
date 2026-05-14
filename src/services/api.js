const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
let token = "";

async function request(path, options = {}) {
  const headers = {"Content-Type": "application/json", ...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.status === 204 ? null : response.json();
}

export const api = {
  setToken(value) { token = value; },
  async authTelegram(initData) {
    const res = await request("/api/auth/telegram", {method: "POST", body: JSON.stringify({initData: initData || "dev"})});
    token = res.token;
    return res;
  },
  getPortfolios: () => request("/api/portfolios"),
  createPortfolio: (payload) => request("/api/portfolios", {method: "POST", body: JSON.stringify(payload)}),
  getMetrics: (id) => request(`/api/portfolios/${id}/metrics`),
  getEquityCurve: (id) => request(`/api/portfolios/${id}/equity-curve`),
  getVolatility: (id) => request(`/api/portfolios/${id}/volatility`),
  createPosition: (id, payload) => request(`/api/portfolios/${id}/positions`, {method: "POST", body: JSON.stringify(payload)}),
  createTransaction: (id, payload) => request(`/api/portfolios/${id}/transactions`, {method: "POST", body: JSON.stringify(payload)})
};
