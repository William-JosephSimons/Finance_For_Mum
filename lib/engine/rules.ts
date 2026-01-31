import type { Transaction, Rule } from "../store";

/**
 * Internal core matcher that avoids object spreading inside the hot loop.
 * Extracts values from rules to avoid object property access overhead.
 *
 * @param descriptionUpper The uppercase transaction description
 * @param ruleKeywords Array of uppercase rule keywords (must be pre-sorted by length desc)
 * @param ruleCategories Array of corresponding categories
 */
function findMatch(
  descriptionUpper: string,
  ruleKeywords: string[],
  ruleCategories: string[],
): string | null {
  for (let i = 0; i < ruleKeywords.length; i++) {
    if (descriptionUpper.includes(ruleKeywords[i])) {
      return ruleCategories[i];
    }
  }
  return null;
}

/**
 * Applies rules to categorize transactions.
 * Rules are matched by substring (case-insensitive).
 * More specific (longer) keywords take precedence.
 */
export function applyRules(
  transactions: Transaction[],
  rules: Rule[],
): Transaction[] {
  const numTxns = transactions.length;
  const numRules = rules.length;

  if (numTxns === 0) return transactions;
  if (numRules === 0) return transactions;

  // 1. Prepare Rules: Sort by keyword length (most specific first)
  // And extract into flat arrays for hot loop optimization
  const sortedRules = [...rules].sort(
    (a, b) => b.keyword.length - a.keyword.length,
  );

  const keywords = new Array(numRules);
  const categories = new Array(numRules);

  for (let i = 0; i < numRules; i++) {
    keywords[i] = sortedRules[i].keyword.toUpperCase();
    categories[i] = sortedRules[i].category;
  }

  // 2. Process Transactions
  const results = new Array(numTxns);
  let changed = false;

  for (let i = 0; i < numTxns; i++) {
    const txn = transactions[i];

    // Only categorize if currently Uncategorized
    if (txn.category !== "Uncategorized") {
      results[i] = txn;
      continue;
    }

    const descriptionUpper = txn.description.toUpperCase();
    const matchedCategory = findMatch(descriptionUpper, keywords, categories);

    if (matchedCategory) {
      results[i] = { ...txn, category: matchedCategory };
      changed = true;
    } else {
      results[i] = txn;
    }
  }

  return changed ? results : transactions;
}

/**
 * Creates a rule from a transaction.
 * Extracts the "cleanest" keyword from the description.
 */
export function suggestKeyword(description: string): string {
  let clean = description.toUpperCase();

  const transformations = [
    (s: string) => s.replace(/\d{2}\/\d{2}/g, ""), // Dates
    (s: string) => s.replace(/\$[\d,.]+/g, ""), // Amounts
    (s: string) => s.replace(/REF:\s*\S+/gi, ""), // References
    (s: string) => s.replace(/\b(VISA|EFTPOS|DEBIT|CREDIT|PURCHASE|PTY|LTD)\b/gi, ""), // Common noise
    (s: string) => s.replace(/\d{4,}/g, ""), // Long numbers
    // Remove common Australian city/suburb noise at the end of descriptions
    (s: string) =>
      s.replace(
        /\b(SYDNEY|MELBOURNE|BRISBANE|PERTH|ADELAIDE|CANBERRA|HOBART|DARWIN|AUS|NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b.*$/i,
        "",
      ),
    (s: string) => s.replace(/[^\w\s]/g, " "), // Treat and, /, etc as word breaks
    (s: string) => s.replace(/\s+/g, " "), // Normalize whitespace
  ];

  clean = transformations.reduce((acc, fn) => fn(acc), clean).trim();

  // Split into words, filtering out short noise (keep 2-letter words for things like JB, HI, FI)
  const words = clean.split(" ").filter((w) => w.length >= 2);

  if (words.length === 0) return description.toUpperCase().slice(0, 15).trim();

  // UNIVERSAL RULE: If the first word is >= 4 chars, it's likely the primary merchant name.
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
  "Merchant Card Fees & Surcharges",
  "Income",
  "Transfer",
  "Uncategorized",
] as const;

export type Category = (typeof CATEGORIES)[number];
