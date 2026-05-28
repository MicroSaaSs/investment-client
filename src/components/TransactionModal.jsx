import React, {useMemo, useState} from "react";
import {ModalSheet} from "./ModalSheet";

const AMOUNT_TRANSACTION_TYPES = new Set(["DEPOSIT", "WITHDRAWAL", "DIVIDEND", "FEE"]);
const CASH_TRANSACTION_OPTIONS = [
  {value: "DEPOSIT", label: "Deposit"},
  {value: "WITHDRAWAL", label: "Withdrawal"},
  {value: "DIVIDEND", label: "Dividend (+ cash, + realized PnL)"},
  {value: "FEE", label: "Fee (- cash, - realized PnL)"},
];
const SECURITY_TRANSACTION_OPTIONS = [
  {value: "BUY", label: "BUY"},
  {value: "SELL", label: "SELL"},
  {value: "DIVIDEND", label: "Dividend (+ cash, + realized PnL)"},
  {value: "FEE", label: "Fee (- cash, - realized PnL)"},
];

function normalizeTransactionType(type, isCashTxn) {
  const raw = String(type || "").trim().toUpperCase();
  if (isCashTxn) {
    if (raw === "BUY") return "DEPOSIT";
    if (raw === "SELL") return "WITHDRAWAL";
    if (raw === "DEPOSIT" || raw === "WITHDRAWAL") return raw;
    return "DEPOSIT";
  }
  if (["BUY", "SELL", "DIVIDEND", "FEE"].includes(raw)) return raw;
  return "BUY";
}

function buildForm(transaction, positions, today) {
  const isCashTxn = (transaction?.ticker || positions[0]?.ticker || "").toUpperCase() === "CASH";
  const normalizedType = normalizeTransactionType(transaction?.type, isCashTxn);
  const isAmountType = AMOUNT_TRANSACTION_TYPES.has(normalizedType);
  const cashAmount = transaction
    ? (Number(transaction.shares || 0) > 0 && Number(transaction.price || 0) > 0
      ? Number(transaction.shares || 0) * Number(transaction.price || 0)
      : Number(transaction.shares || 0) || Number(transaction.price || 0) || "")
    : "";
  const cashBuckets = positions.filter((position) => position.type === "CASH");
  if (!transaction) {
    return {
      ticker: positions[0]?.ticker || "",
      shares: "",
      price: "",
      fees: "",
      amount: "",
      date: today,
      type: isCashTxn ? "DEPOSIT" : "BUY",
      useCashTransfer: false,
      cashBucketId: cashBuckets[0]?.id || "",
    };
  }
  return {
    ticker: transaction.ticker || positions[0]?.ticker || "",
    shares: isCashTxn || isAmountType ? "" : String(transaction.shares ?? ""),
    price: isCashTxn || isAmountType ? "" : String(transaction.price ?? ""),
    fees: isCashTxn || isAmountType ? "" : String(transaction.fees ?? ""),
    amount: isCashTxn || isAmountType ? String(cashAmount || "") : "",
    date: transaction.date || today,
    type: normalizedType,
    useCashTransfer: false,
    cashBucketId: cashBuckets[0]?.id || "",
  };
}

