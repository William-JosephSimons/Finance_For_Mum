import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { Transaction } from "../store";
import { CATEGORIES, Category } from "./rules";

const API_KEY =
  process.env.CEREBRAS_API_KEY ||
  process.env.EXPO_PUBLIC_CEREBRAS_API_KEY ||
  "csk-x3ct4w5nve9vhkvce44cwc6vhewer8ekm8e432n9f5y8ptkr";

let clientInstance: Cerebras | null = null;

function getClient() {
  if (!clientInstance) {
    clientInstance = new Cerebras({
      apiKey: API_KEY,
    });
  }
  return clientInstance;
}

export interface AnalysisResult {
  category: Category;
  cleanMerchantName: string;
  isSubscription: boolean;
  isRecurring: boolean;
  confidence: number;
  reasoning: string;
}

/**
 * Analyzes a chunk of transactions in a single LLM request.
 * Optimized for speed and token efficiency.
 */
async function analyzeChunk(
  chunk: Transaction[],
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  const client = getClient();

  // 1. Construct Minimized Prompt (Token-Efficient)
  const txnList = chunk
    .map((t) => `${t.id}|${t.description}|${t.amount}|${t.date}`)
    .join("\n");

  const prompt = `Categorize: ${CATEGORIES.join(",")}.
JSON:{"results":[{"id","category","cleanMerchantName","isSubscription":bool,"isRecurring":bool,"confidence":0-1}]}.
Data:
${txnList}`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b",
        response_format: { type: "json_object" },
        temperature: 0, // Higher predictability for performance
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No content received");

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse LLM response as JSON:", content);
        throw new Error("Invalid JSON response from LLM");
      }

      const items = parsed.results || [];

      // Map back to results
      items.forEach((item: any) => {
        if (!item.id) return;

        let category: Category = "Uncategorized";
        if (CATEGORIES.includes(item.category)) {
          category = item.category as Category;
        }

        results.set(item.id, {
          category,
          cleanMerchantName: item.cleanMerchantName || "Unknown",
          isSubscription: !!item.isSubscription,
          isRecurring: !!item.isRecurring,
          confidence: item.confidence || 0,
          reasoning: "Bulk Analysis",
        });
      });

      // Fill in missing ones (if LLM skipped any)
      chunk.forEach((t) => {
        if (!results.has(t.id)) {
          results.set(t.id, {
            category: "Uncategorized",
            cleanMerchantName: t.description,
            isSubscription: false,
            isRecurring: false,
            confidence: 0,
            reasoning: "Skipped by LLM",
          });
        }
      });

      return results;
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("rate limit");
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        const waitTime = Math.pow(2, attempt) * 2000;
        console.warn(`Bulk Chunk 429. Retrying in ${waitTime}ms... (Attempt ${attempt})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`Bulk Chunk Failed (Attempt ${attempt + 1}):`, error);
      if (attempt === maxRetries - 1) {
        // Final fallback for this chunk
        chunk.forEach((t) => {
          if (!results.has(t.id)) {
            results.set(t.id, {
              category: "Uncategorized",
              cleanMerchantName: t.description,
              isSubscription: false,
              isRecurring: false,
              confidence: 0,
              reasoning: `Error: ${error?.message || "Unknown"}`,
            });
          }
        });
        return results;
      }
      attempt++;
    }
  }

  return results;
}

/**
 * Analyzes a single transaction.
 * Wraps the bulk function for compatibility.
 */
export async function analyzeTransaction(
  txn: Transaction,
): Promise<AnalysisResult> {
  const map = await analyzeChunk([txn]);
  return (
    map.get(txn.id) || {
      category: "Uncategorized",
      cleanMerchantName: txn.description,
      isSubscription: false,
      isRecurring: false,
      confidence: 0,
      reasoning: "Error",
    }
  );
}

/**
 * Analyzes a batch of transactions using Bulk LLM Processing.
 * Groups transactions into larger chunks to save tokens and reduce requests.
 */
export async function analyzeBatch(
  transactions: Transaction[],
  batchSize: number = 50, // Increased from 20 to 50
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  let completed = 0;

  // Optimized delay: 1000ms (60 RPM) is safe for Cerebras and much faster.
  const DELAY_PER_CHUNK_MS = 1000;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const chunk = transactions.slice(i, i + batchSize);

    console.log(
      `Processing Chunk ${i / batchSize + 1}... (${chunk.length} txns)`,
    );

    // Process Chunk
    const chunkResults = await analyzeChunk(chunk);

    // Merge results
    chunkResults.forEach((val, key) => results.set(key, val));

    completed += chunk.length;
    onProgress?.(completed, transactions.length);

    // Rate Limit Wait
    if (i + batchSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_PER_CHUNK_MS));
    }
  }

  return results;
}
