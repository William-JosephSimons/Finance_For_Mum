import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { Transaction } from "../store";

export interface RoundUpResult {
  total: number;
  transactionCount: number;
}

/**
 * Calculates hypothetical round-up savings.
 * For each expense, calculates (Math.ceil(amount) - amount).
 */
export function calculateRoundUpSavings(
  transactions: Transaction[],
  month: Date = new Date(),
): RoundUpResult {
  const monthStr = month.toISOString().substring(0, 7); // "YYYY-MM"
  
  let total = 0;
  let count = 0;

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    
    // Only count expenses (negative amounts)
    if (txn.amount >= 0) continue;

    // String-based date comparison is much faster than date-fns
    if (txn.date.substring(0, 7) !== monthStr) continue;

    const absAmount = txn.amount < 0 ? -txn.amount : txn.amount;
    const roundUp = Math.ceil(absAmount) - absAmount;

    // Only count if there's actually something to round up
    if (roundUp > 0.001) { // Floating point safety
      total += roundUp;
      count++;
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    transactionCount: count,
  };
}
