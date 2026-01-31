import { analyzeTransaction } from "../lib/engine/llm";
import { Transaction } from "../lib/store";
import { createTransaction } from "./factories";

// Mock the Cerebras SDK
const mockCreate = jest.fn();

jest.mock("@cerebras/cerebras_cloud_sdk", () => {
  return {
    __esModule: true,
    default: class Cerebras {
      chat = {
        completions: {
          create: (...args: any[]) => mockCreate(...args),
        },
      };
    },
  };
});

describe("LLM Transaction Analysis", () => {
  const mockTxn = createTransaction({
    description: "NETFLIX COM AU",
    amount: -15.99,
  });

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("correctly parses valid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [
                {
                  id: mockTxn.id,
                  category: "Entertainment",
                  cleanMerchantName: "Netflix",
                  isSubscription: true,
                  isRecurring: true,
                  confidence: 0.95,
                  reasoning: "Netflix is a known streaming subscription",
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await analyzeTransaction(mockTxn);

    expect(result.category).toBe("Entertainment");
    expect(result.cleanMerchantName).toBe("Netflix");
    expect(result.isSubscription).toBe(true);
    expect(result.confidence).toBe(0.95);
  });

  it("handles invalid category gracefully", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [
                {
                  id: "1",
                  category: "Space Travel", // Invalid
                  cleanMerchantName: "SpaceX",
                  isSubscription: false,
                  isRecurring: false,
                  confidence: 1.0,
                },
              ],
            }),
          },
        },
      ],
    });

    const result = await analyzeTransaction(mockTxn);

    expect(result.category).toBe("Uncategorized");
  });

  it("handles API failure gracefully", async () => {
    mockCreate.mockRejectedValue(new Error("API Error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await analyzeTransaction(mockTxn);

    expect(result.category).toBe("Uncategorized");
    expect(result.reasoning).toContain("Error");
    consoleSpy.mockRestore();
  });
});
