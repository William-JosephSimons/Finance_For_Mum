import { format } from "date-fns";

/**
 * Formats a number as Australian currency.
 * @example formatCurrency(1200.50) => "$1,200.50"
 */
export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  // Handle negative amounts
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Formats a date as DD/MM/YYYY (Australian standard).
 * @example formatDate("2024-01-15") => "15/01/2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Formats a date as a relative string.
 * @example formatRelativeDate(new Date()) => "Today"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}
