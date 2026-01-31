import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { Transaction } from "../store";

/**
 * Keywords that identify surcharges and card fees.
 * These are common terms used by Australian merchants and banks.
 */
const SURCHARGE_KEYWORDS = [
  "SURCHARGE",
  "CARD FEE",
  "INTL TRANS FEE",
  "INTERNATIONAL TRANSACTION",
  "FOREIGN CURRENCY",
  "ATM FEE",
  "CASH ADVANCE FEE",
  "OVERSEAS FEE",
  "FOREIGN TRANSACTION",
  "CURRENCY CONVERSION",
  "PAYMENT PROCESSING FEE",
  "EFTPOS SURCHARGE",
] as const;

export interface SurchargeResult {
  total: number;
  transactions: Transaction[];
}

/**
 * Detects surcharges and card fees from transactions.
 * This is the "Aussie Tax" detector - showing how much users lose to fees.
 *
 * @param transactions All transactions
 * @param month The month to analyze (defaults to current month)
 */
export function detectSurcharges(
  transactions: Transaction[],
  month: Date = new Date(),
): SurchargeResult {
  const monthStr = month.toISOString().substring(0, 7); // "YYYY-MM"
  const surcharges: Transaction[] = [];
  let total = 0;

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];

    // Only expenses
    if (txn.amount >= 0) continue;

    // Date check
    if (txn.date.substring(0, 7) !== monthStr) continue;

    const upperDesc = txn.description.toUpperCase();
    let isSurcharge = txn.category === "Merchant Card Fees & Surcharges";
    
    if (!isSurcharge) {
      for (let j = 0; j < SURCHARGE_KEYWORDS.length; j++) {
        if (upperDesc.includes(SURCHARGE_KEYWORDS[j])) {
          isSurcharge = true;
          break;
        }
      }
    }

    if (isSurcharge) {
      surcharges.push(txn);
      total += (txn.amount < 0 ? -txn.amount : txn.amount);
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    transactions: surcharges,
  };
}
