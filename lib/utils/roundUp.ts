import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { Transaction } from "../store";

export interface RoundUpResult {
  total: number;
  transactionCount: number;
}

/**
 * Calculates hypothetical round-up savings.
 * For each expense, calculates (Math.ceil(amount) - amount).
 *
 * This shows users how much they could save by enabling round-ups
 * on their transactions (simulated, not actually moving money).
 *
 * @example
 * A $4.30 coffee would round up to $5.00, contributing $0.70 to savings.
 */
export function calculateRoundUpSavings(
  transactions: Transaction[],
  month: Date = new Date(),
): RoundUpResult {
  const interval = {
    start: startOfMonth(month),
    end: endOfMonth(month),
  };

  let total = 0;
  let count = 0;

  transactions.forEach((txn) => {
    // Only count expenses (negative amounts)
    if (txn.amount >= 0) return;

    const txnDate = new Date(txn.date);
    if (!isWithinInterval(txnDate, interval)) return;

    const absAmount = Math.abs(txn.amount);
    const roundUp = Math.ceil(absAmount) - absAmount;

    // Only count if there's actually something to round up
    if (roundUp > 0) {
      total += roundUp;
      count++;
    }
  });

  return {
    total: Math.round(total * 100) / 100, // Avoid floating point errors
    transactionCount: count,
  };
}
