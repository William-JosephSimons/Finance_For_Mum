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
 *
 * This helps identify bills and regular payments for the Safe Balance calculation.
 */
export function detectRecurring(
  transactions: Transaction[],
): RecurringPattern[] {
  const groups = new Map<string, Transaction[]>();

  // Group by normalized description (first 15 chars)
  transactions.forEach((txn) => {
    // Only expenses
    if (txn.amount >= 0) return;

    // Group by merchantName (if available from LLM) or fallback to normalized description
    // Group by merchantName (if available from LLM) or fallback to normalized description
    const key =
      (txn.merchantName ? txn.merchantName.toUpperCase() : null) ||
      txn.description.slice(0, 15).toUpperCase().trim();
    const existing = groups.get(key) || [];
    existing.push(txn);
    groups.set(key, existing);
  });

  const patterns: RecurringPattern[] = [];

  groups.forEach((txns, keyword) => {
    // Check if any transaction in this group was marked as recurring by LLM
    const isExplicitlyRecurring = txns.some((t) => t.isRecurring);

    // If not explicit, we need at least 2 occurrences to establish a pattern
    if (!isExplicitlyRecurring && txns.length < 2) return;

    const amounts = txns.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // If explicit, we are more lenient with amount variance (maybe price changed)
    // Actually, if it's explicitly marked as isRecurring (e.g. by LLM),
    // we want to catch it even if the amount changed significantly.
    const amountTolerance = isExplicitlyRecurring ? 0.4 : 0.05; // 40% vs 5% - increased for 16.99 -> 22.99 case

    const withinTolerance = amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < amountTolerance,
    );

    if (!withinTolerance && !isExplicitlyRecurring) return;

    // Check if same day of month (±3 days)
    const daysOfMonth = txns.map((t) => getDate(new Date(t.date)));
    const avgDay = Math.round(
      daysOfMonth.reduce((a, b) => a + b, 0) / daysOfMonth.length,
    );

    const sameDayPattern = daysOfMonth.every(
      (d) => Math.abs(d - avgDay) <= 3 || Math.abs(d - avgDay) >= 28, // Handle month boundaries
    );

    // If explicit (LLM detected Subscription/Bill), we accept even if pattern is weak (e.g. only 1 item)
    // or if the day of month varies (e.g. paid on Friday every 4 weeks)
    if (!sameDayPattern && !isExplicitlyRecurring) return;

    patterns.push({
      keyword,
      averageAmount: Math.round(txns[0].amount * -100) / 100, // Use latest occurrence amount (txns are sorted by date desc)
      dayOfMonth: avgDay,
      occurrences: txns.length,
    });
  });

  // Sort by amount (highest first) for priority display
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
  const keywords = new Set(patterns.map((p) => p.keyword));

  return transactions.map((txn) => {
    if (txn.amount >= 0) return txn;

    // Group by merchantName (if available from LLM) or fallback to normalized description
    const key =
      (txn.merchantName ? txn.merchantName.toUpperCase() : null) ||
      txn.description.slice(0, 15).toUpperCase().trim();

    if (keywords.has(key)) {
      return { ...txn, isRecurring: true };
    }

    return txn;
  });
}
