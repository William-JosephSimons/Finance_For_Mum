import { Transaction, Rule } from "../store";
import { applyRules } from "./rules";
import { analyzeBatch, AnalysisResult } from "./llm";

export interface CategorizationWorkflowOptions {
  onProgress?: (completed: number, total: number) => void;
  onUpdate?: (txns: Transaction[]) => void;
}

/**
 * Orchestrates the full categorization workflow:
 * 1. Apply explicit user-defined rules.
 * 2. Send remaining Uncategorized transactions to LLM for batch analysis.
 */
export async function runCategorizationWorkflow(
  transactions: Transaction[],
  rules: Rule[],
  options?: CategorizationWorkflowOptions,
): Promise<Transaction[]> {
  // 1. Apply explicit rules first (sync)
  let currentTxns = applyRules(transactions, rules);
  options?.onUpdate?.(currentTxns);

  // 2. Identify remaining Uncategorized for LLM
  const uncategorized = currentTxns.filter((t) => t.category === "Uncategorized");

  if (uncategorized.length === 0) {
    return currentTxns;
  }

  // 3. Analyze with LLM
  const results = await analyzeBatch(
    uncategorized,
    20, // batch size
    options?.onProgress,
  );

  // 4. Merge results back
  const updatedTxns = currentTxns.map((txn) => {
    const analysis = results.get(txn.id);
    if (analysis) {
      return {
        ...txn,
        category: analysis.category,
        isRecurring: analysis.isSubscription || txn.isRecurring,
        merchantName: analysis.cleanMerchantName || txn.merchantName,
      };
    }
    return txn;
  });

  return updatedTxns;
}
