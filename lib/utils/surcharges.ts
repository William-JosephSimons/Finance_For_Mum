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
  const interval = {
    start: startOfMonth(month),
    end: endOfMonth(month),
  };

  const surcharges = transactions.filter((txn) => {
    const txnDate = new Date(txn.date);
    if (!isWithinInterval(txnDate, interval)) return false;

    // Only expenses
    if (txn.amount >= 0) return false;

    const upperDesc = txn.description.toUpperCase();
    return (
      SURCHARGE_KEYWORDS.some((kw) =>
        txn.description.toUpperCase().includes(kw),
      ) || txn.category === "Merchant Card Fees & Surcharges"
    );
  });

  const total = surcharges.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    total: Math.round(total * 100) / 100,
    transactions: surcharges,
  };
}
