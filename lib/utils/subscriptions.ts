import type { Transaction } from "../store";

/**
 * Known subscription vendors to detect.
 * These are common streaming, music, and software services.
 */
/**
 * Detects recurring subscription payments and identifies price increases.
 * Groups by merchantName (LLM-cleaned) or falls back to description.
 */
export function detectSubscriptions(
  transactions: Transaction[],
): Subscription[] {
  const subGroups = new Map<string, Transaction[]>();

  transactions.forEach((txn) => {
    // Only expenses
    if (txn.amount >= 0) return;

    // Filter: Must be marked as recurring (by LLM) OR explicit "Subscriptions" category
    // This removes the need for a brittle "KNOWN_SUBSCRIPTIONS" list.
    const isSub = txn.isRecurring || txn.category === "Subscriptions";

    if (!isSub) return;

    // Use clean merchant name if available, otherwise fallback
    const key =
      (txn.merchantName ? txn.merchantName.toUpperCase() : null) ||
      txn.description.toUpperCase().slice(0, 15).trim();

    const existing = subGroups.get(key) || [];
    existing.push(txn);
    subGroups.set(key, existing);
  });

  const subscriptions: Subscription[] = [];

  subGroups.forEach((txns, name) => {
    // Need at least 1 transaction
    if (txns.length === 0) return;

    // Sort by date descending (most recent first)
    txns.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const current = Math.abs(txns[0].amount);
    const previous = txns.length > 1 ? Math.abs(txns[1].amount) : null;

    // Determine if price increased (with a small tolerance for rounding)
    const increased =
      previous !== null && current > previous && current - previous > 0.01;

    subscriptions.push({
      name: name, // Already clean if from LLM
      currentAmount: current,
      previousAmount: previous,
      priceIncreased: increased,
      history: txns.map((t) => ({
        date: t.date,
        amount: Math.abs(t.amount),
      })),
    });
  });

  // Sort by name for consistent display
  subscriptions.sort((a, b) => a.name.localeCompare(b.name));

  return subscriptions;
}
