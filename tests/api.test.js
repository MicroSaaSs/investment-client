import assert from "node:assert/strict";
import {after, beforeEach, test} from "node:test";
import {createServer} from "vite";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  setTimeout,
  clearTimeout,
};
const originalFetch = globalThis.fetch;
const server = await createServer({
  server: {middlewareMode: true, ws: false},
  appType: "custom",
  optimizeDeps: {noDiscovery: true, include: []},
});
const {api} = await server.ssrLoadModule("/src/services/api.js");
let failures = [];
const unsubscribe = api.subscribeToFailures((event) => failures.push(event));
const response = (status) => new Response(JSON.stringify({message: "Test failure"}), {status});

beforeEach(() => {
  api.setToken("test-token");
  failures = [];
  window.setTimeout = setTimeout;
});

after(async () => {
  unsubscribe();
  globalThis.fetch = originalFetch;
  delete globalThis.window;
  await server.close();
});

test("expired protected sessions clear the token and notify the application", async () => {
  globalThis.fetch = async () => response(401);
  await assert.rejects(api.getPortfolios(), {status: 401});
  assert.equal(api.getToken(), "");
  assert.equal(storage.has("investment-platform-token"), false);
  assert.equal(failures[0].type, "session-expired");
});

test("unauthorized responses log out immediately even when the response body cannot be read", async () => {
  globalThis.fetch = async () => ({status: 401, text: async () => { throw new TypeError("Body connection lost"); }});
  await assert.rejects(api.getTransactions("p1"), {status: 401});
  assert.equal(api.getToken(), "");
  assert.deepEqual(failures.map(({type}) => type), ["session-expired"]);
});

test("unauthorized protected requests trigger logout even when the token is already missing", async () => {
  api.setToken("");
  globalThis.fetch = async () => response(401);
  await assert.rejects(api.getMetrics("p1"), {status: 401});
  assert.equal(failures[0].type, "session-expired");
});

test("read-only permissions and rejected logins do not invalidate the current session", async () => {
  globalThis.fetch = async () => response(403);
  await assert.rejects(api.getPortfolios(), {status: 403});
  globalThis.fetch = async () => response(401);
  await assert.rejects(api.login({email: "test@example.com", password: "test"}), {status: 401});
  assert.equal(api.getToken(), "test-token");
  assert.equal(failures.length, 0);
});

test("network failures and service outages preserve the token and notify recovery UI", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(api.getCurrentUser(), {isConnectionError: true});
  globalThis.fetch = async () => response(503);
  await assert.rejects(api.getPortfolios(), {status: 503, isConnectionError: true});
  globalThis.fetch = async () => response(500);
  await assert.rejects(api.getPortfolios(), {status: 500, isConnectionError: true});
  assert.equal(api.getToken(), "test-token");
  assert.deepEqual(failures.map(({type}) => type), ["connection", "connection", "connection"]);
});

test("late unauthorized responses cannot sign out a newer session", async () => {
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const pending = api.getCurrentUser();
  api.setToken("new-token");
  finish(response(401));
  await assert.rejects(pending, {status: 401});
  assert.equal(api.getToken(), "new-token");
  assert.equal(failures.length, 0);
});

test("cancelled chart requests do not open the connection error screen", async () => {
  globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.getEquityCurve("p1", "month", "daily", {signal: controller.signal}), {name: "AbortError"});
  assert.equal(failures.length, 0);
});

test("requests that time out show recovery instead of loading forever", async () => {
  window.setTimeout = (callback) => { queueMicrotask(callback); return 0; };
  globalThis.fetch = (_url, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {once: true});
  });
  await assert.rejects(api.getPortfolios(), {isConnectionError: true});
  assert.equal(failures[0].type, "connection");
  assert.equal(api.getToken(), "test-token");
});
