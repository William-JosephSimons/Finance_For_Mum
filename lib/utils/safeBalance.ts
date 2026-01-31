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
): SafeBalanceResult {
  const today = new Date();
  const horizon = addDays(today, 14);

  const upcomingBills: UpcomingBill[] = [];

  // Project each recurring pattern
  recurringPatterns.forEach((pattern) => {
    // Calculate next occurrence
    const thisMonthDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      pattern.dayOfMonth,
    );
    let nextDue = thisMonthDate;

    if (isBefore(thisMonthDate, today)) {
      // Already passed this month, use next month
      nextDue = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        pattern.dayOfMonth,
      );
    }

    if (isBefore(nextDue, horizon) && isAfter(nextDue, today)) {
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
