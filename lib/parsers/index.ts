import Papa from "papaparse";
import { parse, isValid } from "date-fns";
import type { Transaction } from "../store";

// ============================================================================
// Types
// ============================================================================

type RawRow = Record<string, string>;

type BankType = "commbank" | "nab" | "westpac" | "anz" | "suncorp" | "unknown";

interface ParseResult {
  transactions: Transaction[];
  bank: BankType;
  balance?: number;
  errors: string[];
}

// ============================================================================
// Bank Detection
// ============================================================================

/**
 * Detects which Australian bank exported the CSV based on headers.
 */
export function detectBank(headers: string[]): BankType {
  const headerStr = headers.join(",").toLowerCase();

  // Westpac: Bank Account, Date, Narrative, Debit Amount, Credit Amount
  if (headerStr.includes("bank account") || headerStr.includes("narrative")) {
    return "westpac";
  }

  // NAB: Date, Transaction Type, Debit, Credit, Balance
  if (headerStr.includes("debit") && headerStr.includes("credit")) {
    return "nab";
  }

  // ANZ: Date, Transaction Details, Debit, Credit, Balance
  if (
    headerStr.includes("particulars") ||
    headerStr.includes("transaction details")
  ) {
    return "anz";
  }

  // Suncorp: Metadata on first two lines
  // "Account History for Account:","..."
  if (headerStr.includes("account history for account")) {
    return "suncorp";
  }

  // CommBank: Date, Amount, Description, Balance
  if (
    headerStr.includes("date") &&
    headerStr.includes("amount") &&
    headerStr.includes("description")
  ) {
    return "commbank";
  }

  // Generic fallback - look for common columns
  if (
    headerStr.includes("date") &&
    (headerStr.includes("amount") || headerStr.includes("debit"))
  ) {
    return "commbank"; // Default to CommBank format
  }

  return "unknown";
}

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Parses Australian date formats to ISO string.
 * Handles: DD/MM/YYYY, DD-MM-YYYY, DD MMM YY, DD MMM YYYY
 */
function parseAusDate(dateStr: string): string {
  const formats = [
    "dd/MM/yyyy",
    "d/MM/yyyy",
    "dd/M/yyyy",
    "d/M/yyyy",
    "dd-MM-yyyy",
    "d-MM-yyyy",
    "dd MMM yy",
    "dd MMM yyyy",
    "d MMM yy",
    "d MMM yyyy",
  ];

  const cleaned = dateStr.trim();

  for (const fmt of formats) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) {
        return parsed.toISOString();
      }
    } catch {
      // Try next format
    }
  }

  // Last resort: try native Date parsing
  const nativeDate = new Date(cleaned);
  if (isValid(nativeDate)) {
    return nativeDate.toISOString();
  }

  // Fallback to today (shouldn't happen with valid CSVs)
  console.warn(`Could not parse date: ${dateStr}`);
  return new Date().toISOString();
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates a unique ID for a transaction.
 * Uses a simple hash of date + amount + description + balance (if available).
 */
