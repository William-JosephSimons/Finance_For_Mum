import { analyzeTransaction, analyzeBatch } from "../llm";
import { createTransaction } from "../../../__tests__/factories";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

// Mock the Cerebras SDK
const mockCreate = jest.fn();
jest.mock("@cerebras/cerebras_cloud_sdk", () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });
});

describe("LLM Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should successfully analyze a transaction", async () => {
    const txn = createTransaction({ id: "t1", description: "NETFLIX" });
    
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            results: [{
              id: "t1",
              category: "Subscriptions",
              cleanMerchantName: "Netflix",
              isSubscription: true,
              isRecurring: true,
              confidence: 0.95
            }]
          })
        }
      }]
    });

    const result = await analyzeTransaction(txn);
    expect(result.category).toBe("Subscriptions");
    expect(result.cleanMerchantName).toBe("Netflix");
    expect(result.isSubscription).toBe(true);
  });

  it("should handle malformed JSON from LLM", async () => {
    const txn = createTransaction({ id: "t1", description: "NETFLIX" });
    
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: "invalid json string"
        }
      }]
    });

    // It should retry 3 times then return fallback
    const resultPromise = analyzeTransaction(txn);
    
    // Fast-forward through retries
    for(let i=0; i<3; i++) {
        await jest.runAllTimersAsync();
    }

    const result = await resultPromise;
    expect(result.category).toBe("Uncategorized");
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toContain("Invalid JSON");
  });

  it("should handle rate limits with exponential backoff", async () => {
    const txn = createTransaction({ id: "t1", description: "NETFLIX" });
    
    // First call fails with 429
    mockCreate.mockRejectedValueOnce({ status: 429, message: "Rate limit exceeded" });
    
    // Second call succeeds
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            results: [{
              id: "t1",
              category: "Subscriptions",
              cleanMerchantName: "Netflix",
              isSubscription: true,
              isRecurring: true,
              confidence: 0.95
            }]
          })
        }
      }]
    });

    const resultPromise = analyzeTransaction(txn);
    
    // Wait for retry timer
    await jest.runAllTimersAsync();

    const result = await resultPromise;
    expect(result.category).toBe("Subscriptions");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("should handle empty response content", async () => {
    const txn = createTransaction({ id: "t1", description: "NETFLIX" });
    
    mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: ""
          }
        }]
    });

    const resultPromise = analyzeTransaction(txn);
    for(let i=0; i<3; i++) await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.category).toBe("Uncategorized");
    expect(result.reasoning).toContain("No content received");
  });

  it("should process batches in chunks with delays", async () => {
    const txns = [
        createTransaction({ id: "t1" }),
        createTransaction({ id: "t2" }),
        createTransaction({ id: "t3" })
    ];

    mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ results: [] })
          }
        }]
    });

    // Batch size 2, so 2 chunks
    const resultPromise = analyzeBatch(txns, 2);
    
    // Wait for first chunk
    await jest.advanceTimersByTimeAsync(0);
    // Wait for delay before second chunk
    await jest.advanceTimersByTimeAsync(2000);
    
    const results = await resultPromise;
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(results.size).toBe(3);
  });
});