export const TRANSACTION_SORT_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "ticker", label: "Ticker" },
  { id: "type", label: "Type" },
  { id: "shares", label: "Shares", numeric: true },
  { id: "price", label: "Price", numeric: true },
  { id: "fees", label: "Fees", numeric: true },
];

export function sortTransactions(transactions = [], columnId = "date", direction = "desc") {
  const column = TRANSACTION_SORT_COLUMNS.find((item) => item.id === columnId);
  if (!column) return [...transactions];
  const multiplier = direction === "asc" ? 1 : -1;
  return [...transactions].sort((left, right) => {
    if (column.numeric) {
      const leftValue = Number(left[columnId]);
      const rightValue = Number(right[columnId]);
      return multiplier * (
        (Number.isFinite(leftValue) ? leftValue : 0)
        - (Number.isFinite(rightValue) ? rightValue : 0)
      );
    }
    return multiplier * String(left[columnId] || "").localeCompare(
      String(right[columnId] || ""),
      undefined,
      { sensitivity: "base", numeric: true }
    );
  });
}