function generateId(
  date: string,
  amount: number,
  description: string,
  balance?: number,
): string {
  const input = `${date}|${amount.toFixed(2)}|${description}${balance !== undefined ? `|${balance.toFixed(2)}` : ""}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Bank-Specific Parsers
// ============================================================================

/**
 * CommBank CSV Parser
 * Format: Date, Amount, Description, Balance
 * Amount is signed (negative = debit)
 */
function parseCommBank(rows: RawRow[]): {
  transactions: Transaction[];
  balance?: number;
} {
  const transactions = rows
    .map((row) => {
      const dateCol = row["Date"] || row["date"] || "";
      const amountCol = row["Amount"] || row["amount"] || "";
      const descCol =
        row["Description"] || row["description"] || row["Narrative"] || "";

      if (!dateCol || !amountCol) return null;

      const date = parseAusDate(dateCol);
      const amount = parseFloat(amountCol.replace(/[,$]/g, ""));
      const balanceStr = row["Balance"] || row["balance"] || "";
      const balance =
        balanceStr ? parseFloat(balanceStr.replace(/[,$]/g, "")) : undefined;

      if (isNaN(amount)) return null;

      return {
        id: generateId(date, amount, descCol, balance),
        date,
        amount,
        description: descCol.trim(),
        category: "Uncategorized",
        isRecurring: false,
      };
    })
    .filter((t): t is Transaction => t !== null);

  // Balance logic: Find the row with the LATEST date that has a balance
  // CSVs are usually sorted. We check first and last.
  // Balance logic: Find the row with the LATEST date that has a balance
  let balance: number | undefined;
  let maxDate = 0;

  rows.forEach((row) => {
    const s = row["Balance"] || row["balance"];
    if (!s) return;
    const dStr = row["Date"] || row["date"];
    if (!dStr) return;

    // Parse date to timestamp
    const dateVal = parseAusDate(dStr);
    const time = new Date(dateVal).getTime();

    if (time > maxDate) {
      maxDate = time;
      balance = parseFloat(s.replace(/[,$]/g, ""));
    }
  });

  return { transactions, balance };
}

/**
 * NAB CSV Parser
 * Format: Date, Transaction Type, Debit, Credit, Balance
 * Separate Debit and Credit columns
 */
function parseNAB(rows: RawRow[]): {
  transactions: Transaction[];
  balance?: number;
} {
  const transactions = rows
    .map((row) => {
      const dateCol = row["Date"] || row["date"] || "";
      const debitCol = row["Debit"] || row["debit"] || "";
      const creditCol = row["Credit"] || row["credit"] || "";
      const descCol =
        row["Transaction Type"] || row["Description"] || row["Narrative"] || "";

      if (!dateCol) return null;

      const date = parseAusDate(dateCol);

      // NAB uses separate columns for debit and credit
      let amount = 0;
      if (debitCol && debitCol.trim()) {
        amount = -Math.abs(parseFloat(debitCol.replace(/[,$]/g, "")));
      } else if (creditCol && creditCol.trim()) {
        amount = Math.abs(parseFloat(creditCol.replace(/[,$]/g, "")));
      }

      if (isNaN(amount) || amount === 0) return null;

      const balanceStr = row["Balance"] || row["balance"] || "";
      const balance =
        balanceStr ? parseFloat(balanceStr.replace(/[,$]/g, "")) : undefined;

      return {
        id: generateId(date, amount, descCol, balance),
        date,
        amount,
        description: descCol.trim(),
        category: "Uncategorized",
        isRecurring: false,
      };
    })
    .filter((t): t is Transaction => t !== null);

  let balance: number | undefined;
  let maxDate = 0;

  rows.forEach((row) => {
    const s = row["Balance"] || row["balance"];
    if (!s) return;
    const dStr = row["Date"] || row["date"];
    if (!dStr) return;
    const time = new Date(parseAusDate(dStr)).getTime();

    if (time > maxDate) {
      maxDate = time;
      balance = parseFloat(s.replace(/[,$]/g, ""));
    }
  });

  return { transactions, balance };
}

/**
 * Westpac CSV Parser
 * Format: Bank Account, Date, Narrative, Debit Amount, Credit Amount, Balance
 */
function parseWestpac(rows: RawRow[]): {
  transactions: Transaction[];
  balance?: number;
} {
  const transactions = rows
    .map((row) => {
      const dateCol = row["Date"] || row["date"] || "";
      const debitCol =
        row["Debit Amount"] || row["Debit"] || row["debit"] || "";
      const creditCol =
        row["Credit Amount"] || row["Credit"] || row["credit"] || "";
      const descCol = row["Narrative"] || row["Description"] || "";

      if (!dateCol) return null;

      const date = parseAusDate(dateCol);

      let amount = 0;
      if (debitCol && debitCol.trim()) {
        amount = -Math.abs(parseFloat(debitCol.replace(/[,$]/g, "")));
      } else if (creditCol && creditCol.trim()) {
        amount = Math.abs(parseFloat(creditCol.replace(/[,$]/g, "")));
      }

      if (isNaN(amount) || amount === 0) return null;

      const balanceStr = row["Balance"] || row["balance"] || "";
      const balance =
        balanceStr ? parseFloat(balanceStr.replace(/[,$]/g, "")) : undefined;

      return {
        id: generateId(date, amount, descCol, balance),
        date,
        amount,
        description: descCol.trim(),
        category: "Uncategorized",
        isRecurring: false,
      };
    })
    .filter((t): t is Transaction => t !== null);

  let balance: number | undefined;
  let maxDate = 0;

  rows.forEach((row) => {
    const s = row["Balance"] || row["balance"];
    if (!s) return;
    const dStr = row["Date"] || row["date"];
    if (!dStr) return;
    const time = new Date(parseAusDate(dStr)).getTime();

    if (time > maxDate) {
      maxDate = time;
      balance = parseFloat(s.replace(/[,$]/g, ""));
    }
  });

  return { transactions, balance };
}

/**
 * ANZ CSV Parser
 * Format: Date, Transaction Details, Debit, Credit, Balance
 */
function parseANZ(rows: RawRow[]): {
  transactions: Transaction[];
  balance?: number;
} {
  const transactions = rows
    .map((row) => {
      const dateCol = row["Date"] || row["date"] || "";
      const debitCol = row["Debit"] || row["debit"] || "";
      const creditCol = row["Credit"] || row["credit"] || "";
      const descCol =
        row["Transaction Details"] ||
        row["Particulars"] ||
        row["Description"] ||
        "";

      if (!dateCol) return null;

      const date = parseAusDate(dateCol);

      let amount = 0;
      if (debitCol && debitCol.trim()) {
        amount = -Math.abs(parseFloat(debitCol.replace(/[,$]/g, "")));
      } else if (creditCol && creditCol.trim()) {
        amount = Math.abs(parseFloat(creditCol.replace(/[,$]/g, "")));
      }

      if (isNaN(amount) || amount === 0) return null;

      const balanceStr = row["Balance"] || row["balance"] || "";
      const balance =
        balanceStr ? parseFloat(balanceStr.replace(/[,$]/g, "")) : undefined;

      return {
        id: generateId(date, amount, descCol, balance),
        date,
        amount,
        description: descCol.trim(),
        category: "Uncategorized",
        isRecurring: false,
      };
    })
    .filter((t): t is Transaction => t !== null);

  const firstRow = rows[0];
  const balanceCol = firstRow ? firstRow["Balance"] || firstRow["balance"] : "";
  const balance =
    balanceCol ? parseFloat(balanceCol.replace(/[,$]/g, "")) : undefined;

  return { transactions, balance };
}

/**
 * Suncorp CSV Parser
 * Format: "Date","Description","Amount","Balance"
 * Note: Suncorp CSVs have metadata on the first 2 lines.
 */
function parseSuncorp(csvContent: string): {
  transactions: Transaction[];
  balance?: number;
} {
  const result = Papa.parse<string[]>(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  // Expected format after skipping 2 meta lines:
  // [0]: Date, [1]: Description, [2]: Amount, [3]: Balance
  const transactions = result.data
    .slice(2) // Skip "Account History..." and "28 items"
    .map((row) => {
      const dateCol = row[0];
      const descCol = row[1];
      const amountCol = row[2];

      if (!dateCol || !amountCol) return null;

      const date = parseAusDate(dateCol);
      const amount = parseFloat(amountCol.replace(/[,$]/g, ""));
      const balanceStr = row[3]; // Balance is index 3
      const balance =
        balanceStr ? parseFloat(balanceStr.replace(/[,$]/g, "")) : undefined;

      if (isNaN(amount)) return null;

      return {
        id: generateId(date, amount, descCol || "", balance),
        date,
        amount,
        description: (descCol || "").trim(),
        category: "Uncategorized",
        isRecurring: false,
      };
    })
    .filter((t): t is Transaction => t !== null);

  const firstDataRow = result.data[2];
  const balanceCol = firstDataRow ? firstDataRow[3] : "";
  const balance =
    balanceCol ? parseFloat(balanceCol.replace(/[,$]/g, "")) : undefined;

  return { transactions, balance };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parses a CSV string from any supported Australian bank.
 * Auto-detects the bank format and applies the appropriate parser.
 */
export function parseCSV(csvContent: string): ParseResult {
  const papaErrors: string[] = [];

  // Parse CSV
  const result = Papa.parse<RawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    papaErrors.push(...result.errors.map((e) => e.message));
  }

  if (result.data.length === 0) {
    return {
      transactions: [],
      bank: "unknown",
      errors: ["No data found in CSV"],
    };
  }

  // Detect bank from headers
  const headers = Object.keys(result.data[0] || {});
  const bank = detectBank(headers);

  if (bank === "unknown") {
    return {
      transactions: [],
      bank,
      errors:
        papaErrors.length > 0 ?
          papaErrors
        : [
            "Could not detect bank format. Please use a CSV from CommBank, NAB, Westpac, Suncorp or ANZ.",
          ],
    };
  }

  // Parse based on bank type
  let transactions: Transaction[] = [];
  let balance: number | undefined;

  switch (bank) {
    case "commbank": {
      const res = parseCommBank(result.data);
      transactions = res.transactions;
      balance = res.balance;
      break;
    }
    case "nab": {
      const res = parseNAB(result.data);
      transactions = res.transactions;
      balance = res.balance;
      break;
    }
    case "westpac": {
      const res = parseWestpac(result.data);
      transactions = res.transactions;
      balance = res.balance;
      break;
    }
    case "anz": {
      const res = parseANZ(result.data);
      transactions = res.transactions;
      balance = res.balance;
      break;
    }
    case "suncorp": {
      const res = parseSuncorp(csvContent);
      transactions = res.transactions;
      balance = res.balance;
      break;
    }
  }

  if (transactions.length === 0) {
    return {
      transactions,
      bank,
      balance,
      errors:
        papaErrors.length > 0 ?
          papaErrors
        : ["No valid transactions found in CSV"],
    };
  }

  return { transactions, bank, balance, errors: [] };
}

/**
 * Bank display names for UI.
 */
export const BANK_NAMES: Record<BankType, string> = {
  commbank: "Commonwealth Bank",
  nab: "NAB",
  westpac: "Westpac",
  anz: "ANZ",
  suncorp: "Suncorp",
  unknown: "Unknown",
};
