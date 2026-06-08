import React, {useEffect, useMemo, useState} from "react";
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
    const defaultPosition = positions[0] || null;
    return {
      ticker: defaultPosition?.ticker || "",
      shares: "",
      price: isCashTxn ? "" : defaultPriceForPosition(defaultPosition),
      fees: "",
      amount: "",
      date: today,
      type: isCashTxn ? "DEPOSIT" : "BUY",
      useCashTransfer: false,
      cashBucketId: cashBuckets[0]?.id || "",
    };
  }
  const linkedCashTransfer = transaction.cashTransfer || null;
  return {
    ticker: transaction.ticker || positions[0]?.ticker || "",
    shares: isCashTxn || isAmountType ? "" : String(transaction.shares ?? ""),
    price: isCashTxn || isAmountType ? "" : String(transaction.price ?? ""),
    fees: isCashTxn || isAmountType ? "" : String(transaction.fees ?? ""),
    amount: isCashTxn || isAmountType ? String(cashAmount || "") : "",
    date: transaction.date || today,
    type: normalizedType,
    useCashTransfer: Boolean(linkedCashTransfer),
    cashBucketId: linkedCashTransfer?.positionId || cashBuckets.find((position) => position.ticker === linkedCashTransfer?.ticker)?.id || cashBuckets[0]?.id || "",
  };
}

function defaultPriceForPosition(position) {
  const value = position?.lastMarketPrice ?? position?.price ?? "";
  return value === "" || value == null ? "" : String(value);
}

function isCashBucketPosition(position) {
  return position?.type === "CASH";
}

function autoCashTransferNote(type, ticker) {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  return `AUTO_CASH_TRANSFER:${type}:${normalizedTicker}`;
}

function amountFromTransaction(transaction) {
  const shares = Math.max(Number(transaction?.shares || 0), 0);
  const price = Math.max(Number(transaction?.price || 0), 0);
  if (shares > 0 && price > 0) return shares * price;
  if (shares > 0) return shares;
  return price;
}

