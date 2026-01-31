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
 */
async function analyzeChunk(
  chunk: Transaction[],
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  const client = getClient();

  // 1. Construct Minimized Prompt
  const txnList = chunk
    .map(
      (t) =>
        `ID: ${t.id} | Desc: "${t.description}" | Amt: ${t.amount} | Date: ${t.date}`,
    )
    .join("\n");

  const prompt = `
You are a financial classifier. Analyze the following list of transactions.

Categories: ${CATEGORIES.join(", ")}.

For EACH transaction, determine:
1. Category (from list above).
2. Clean Merchant Name (e.g., "Woolworths 2234" -> "Woolworths").
3. Is it a recurring Subscription? (Netflix, Spotify, etc.)
4. Is it a recurring Bill? (Rent, Utilities, etc.)

Return a JSON object with a SINGLE key "results" containing an array of objects.
EACH object must have: "id", "category", "cleanMerchantName", "isSubscription", "isRecurring", "confidence".

Transactions:
${txnList}
`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b", // Updated to a more standard model name if gpt-oss-120b was a placeholder
        response_format: { type: "json_object" },
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
 * Groups transactions into large chunks to save tokens and reduce requests.
 */
export async function analyzeBatch(
  transactions: Transaction[],
  batchSize: number = 20, // Default to 20 for Bulk Processing
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();
  let completed = 0;

  // STRICT RATE LIMIT: 30 RPM.
  // We send 1 request per 'batchSize' (20) transactions.
  // 1 request every 2 seconds = 30 requests/min.
  // Since we process 20 txns per request, this is VERY safe.
  const DELAY_PER_CHUNK_MS = 2000;

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
