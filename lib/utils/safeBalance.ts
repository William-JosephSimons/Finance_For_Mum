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
  const todayMonth = today.getMonth();
  const todayFullYear = today.getFullYear();
  const monthStr = today.toISOString().substring(0, 7); // "YYYY-MM"

  const upcomingBills: UpcomingBill[] = [];

  // Optimization: Identify this month's expenses once using manual loop
  const thisMonthExpensesKeys = new Set<string>();
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.amount >= 0) continue;
    if (t.date.substring(0, 7) === monthStr) {
      const tKey = t.merchantName || t.description.slice(0, 15).toUpperCase().trim();
      thisMonthExpensesKeys.add(tKey);
    }
  }

  // Project each recurring pattern
  for (let i = 0; i < recurringPatterns.length; i++) {
    const pattern = recurringPatterns[i];
    
    // Calculate next occurrence
    let nextDue = new Date(todayFullYear, todayMonth, pattern.dayOfMonth);

    // Check if this month's bill was already paid
    if (thisMonthExpensesKeys.has(pattern.keyword)) {
      // Already paid this month, use next month
      nextDue = new Date(todayFullYear, todayMonth + 1, pattern.dayOfMonth);
    }

    // Check if it's within our 30-day horizon
    if (isBefore(nextDue, horizon)) {
      upcomingBills.push({
        description: pattern.keyword,
        amount: pattern.averageAmount,
        dueDate: nextDue,
      });
    }
  }

  // Sort by date
  upcomingBills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  let totalUpcomingBills = 0;
  for (let i = 0; i < upcomingBills.length; i++) {
    totalUpcomingBills += upcomingBills[i].amount;
  }
  
  const safeBalance = currentBalance - totalUpcomingBills - savingsBuckets;

  return {
    safeBalance,
    upcomingBills,
    reservedForSavings: savingsBuckets,
    totalUpcomingBills,
  };
}
