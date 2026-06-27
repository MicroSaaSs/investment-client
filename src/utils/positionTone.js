export function positionPnlToneClass(position) {
  if (position?.type === "CASH") return "";
  const pnl = Number(position?.current || 0) - Number(position?.invested || 0);
  if (!Number.isFinite(pnl) || pnl === 0) return "";
  return pnl > 0 ? "position-tone-positive" : "position-tone-negative";
}
