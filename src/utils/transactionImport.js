const REQUIRED_HEADERS = ["date", "ticker", "type"];
const OPTIONAL_HEADERS = ["shares", "price", "fees", "amount", "company", "positionType", "note"];
const SUPPORTED_HEADERS = new Set([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);
const SUPPORTED_TYPES = new Set(["BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT", "WITHDRAWAL"]);
const SUPPORTED_POSITION_TYPES = new Set(["STOCK", "CRYPTO", "CASH", "CASH_ETF"]);

export const TRANSACTION_IMPORT_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows
    .map((line) => line.map((value) => String(value || "").trim()))
    .filter((line) => line.some((value) => value !== ""));
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function normalizeHeader(value) {
  return String(value || "").trim();
}

function inferPositionType(row) {
  const explicit = String(row.positionType || "").trim().toUpperCase();
  if (SUPPORTED_POSITION_TYPES.has(explicit)) return explicit;
  const ticker = String(row.ticker || "").trim().toUpperCase();
  if (ticker === "CASH" || ticker.startsWith("CASH-")) return "CASH";
  return "STOCK";
}

function defaultCompanyForPositionType(positionType, company) {
  const normalizedCompany = String(company || "").trim();
  if (normalizedCompany) return normalizedCompany;
  if (positionType === "CASH") return "Uninvested cash";
  if (positionType === "CASH_ETF") return "Cash / Treasury ETF";
  return "";
}

function buildTransactionPayload(row) {
  const type = String(row.type || "").trim().toUpperCase();
  const ticker = String(row.ticker || "").trim().toUpperCase();
  const sharesValue = parseNumber(row.shares);
  const priceValue = parseNumber(row.price);
  const feesValue = parseNumber(row.fees);
  const amountValue = parseNumber(row.amount);

  if (type === "BUY" || type === "SELL") {
    return {
      ticker,
      type,
      date: row.date,
      shares: Number(sharesValue || 0),
      price: Number(priceValue || 0),
      fees: Number(feesValue || 0),
      currency: "USD",
      note: String(row.note || "").trim(),
    };
  }

  return {
    ticker,
    type,
    date: row.date,
    shares: Number(amountValue || 0),
    price: 0,
    fees: 0,
    currency: "USD",
    note: String(row.note || "").trim(),
  };
}

export function parseTransactionImportFile(text, existingPositions = []) {
  const csvRows = parseCsv(text);
  if (!csvRows.length) {
    return {errors: ["CSV file is empty."], previewRows: [], positionsToCreate: [], stats: null};
  }

  const [headerRow, ...dataRows] = csvRows;
  const headers = headerRow.map(normalizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  const unsupportedHeaders = headers.filter((header) => !SUPPORTED_HEADERS.has(header));
  if (missingHeaders.length || unsupportedHeaders.length) {
    const errors = [];
    if (missingHeaders.length) errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
    if (unsupportedHeaders.length) errors.push(`Unsupported columns: ${unsupportedHeaders.join(", ")}`);
    return {errors, previewRows: [], positionsToCreate: [], stats: null};
  }

  const existingByTicker = new Map(
    (existingPositions || []).map((position) => [String(position.ticker || "").trim().toUpperCase(), position])
  );
  const createdByTicker = new Map();
  const previewRows = [];
  const errors = [];

  dataRows.forEach((values, rowIndex) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const rowNumber = rowIndex + 2;
    const type = String(raw.type || "").trim().toUpperCase();
    const ticker = String(raw.ticker || "").trim().toUpperCase();
    const sharesValue = parseNumber(raw.shares);
    const priceValue = parseNumber(raw.price);
    const feesValue = parseNumber(raw.fees);
    const amountValue = parseNumber(raw.amount);
    const rowErrors = [];

    if (!isIsoDate(raw.date)) rowErrors.push("date must use YYYY-MM-DD");
    if (!ticker) rowErrors.push("ticker is required");
    if (!SUPPORTED_TYPES.has(type)) rowErrors.push(`type must be one of ${[...SUPPORTED_TYPES].join(", ")}`);
    if (raw.positionType && !SUPPORTED_POSITION_TYPES.has(String(raw.positionType).trim().toUpperCase())) {
      rowErrors.push(`positionType must be one of ${[...SUPPORTED_POSITION_TYPES].join(", ")}`);
    }
    if (sharesValue !== null && Number.isNaN(sharesValue)) rowErrors.push("shares must be numeric");
    if (priceValue !== null && Number.isNaN(priceValue)) rowErrors.push("price must be numeric");
    if (feesValue !== null && Number.isNaN(feesValue)) rowErrors.push("fees must be numeric");
    if (amountValue !== null && Number.isNaN(amountValue)) rowErrors.push("amount must be numeric");

    if (type === "BUY" || type === "SELL") {
      if (!(sharesValue > 0)) rowErrors.push("shares must be greater than 0 for BUY/SELL");
      if (!(priceValue > 0)) rowErrors.push("price must be greater than 0 for BUY/SELL");
      if (feesValue != null && feesValue < 0) rowErrors.push("fees cannot be negative");
    } else if (SUPPORTED_TYPES.has(type)) {
      if (!(amountValue > 0)) rowErrors.push("amount must be greater than 0 for DIVIDEND/FEE/DEPOSIT/WITHDRAWAL");
    }

    const positionType = inferPositionType(raw);
    const existingPosition = existingByTicker.get(ticker);
    let createdPosition = createdByTicker.get(ticker) || null;
    if (!existingPosition && !createdPosition && ticker) {
      createdPosition = {
        ticker,
        company: defaultCompanyForPositionType(positionType, raw.company),
        type: positionType,
        mode: "ACTIVE",
        targetAllocationPct: 0,
        includeInAllocation: false,
        correctionPct: -10,
        drawdownPlanPct: -20,
        peakLookbackMonths: 5,
        avgDrawdownPeriod: 36,
        avgDrawdownInterval: 4,
      };
      createdByTicker.set(ticker, createdPosition);
    }

    if (rowErrors.length) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}`);
    }

    previewRows.push({
      id: `${rowNumber}:${ticker}:${type}`,
      rowNumber,
      ticker,
      type,
      company: String(raw.company || "").trim(),
      date: raw.date,
      shares: sharesValue,
      price: priceValue,
      fees: feesValue,
      amount: amountValue,
      note: String(raw.note || "").trim(),
      positionType,
      hasErrors: rowErrors.length > 0,
      rowErrors,
      action: existingPosition ? "existing-position" : "create-position",
      transactionPayload: rowErrors.length ? null : buildTransactionPayload(raw),
    });
  });

  const positionsToCreate = [...createdByTicker.values()];
  const validRows = previewRows.filter((row) => !row.hasErrors && row.transactionPayload);

  return {
    errors,
    headers,
    previewRows,
    positionsToCreate,
    stats: {
      totalRows: previewRows.length,
      validRows: validRows.length,
      positionsToCreate: positionsToCreate.length,
    },
  };
}
