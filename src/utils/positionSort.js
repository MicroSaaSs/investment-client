export const DEFAULT_POSITION_SORT_ORDER = "manual";

export const POSITION_SORT_OPTIONS = [
  { id: "manual", label: "Manual order" },
];

export function normalizePositionSortOrder(value) {
  return value === "manual" ? "manual" : DEFAULT_POSITION_SORT_ORDER;
}

function displayOrderValue(position) {
  const value = Number(position?.displayOrder);
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

export function sortPositions(positions) {
  const list = Array.isArray(positions) ? [...positions] : [];
  list.sort((left, right) => {
    const byOrder = displayOrderValue(left) - displayOrderValue(right);
    if (byOrder !== 0) return byOrder;
    return String(left?.ticker || "").localeCompare(String(right?.ticker || ""));
  });
  return list;
}

export function buildManualOrderIds(positions) {
  return sortPositions(positions).map((position) => position.id).filter(Boolean);
}

export function moveManualOrderItem(orderIds, id, direction) {
  const list = Array.isArray(orderIds) ? [...orderIds] : [];
  const index = list.indexOf(id);
  if (index < 0) return list;
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= list.length) return list;
  const [item] = list.splice(index, 1);
  list.splice(nextIndex, 0, item);
  return list;
}

export function moveItemBefore(orderIds, movingId, targetId) {
  const list = Array.isArray(orderIds) ? [...orderIds] : [];
  if (!movingId || !targetId || movingId === targetId) return list;
  const fromIndex = list.indexOf(movingId);
  const targetIndex = list.indexOf(targetId);
  if (fromIndex < 0 || targetIndex < 0) return list;
  list.splice(fromIndex, 1);
  const nextTargetIndex = list.indexOf(targetId);
  list.splice(nextTargetIndex, 0, movingId);
  return list;
}

export function moveItemAfter(orderIds, movingId, targetId) {
  const list = Array.isArray(orderIds) ? [...orderIds] : [];
  if (!movingId || !targetId || movingId === targetId) return list;
  const fromIndex = list.indexOf(movingId);
  const targetIndex = list.indexOf(targetId);
  if (fromIndex < 0 || targetIndex < 0) return list;
  list.splice(fromIndex, 1);
  const nextTargetIndex = list.indexOf(targetId);
  list.splice(nextTargetIndex + 1, 0, movingId);
  return list;
}
