import { getDate } from "date-fns";
import type { Transaction } from "../store";

export interface RecurringPattern {
  keyword: string;
  averageAmount: number;
  dayOfMonth: number;
  occurrences: number;
}

/**
 * Detects recurring transactions by analyzing:
 * 1. Same/similar description (first 15 chars)
 * 2. Same/similar amount (±5%)
 * 3. Repeating on same day of month (±3 days)
 */
export function detectRecurring(
  transactions: Transaction[],
): RecurringPattern[] {
  const numTxns = transactions.length;
  if (numTxns === 0) return [];

  const groups = new Map<string, Transaction[]>();

  // 1. Group by normalized description
  for (let i = 0; i < numTxns; i++) {
    const txn = transactions[i];
    // Only expenses
    if (txn.amount >= 0) continue;

    const key =
      txn.merchantName || txn.description.slice(0, 15).toUpperCase().trim();
    
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(txn);
  }

  const patterns: RecurringPattern[] = [];

  // 2. Analyze groups
  for (const [keyword, txns] of groups.entries()) {
    const numInGroup = txns.length;
    
    let isExplicitlyRecurring = false;
    let totalAmount = 0;
    let totalDay = 0;

    // First pass: totals and explicit check
    for (let i = 0; i < numInGroup; i++) {
      const t = txns[i];
      if (t.isRecurring) isExplicitlyRecurring = true;
      const absAmount = t.amount < 0 ? -t.amount : t.amount;
      totalAmount += absAmount;
      
      // Extract day of month from ISO string "YYYY-MM-DD..."
      const day = parseInt(t.date.substring(8, 10), 10);
      totalDay += day;
    }

    // If not explicit, we need at least 2 occurrences
    if (!isExplicitlyRecurring && numInGroup < 2) continue;

    const avgAmount = totalAmount / numInGroup;
    const avgDay = Math.round(totalDay / numInGroup);

    // Amount variance check
    const amountTolerance = isExplicitlyRecurring ? 0.2 : 0.05;
    let withinAmountTolerance = true;
    
    if (!isExplicitlyRecurring) {
      for (let i = 0; i < numInGroup; i++) {
        const absAmount = txns[i].amount < 0 ? -txns[i].amount : txns[i].amount;
        if (Math.abs(absAmount - avgAmount) / avgAmount >= amountTolerance) {
          withinAmountTolerance = false;
          break;
        }
      }
      if (!withinAmountTolerance) continue;
    }

    // Day of month variance check
    if (!isExplicitlyRecurring) {
      let sameDayPattern = true;
      for (let i = 0; i < numInGroup; i++) {
        const day = parseInt(txns[i].date.substring(8, 10), 10);
        const diff = Math.abs(day - avgDay);
        if (diff > 3 && diff < 28) {
          sameDayPattern = false;
          break;
        }
      }
      if (!sameDayPattern) continue;
    }

    patterns.push({
      keyword,
      averageAmount: Math.round(txns[0].amount * -100) / 100, // Use latest occurrence amount
      dayOfMonth: avgDay,
      occurrences: numInGroup,
    });
  }

  // Sort by amount (highest first)
  patterns.sort((a, b) => b.averageAmount - a.averageAmount);

  return patterns;
}

/**
 * Maps patterns back to transactions to flag them as isRecurring.
 */
export function markRecurringTransactions(
  transactions: Transaction[],
  patterns: RecurringPattern[],
): Transaction[] {
  const numTxns = transactions.length;
  if (numTxns === 0) return transactions;
  if (patterns.length === 0) return transactions;

  const keywords = new Set<string>();
  for (let i = 0; i < patterns.length; i++) {
    keywords.add(patterns[i].keyword);
  }

  const results = new Array(numTxns);
  let changed = false;

  for (let i = 0; i < numTxns; i++) {
    const txn = transactions[i];
    if (txn.amount >= 0) {
      results[i] = txn;
      continue;
    }

    const key =
      txn.merchantName || txn.description.slice(0, 15).toUpperCase().trim();

    if (keywords.has(key)) {
      if (!txn.isRecurring) {
        results[i] = { ...txn, isRecurring: true };
        changed = true;
      } else {
        results[i] = txn;
      }
    } else {
      results[i] = txn;
    }
  }

  return changed ? results : transactions;
}