export function TransactionModal({mode = "create", positions, transaction, onClose, onSubmit}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState(buildForm(transaction, positions, today));
  const selectedPosition = positions.find((position) => position.ticker === form.ticker);
  const isCashPosition = selectedPosition?.type === "CASH" || selectedPosition?.type === "CASH_ETF";
  const normalizedType = normalizeTransactionType(form.type, isCashPosition);
  const isAmountType = AMOUNT_TRANSACTION_TYPES.has(normalizedType);
  const cashBuckets = positions.filter((position) => position.type === "CASH");
  const canUseCashTransfer = mode === "create" && !isCashPosition && cashBuckets.length > 0;
  const canUseCashBucket = canUseCashTransfer && ["BUY", "SELL", "DIVIDEND", "FEE"].includes(normalizedType);

  function update(key, value) {
    setForm((current) => ({...current, [key]: value}));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.ticker.trim()) return;
    const amount = Number(form.amount || 0);
    const shares = isCashPosition || isAmountType ? amount : Number(form.shares || 0);
    const price = isCashPosition || isAmountType ? 0 : Number(form.price || 0);
    const fees = isCashPosition || isAmountType ? 0 : Number(form.fees || 0);
    const notional = Number(shares || 0) * Number(price || 0);
    const selectedCashBucket = cashBuckets.find((position) => position.id === form.cashBucketId) || null;
    const cashTransferAmount = (() => {
      switch (normalizedType) {
        case "BUY":
          return notional + fees;
        case "SELL":
          return Math.max(0, notional - fees);
        case "DIVIDEND":
          return amount;
        case "FEE":
          return amount;
        default:
          return 0;
      }
    })();
    onSubmit({
      id: transaction?.id,
      ticker: form.ticker.trim().toUpperCase(),
      type: normalizedType,
      date: form.date,
      shares,
      price,
      fees,
      currency: "USD",
      cashTransfer: canUseCashBucket && form.useCashTransfer && selectedCashBucket && cashTransferAmount > 0 ? {
        ticker: selectedCashBucket.ticker,
        type: normalizedType === "BUY" || normalizedType === "FEE" ? "WITHDRAWAL" : "DEPOSIT",
        date: form.date,
        shares: cashTransferAmount,
        price: 0,
        fees: 0,
        currency: "USD",
      } : null,
    });
  }

  return (
    <ModalSheet
      title={mode === "edit" ? "Edit transaction" : "Record transaction"}
      subtitle={mode === "edit"
        ? "Update the transaction details for this portfolio."
        : isCashPosition
          ? "Record a cash deposit or withdrawal so your balance stays aligned."
          : "Record trades, dividends, or fees so holdings and capital stay accurate."}
      onClose={onClose}
    >
      <form className="modal-form modal-grid" onSubmit={handleSubmit}>
        <label>
          <span>Ticker</span>
          <select value={form.ticker} onChange={(e) => update("ticker", e.target.value)}>
            {positions.map((position) => <option key={position.id} value={position.ticker}>{position.ticker}</option>)}
          </select>
        </label>
        <label>
          <span>{isCashPosition ? "Movement" : "Type"}</span>
          <select value={form.type} onChange={(e) => update("type", e.target.value)}>
            {(isCashPosition ? CASH_TRANSACTION_OPTIONS : SECURITY_TRANSACTION_OPTIONS).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {isCashPosition || isAmountType ? (
          <label>
            <span>Amount</span>
            <input inputMode="decimal" value={form.amount} onChange={(e) => update("amount", e.target.value)} />
          </label>
        ) : (
          <>
            <label>
              <span>Shares</span>
              <input inputMode="decimal" value={form.shares} onChange={(e) => update("shares", e.target.value)} />
            </label>
            <label>
              <span>Price</span>
              <input inputMode="decimal" value={form.price} onChange={(e) => update("price", e.target.value)} />
            </label>
            <label>
              <span>Fees</span>
              <input inputMode="decimal" value={form.fees} onChange={(e) => update("fees", e.target.value)} />
            </label>
            {canUseCashBucket ? (
              <>
                <label>
                  <span>Cash handling</span>
                  <select value={form.useCashTransfer ? "BUFFER" : "DIRECT"} onChange={(e) => update("useCashTransfer", e.target.value === "BUFFER")}>
                    <option value="DIRECT">Direct trade only</option>
                    <option value="BUFFER">{normalizedType === "BUY" ? "Buy from CASH bucket" : "Post to CASH bucket"}</option>
                  </select>
                </label>
                {form.useCashTransfer ? (
                  <label>
                    <span>{normalizedType === "BUY" || normalizedType === "FEE" ? "Use CASH bucket" : "Post into CASH bucket"}</span>
                    <select value={form.cashBucketId} onChange={(e) => update("cashBucketId", e.target.value)}>
                      {cashBuckets.map((position) => (
                        <option key={position.id} value={position.id}>{position.ticker} · {(position.company || "Uninvested cash")}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
          </>
        )}
        <label>
          <span>Date</span>
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
        </label>
        <div className="modal-actions modal-actions-wide">
          <button className="ghost" onClick={onClose} type="button">Cancel</button>
          <button className="primary" type="submit">{mode === "edit" ? "Save changes" : "Save transaction"}</button>
        </div>
      </form>
    </ModalSheet>
  );
}
