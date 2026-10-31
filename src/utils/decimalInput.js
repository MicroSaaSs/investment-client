export function normalizeDecimalInput(value) {
  return String(value ?? "").replace(/,/g, ".");
}

export function parseDecimalInput(value, fallback = 0) {
  const normalized = normalizeDecimalInput(value).trim();
  if (!normalized) return fallback;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}
