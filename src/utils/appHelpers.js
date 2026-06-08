export function getTelegramInitData() {
  const initData = window.Telegram?.WebApp?.initData;
  return typeof initData === "string" && initData.trim() ? initData : "";
}

export function splitAllocationPayload(payload) {
  const {allocationAdjustments = [], ...positionPayload} = payload;
  return {allocationAdjustments, positionPayload};
}

export function uniqueLatestAllocationAdjustments(adjustments) {
  const map = new Map();
  for (const adjustment of adjustments || []) {
    if (!adjustment?.id) continue;
    map.set(adjustment.id, adjustment);
  }
  return [...map.values()];
}

export function hasPortfolioTickerDuplicate(positions, ticker, excludedId = null) {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  if (!normalizedTicker) return false;
  return (positions || []).some((position) =>
    position
      && String(position.ticker || "").trim().toUpperCase() === normalizedTicker
      && position.id !== excludedId
      && !position.archived
  );
}

export function humanizeTelegramAuthError(error) {
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

export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function nextEtSummaryResetIso() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 1);
  const day = Number(parts.find((part) => part.type === "day")?.value || 1);
  const nextEtMidnight = new Date(Date.UTC(year, month - 1, day + 1, 4, 1, 0));
  return nextEtMidnight.toISOString();
}

export function isTransientTelegramBootstrapError(error) {
  const message = String(error?.message || error || "");
  return /Failed to fetch|Load failed|NetworkError|fetch failed|502|503|504|timeout|timed out|Bad Gateway|Service Unavailable|Gateway Timeout/i.test(message);
}

export function applyDisplayOrderToPositions(positions, orderedIds) {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return (positions || []).map((position) => {
    const nextOrder = orderMap.get(position.id);
    return nextOrder ? {...position, displayOrder: nextOrder} : position;
  });
}
