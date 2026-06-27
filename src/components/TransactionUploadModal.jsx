import React from "react";
import { ModalSheet } from "./ModalSheet";
import { parseTransactionImportFile, TRANSACTION_IMPORT_HEADERS } from "../utils/transactionImport";

function formatPreviewValue(row) {
  if (row.type === "BUY" || row.type === "SELL") {
    return `${row.shares} sh @ ${row.price}${row.fees ? ` · fee ${row.fees}` : ""}`;
  }
  return `${row.amount}${row.note ? ` · ${row.note}` : ""}`;
}

export function TransactionUploadModal({
  onClose,
  onSubmit,
  portfolioName,
  portfolioId,
  positions = [],
}) {
  const [fileName, setFileName] = React.useState("");
  const [parseResult, setParseResult] = React.useState(null);
  const [submitError, setSubmitError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setSubmitError("");
    setParseResult(null);
    setFileName(file?.name || "");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setParseResult({ errors: ["Only CSV files are supported."], previewRows: [], positionsToCreate: [], stats: null });
      return;
    }
    const text = await file.text();
    setParseResult(parseTransactionImportFile(text, positions));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!parseResult?.stats?.validRows || parseResult?.errors?.length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit({
        portfolioId,
        positionsToCreate: parseResult.positionsToCreate,
        transactions: parseResult.previewRows
          .filter((row) => !row.hasErrors && row.transactionPayload)
          .map((row) => row.transactionPayload),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error || "Import failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalSheet
      title="Upload transactions"
      subtitle={`Import CSV transactions into ${portfolioName || "the current portfolio"}. Missing tickers will be created automatically with default settings and allocation disabled.`}
      onClose={onClose}
    >
      <form className="modal-form transaction-upload-form" onSubmit={handleSubmit}>
        <div className="transaction-upload-copy">
          <strong>CSV format</strong>
          <span>Use these columns: <code>{TRANSACTION_IMPORT_HEADERS.join(", ")}</code></span>
          <span>`date`, `ticker`, and `type` are required. `BUY` and `SELL` need `shares` and `price`. `DIVIDEND`, `FEE`, `DEPOSIT`, and `WITHDRAWAL` need `amount`.</span>
          <span>`positionType` is optional and supports `STOCK`, `CRYPTO`, `CASH`, `CASH_ETF`.</span>
          <span>Example with 2 records:</span>
          <pre className="transaction-upload-example">{`date,ticker,type,shares,price,fees,amount,company,positionType,note
2026-06-10,AAPL,BUY,10,205.45,1.00,,Apple Inc,STOCK,Initial buy
2026-06-14,CASH-USD,DEPOSIT,,,,5000,Uninvested cash,CASH,Funding account`}</pre>
        </div>

        <label className="modal-grid-full transaction-upload-picker">
          <span>CSV file</span>
          <input accept=".csv,text/csv" onChange={handleFileChange} type="file" />
          {fileName ? <small>{fileName}</small> : <small>Select a `.csv` file to validate and preview before import.</small>}
        </label>

        {parseResult?.errors?.length ? (
          <div className="transaction-upload-errors">
            {parseResult.errors.map((error) => <div key={error}>{error}</div>)}
          </div>
        ) : null}

        {submitError ? <div className="error">{submitError}</div> : null}

        {parseResult?.stats ? (
          <>
            <div className="transaction-upload-summary">
              <div>
                <span>Rows</span>
                <strong>{parseResult.stats.totalRows}</strong>
              </div>
              <div>
                <span>Ready</span>
                <strong>{parseResult.stats.validRows}</strong>
              </div>
              <div>
                <span>New positions</span>
                <strong>{parseResult.stats.positionsToCreate}</strong>
              </div>
            </div>

            {parseResult.positionsToCreate.length ? (
              <div className="transaction-upload-create-list">
                <strong>Positions to create</strong>
                <div className="transaction-upload-chip-row">
                  {parseResult.positionsToCreate.map((position) => (
                    <span className="transaction-upload-chip" key={position.ticker}>
                      {position.ticker} · {position.type}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="transaction-upload-preview">
              {parseResult.previewRows.map((row) => (
                <article className={`transaction-upload-preview-row${row.hasErrors ? " has-errors" : ""}`} key={row.id}>
                  <div className="transaction-upload-preview-head">
                    <strong>{row.ticker}</strong>
                    <span>{row.type}</span>
                  </div>
                  <div className="transaction-upload-preview-body">
                    <span>{row.date}</span>
                    <span>{formatPreviewValue(row)}</span>
                    <span>{row.action === "create-position" ? `Create ${row.positionType}` : "Use existing position"}</span>
                  </div>
                  {row.rowErrors.length ? (
                    <div className="transaction-upload-row-errors">
                      {row.rowErrors.map((error) => <small key={`${row.id}:${error}`}>{error}</small>)}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : null}

        <div className="modal-actions">
          <button className="modal-close" onClick={onClose} type="button">Cancel</button>
          <button className="primary" disabled={!parseResult?.stats?.validRows || Boolean(parseResult?.errors?.length) || submitting} type="submit">
            {submitting ? "Importing..." : `Import ${parseResult?.stats?.validRows || 0} transactions`}
          </button>
        </div>
      </form>
    </ModalSheet>
  );
}
