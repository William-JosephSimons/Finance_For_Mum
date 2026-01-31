import { addDays, isAfter, isBefore } from "date-fns";
import type { Transaction } from "../store";

export interface UpcomingBill {
  description: string;
  amount: number;
  dueDate: Date;
}

export interface SafeBalanceResult {
  safeBalance: number;
  upcomingBills: UpcomingBill[];
  reservedForSavings: number;
  totalUpcomingBills: number;
}

export interface RecurringPattern {
  keyword: string;
  averageAmount: number;
  dayOfMonth: number;
}

/**
 * Calculates the "Safe Balance":
 * CurrentBalance - Bills(14 days) - Savings
 *
 * This gives the user a realistic view of what they can actually spend
 * without endangering their bill payments or savings goals.
 */
export function calculateSafeBalance(
  currentBalance: number,
  savingsBuckets: number,
  transactions: Transaction[],
  recurringPatterns: RecurringPattern[],
  today = new Date(),
): SafeBalanceResult {
  const horizon = addDays(today, 30); // Extended to 30 days

  const upcomingBills: UpcomingBill[] = [];

  // Project each recurring pattern
  recurringPatterns.forEach((pattern) => {
    // Calculate next occurrence
    // Use setDate to safely handle month transitions
    let nextDue = new Date(today.getFullYear(), today.getMonth(), pattern.dayOfMonth);

    // If the date doesn't exist in this month (e.g., Feb 30),
    // JS Date will roll it over to next month. We might want to cap it.
    // But for most bills (28th, etc) it works fine.

    // Check if this month's bill was already paid
    // We look for transactions with same keyword/merchant in this month
    const wasPaidThisMonth = transactions.some((t) => {
      if (t.amount >= 0) return false;
      const tDate = new Date(t.date);
      const isSameMonth =
        tDate.getMonth() === today.getMonth() &&
        tDate.getFullYear() === today.getFullYear();

      if (!isSameMonth) return false;

      // Match by merchant name or keyword (first 15 chars)
      const tKey =
        t.merchantName || t.description.slice(0, 15).toUpperCase().trim();
      return tKey === pattern.keyword;
    });

    if (isBefore(nextDue, today) || wasPaidThisMonth) {
      // Already passed this month OR already paid, use next month
      nextDue = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        pattern.dayOfMonth,
      );
    }

    // Check if it's within our 30-day horizon
    if (isBefore(nextDue, horizon)) {
      upcomingBills.push({
        description: pattern.keyword,
        amount: pattern.averageAmount,
        dueDate: nextDue,
      });
    }
  });

  // Sort by date
  upcomingBills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const totalUpcomingBills = upcomingBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  const safeBalance = currentBalance - totalUpcomingBills - savingsBuckets;

  return {
    safeBalance,
    upcomingBills,
    reservedForSavings: savingsBuckets,
    totalUpcomingBills,
  };
}
