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

export function pctMagnitude(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function sourceLabel(source) {
  switch ((source || "").toUpperCase()) {
    case "LIVE":
      return "Live";
    case "DELAYED":
      return "Last close";
    case "MANUAL":
      return "Saved";
    default:
      return "Unavailable";
  }
}
