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
  // Optimized: Using a simple loop for categorization filtering
  const uncategorized: Transaction[] = [];
  for (let i = 0; i < currentTxns.length; i++) {
    if (currentTxns[i].category === "Uncategorized") {
      uncategorized.push(currentTxns[i]);
    }
  }

  if (uncategorized.length === 0) {
    return currentTxns;
  }

  // 3. Analyze with LLM
  const results = await analyzeBatch(
    uncategorized,
    50, // batch size
    options?.onProgress,
  );

  // 4. Merge results back
  // Optimized: Using a pre-allocated array and loop for merging
  const numTxns = currentTxns.length;
  const updatedTxns = new Array(numTxns);
  
  for (let i = 0; i < numTxns; i++) {
    const txn = currentTxns[i];
    const analysis = results.get(txn.id);
    if (analysis) {
      updatedTxns[i] = {
        ...txn,
        category: analysis.category,
        isRecurring: analysis.isSubscription || analysis.isRecurring || txn.isRecurring,
        merchantName: analysis.cleanMerchantName || txn.merchantName,
      };
    } else {
      updatedTxns[i] = txn;
    }
  }

  return updatedTxns;
}
