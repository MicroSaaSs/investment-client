import React, {useMemo, useState} from "react";
import {ModalSheet} from "./ModalSheet";

function buildForm(transaction, positions, today) {
  const isCashTxn = (transaction?.ticker || positions[0]?.ticker || "").toUpperCase() === "CASH";
  const cashAmount = transaction ? Number(transaction.shares || 0) * Number(transaction.price || 0) : "";
  const cashBuckets = positions.filter((position) => position.type === "CASH");
  if (!transaction) {
    return {
      ticker: positions[0]?.ticker || "",
      shares: "",
      price: "",
      amount: "",
      date: today,
      type: "BUY",
      useCashTransfer: false,
      cashBucketId: cashBuckets[0]?.id || "",
    };
  }
  return {
    ticker: transaction.ticker || positions[0]?.ticker || "",
    shares: isCashTxn ? "" : String(transaction.shares ?? ""),
    price: isCashTxn ? "" : String(transaction.price ?? ""),
    amount: isCashTxn ? String(cashAmount || "") : "",
    date: transaction.date || today,
    type: transaction.type || "BUY",
    useCashTransfer: false,
    cashBucketId: cashBuckets[0]?.id || "",
  };
}

export function TransactionModal({mode = "create", positions, transaction, onClose, onSubmit}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState(buildForm(transaction, positions, today));
  const selectedPosition = positions.find((position) => position.ticker === form.ticker);
  const isCashPosition = selectedPosition?.type === "CASH" || selectedPosition?.type === "CASH_ETF";
  const cashBuckets = positions.filter((position) => position.type === "CASH");
  const canUseCashTransfer = mode === "create" && !isCashPosition && cashBuckets.length > 0;

  function update(key, value) {
    setForm((current) => ({...current, [key]: value}));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.ticker.trim()) return;
    const shares = isCashPosition ? Number(form.amount || 0) : Number(form.shares || 0);
    const price = isCashPosition ? 1 : Number(form.price || 0);
    const notional = Number(shares || 0) * Number(price || 0);
    const selectedCashBucket = cashBuckets.find((position) => position.id === form.cashBucketId) || null;
    onSubmit({
      id: transaction?.id,
      ticker: form.ticker.trim().toUpperCase(),
      type: form.type,
      date: form.date,
      shares,
      price,
      fees: 0,
      currency: "USD",
      cashTransfer: canUseCashTransfer && form.useCashTransfer && selectedCashBucket && notional > 0 ? {
        ticker: selectedCashBucket.ticker,
        type: form.type === "BUY" ? "SELL" : "BUY",
        date: form.date,
        shares: notional,
        price: 1,
        fees: 0,
        currency: "USD",
      } : null,
    });
  }

  return (
    <ModalSheet
      title={mode === "edit" ? "Edit transaction" : "Record transaction"}
      subtitle={mode === "edit" ? "Update the trade details for this portfolio." : isCashPosition ? "Add a cash movement so your balance stays aligned." : "Add a buy or sell so your holdings and performance stay up to date."}
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
            <option value="BUY">{isCashPosition ? "Deposit" : "BUY"}</option>
            <option value="SELL">{isCashPosition ? "Withdraw" : "SELL"}</option>
          </select>
        </label>
        {isCashPosition ? (
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
            {canUseCashTransfer ? (
              <>
                <label>
                  <span>Cash handling</span>
                  <select value={form.useCashTransfer ? "BUFFER" : "DIRECT"} onChange={(e) => update("useCashTransfer", e.target.value === "BUFFER")}>
                    <option value="DIRECT">Direct trade only</option>
                    <option value="BUFFER">{form.type === "BUY" ? "Buy from CASH bucket" : "Sell to CASH bucket"}</option>
                  </select>
                </label>
                {form.useCashTransfer ? (
                  <label>
                    <span>{form.type === "BUY" ? "Fund from CASH bucket" : "Transfer proceeds to CASH bucket"}</span>
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
