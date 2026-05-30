function hasNumber(value) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

export function money(value, digits = 0, fallback = "—") {
  if (!hasNumber(value)) return fallback;
  return `$${Number(value).toLocaleString(undefined, {maximumFractionDigits: digits})}`;
}

export function compactMoney(value, fallback = "—") {
  if (!hasNumber(value)) return fallback;
  const n = Number(value);
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return money(n);
}

export function pct(value, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value || 0).toFixed(digits)}%`;
}

export function pctPlain(value, digits = 1, fallback = "—") {
  if (!hasNumber(value)) return fallback;
  return `${Number(value).toFixed(digits)}%`;
}

export function pctMagnitude(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function pctNegative(value, digits = 1) {
  const n = Math.abs(Number(value || 0));
  return `-${n.toFixed(digits)}%`;
}

function isClosedUsEquitySession(type) {
  const normalizedType = String(type || "").trim().toUpperCase();
  if (normalizedType !== "STOCK" && normalizedType !== "CASH_ETF") return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  if (weekday === "Sat" || weekday === "Sun") return true;
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const totalMinutes = (hour * 60) + minute;
  const extendedOpenMinutes = 4 * 60;
  const extendedCloseMinutes = 20 * 60;
  return totalMinutes < extendedOpenMinutes || totalMinutes >= extendedCloseMinutes;
}

export function sourceLabel(source, type) {
  const normalizedSource = (source || "").toUpperCase();
  if (normalizedSource === "DELAYED" && isClosedUsEquitySession(type)) {
    return "Closed";
  }
  switch (normalizedSource) {
    case "LIVE":
      return "Live";
    case "DELAYED":
      return "Delayed";
    case "MANUAL":
      return "Saved";
    default:
      return "Unavailable";
  }
}