export function TransactionModal({
  mode = "create",
  positions,
  transaction,
  onClose,
  onSubmit,
  portfolioOptions = [],
  positionsByPortfolio = null,
  defaultPortfolioId = "",
  portfolioLocked = false,
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const showPortfolioSelector = portfolioOptions.length > 0;
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(transaction?.portfolioId || transaction?.portfolioContextId || defaultPortfolioId || portfolioOptions[0]?.id || "");
  const scopedPositions = useMemo(() => {
    if (!positionsByPortfolio) return positions;
    return positionsByPortfolio[selectedPortfolioId] || [];
  }, [positions, positionsByPortfolio, selectedPortfolioId]);
  const [form, setForm] = useState(buildForm(transaction, scopedPositions, today));
  const selectedPosition = scopedPositions.find((position) => position.ticker === form.ticker);
  const isCashPosition = isCashBucketPosition(selectedPosition);
  const normalizedType = normalizeTransactionType(form.type, isCashPosition);
  const isAmountType = AMOUNT_TRANSACTION_TYPES.has(normalizedType);
  const cashBuckets = scopedPositions.filter((position) => position.type === "CASH");
  const canUseCashTransfer = !isCashPosition && cashBuckets.length > 0;
  const canUseCashBucket = canUseCashTransfer && ["BUY", "SELL", "DIVIDEND", "FEE"].includes(normalizedType);

  useEffect(() => {
    const fallbackPortfolioId = transaction?.portfolioId || transaction?.portfolioContextId || defaultPortfolioId || portfolioOptions[0]?.id || "";
    if (!fallbackPortfolioId) return;
    setSelectedPortfolioId((current) => {
      if (current && portfolioOptions.some((portfolio) => portfolio.id === current)) return current;
      return fallbackPortfolioId;
    });
  }, [defaultPortfolioId, portfolioOptions, transaction?.portfolioContextId, transaction?.portfolioId]);

  useEffect(() => {
    if (!scopedPositions.length) return;
    setForm((current) => {
      const nextTicker = scopedPositions.some((position) => position.ticker === current.ticker)
        ? current.ticker
        : (transaction?.ticker && scopedPositions.some((position) => position.ticker === transaction.ticker)
          ? transaction.ticker
          : scopedPositions[0]?.ticker || "");
      const nextPosition = scopedPositions.find((position) => position.ticker === nextTicker) || scopedPositions[0];
      const nextIsCash = isCashBucketPosition(nextPosition);
      const nextType = normalizeTransactionType(current.type, nextIsCash);
      const nextIsAmountType = AMOUNT_TRANSACTION_TYPES.has(nextType);
      const nextCashBuckets = scopedPositions.filter((position) => position.type === "CASH");
      return {
        ...current,
        ticker: nextTicker,
        type: nextType,
        cashBucketId: nextCashBuckets.find((position) => position.id === current.cashBucketId)?.id || nextCashBuckets[0]?.id || "",
        price: nextIsCash || nextIsAmountType ? "" : (current.ticker === nextTicker && current.price !== "" ? current.price : defaultPriceForPosition(nextPosition)),
        shares: nextIsCash || nextIsAmountType ? "" : current.shares,
        fees: nextIsCash || nextIsAmountType ? "" : current.fees,
        amount: nextIsCash || nextIsAmountType ? current.amount : "",
        useCashTransfer: nextIsCash ? false : current.useCashTransfer,
      };
    });
  }, [scopedPositions, transaction?.ticker]);

  function update(key, value) {
    setForm((current) => ({...current, [key]: value}));
  }

  function handlePortfolioChange(nextPortfolioId) {
    setSelectedPortfolioId(nextPortfolioId);
  }

  function handleTickerChange(nextTicker) {
    const nextPosition = scopedPositions.find((position) => position.ticker === nextTicker);
    const nextIsCash = isCashBucketPosition(nextPosition);
    const nextType = normalizeTransactionType(form.type, nextIsCash);
    const nextIsAmountType = AMOUNT_TRANSACTION_TYPES.has(nextType);
    setForm((current) => ({
      ...current,
      ticker: nextTicker,
      type: nextType,
      price: nextIsCash || nextIsAmountType ? "" : defaultPriceForPosition(nextPosition),
      amount: nextIsCash || nextIsAmountType ? current.amount : "",
      shares: nextIsCash || nextIsAmountType ? "" : current.shares,
      fees: nextIsCash || nextIsAmountType ? "" : current.fees,
      useCashTransfer: nextIsCash ? false : current.useCashTransfer,
    }));
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
      portfolioId: selectedPortfolioId || defaultPortfolioId,
      ticker: form.ticker.trim().toUpperCase(),
      type: normalizedType,
      date: form.date,
      shares,
      price,
      fees,
      currency: "USD",
      originalCashTransferId: transaction?.cashTransfer?.id || null,
      cashTransfer: canUseCashBucket && form.useCashTransfer && selectedCashBucket && cashTransferAmount > 0 ? {
        id: transaction?.cashTransfer?.id,
        portfolioId: selectedPortfolioId || defaultPortfolioId,
        positionId: selectedCashBucket.id,
        ticker: selectedCashBucket.ticker,
        type: normalizedType === "BUY" || normalizedType === "FEE" ? "WITHDRAWAL" : "DEPOSIT",
        date: form.date,
        shares: cashTransferAmount,
        price: 0,
        fees: 0,
        currency: "USD",
        note: autoCashTransferNote(normalizedType, form.ticker),
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
        {showPortfolioSelector ? (
          <label className="modal-actions-wide">
            <span>Portfolio</span>
            <select disabled={portfolioLocked} value={selectedPortfolioId} onChange={(e) => handlePortfolioChange(e.target.value)}>
              {portfolioOptions.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Ticker</span>
          <select value={form.ticker} onChange={(e) => handleTickerChange(e.target.value)}>
            {scopedPositions.map((position) => <option key={position.id} value={position.ticker}>{position.ticker}</option>)}
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
