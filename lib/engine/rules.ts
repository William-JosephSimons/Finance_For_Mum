import type { Transaction, Rule } from "../store";

/**
 * Applies rules to categorize transactions.
 * Rules are matched by substring (case-insensitive).
 * More specific (longer) keywords take precedence.
 *
 * @example
 * Rule: { keyword: "WOOLWORTHS", category: "Groceries" }
 * Transaction: "WOOLWORTHS 1234 SYDNEY" => Categorized as "Groceries"
 */
export function applyRules(
  transactions: Transaction[],
  rules: Rule[],
): Transaction[] {
  if (!rules.length) return transactions;

  // Sort rules by keyword length (longest first = most specific)
  const sortedRules = [...rules].sort(
    (a, b) => b.keyword.length - a.keyword.length,
  );

  return transactions.map((txn) => {
    // Only categorize if currently Uncategorized
    if (txn.category !== "Uncategorized") return txn;

    const upperDesc = txn.description.toUpperCase();
    const match = sortedRules.find((r) =>
      upperDesc.includes(r.keyword.toUpperCase()),
    );

    return match ? { ...txn, category: match.category } : txn;
  });
}

/**
 * Creates a rule from a transaction.
 * Extracts the "cleanest" keyword from the description.
 *
 * This attempts to:
 * 1. Remove dates (DD/MM patterns)
 * 2. Remove amounts ($XX.XX patterns)
 * 3. Remove reference numbers (REF: XXX patterns)
 * 4. Take the first 2-3 meaningful words
 */
export function suggestKeyword(description: string): string {
  // Remove common noise and store-specific suffixes (branch locations, terminal IDs)
  let clean = description
    .toUpperCase()
    .replace(/\d{2}\/\d{2}/g, "") // Dates
    .replace(/\$[\d,.]+/g, "") // Amounts
    .replace(/REF:\s*\S+/gi, "") // References
    .replace(/\bVISA\b/gi, "") // Card types
    .replace(/\bEFTPOS\b/gi, "")
    .replace(/\bDEBIT\b/gi, "")
    .replace(/\bCREDIT\b/gi, "")
    .replace(/\bPURCHASE\b/gi, "")
    .replace(/\bPTY\b/gi, "")
    .replace(/\bLTD\b/gi, "")
    .replace(/\d{4,}/g, "") // Long numbers (card numbers, refs)
    // Remove common Australian city/suburb noise at the end of descriptions
    .replace(
      /\b(SYDNEY|MELBOURNE|BRISBANE|PERTH|ADELAIDE|CANBERRA|HOBART|DARWIN|AUS|NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b.*$/i,
      "",
    )
    .replace(/[^\w\s]/g, " ") // Treat and, /, etc as word breaks
    .replace(/\s+/g, " ")
    .trim();

  // Split into words, filtering out short noise (keep 2-letter words for things like JB, HI, FI)
  const words = clean.split(" ").filter((w) => w.length >= 2);

  if (words.length === 0) return description.toUpperCase().slice(0, 15).trim();

  // UNIVERSAL RULE: If the first word is >= 4 chars, it's likely the primary merchant name.
  // This clusters "COLES 4577" -> "COLES" and "WOOLWORTHS PACIFIC" -> "WOOLWORTHS".
  // Short words like "THE", "OFF", "FOR" (<4) still allow for 2-word names like "THE BIG".
  if (words[0].length >= 4) return words[0];

  // Otherwise, take first 2 words
  return words.slice(0, 2).join(" ");
}

/**
 * Predefined categories for the app.
 * These provide a starting point for categorization.
 */
export const CATEGORIES = [
  "Groceries",
  "Dining Out",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Insurance",
  "Subscriptions",
  "Shopping",
  "Travel",
  "Personal Care",
  "Home",
  "Education",
  "Gifts",
  "Fees & Charges",
  "Income",
  "Transfer",
  "Uncategorized",
] as const;

export type Category = (typeof CATEGORIES)[number];
