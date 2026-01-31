import { runCategorizationWorkflow } from "../categorization";
import { Transaction, Rule } from "../../store";
import * as llm from "../llm";
import * as rules from "../rules";

jest.mock("../llm");
jest.mock("../rules", () => {
  const actual = jest.requireActual("../rules");
  return {
    ...actual,
    applyRules: jest.fn(actual.applyRules),
  };
});

describe("Categorization Workflow", () => {
  const mockTxns: Transaction[] = [
    { id: "1", description: "WOOLWORTHS", amount: -50, date: "2024-01-01", category: "Uncategorized", isRecurring: false },
    { id: "2", description: "NETFLIX", amount: -15, date: "2024-01-01", category: "Uncategorized", isRecurring: false },
  ];

  const mockRules: Rule[] = [
    { id: "r1", keyword: "WOOLWORTHS", category: "Groceries" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should apply rules and then analyze remaining with LLM", async () => {
    // Rule matches 'WOOLWORTHS' (id: 1)
    // 'NETFLIX' (id: 2) remains Uncategorized

    const mockLLMResults = new Map([
      ["2", { category: "Entertainment", cleanMerchantName: "Netflix", isSubscription: true, isRecurring: true, confidence: 0.9, reasoning: "Ok" }]
    ]);

    (llm.analyzeBatch as jest.Mock).mockResolvedValue(mockLLMResults);

    const result = await runCategorizationWorkflow(mockTxns, mockRules);

    expect(rules.applyRules).toHaveBeenCalledWith(mockTxns, mockRules);
    expect(llm.analyzeBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "2" })]),
      50,
      undefined
    );

    const t1 = result.find(t => t.id === "1");
    const t2 = result.find(t => t.id === "2");

    expect(t1?.category).toBe("Groceries");
    expect(t2?.category).toBe("Entertainment");
    expect(t2?.isRecurring).toBe(true);
    expect(t2?.merchantName).toBe("Netflix");
  });

  it("should skip LLM if all transactions are categorized by rules", async () => {
    const rulesList: Rule[] = [
      { id: "r1", keyword: "WOOLWORTHS", category: "Groceries" },
      { id: "r2", keyword: "NETFLIX", category: "Subscriptions" },
    ];

    const result = await runCategorizationWorkflow(mockTxns, rulesList);

    expect(llm.analyzeBatch).not.toHaveBeenCalled();
    expect(result.every(t => t.category !== "Uncategorized")).toBe(true);
  });

  it("should handle LLM failures gracefully", async () => {
    (llm.analyzeBatch as jest.Mock).mockRejectedValue(new Error("LLM Down"));

    // We expect the workflow to throw if analyzeBatch throws, 
    // but runCategorizationWorkflow doesn't have a try-catch, it's handled in the store.
    await expect(runCategorizationWorkflow(mockTxns, [])).rejects.toThrow("LLM Down");
  });

  it("should call onUpdate after applying rules", async () => {
    const onUpdate = jest.fn();
    (llm.analyzeBatch as jest.Mock).mockResolvedValue(new Map());

    await runCategorizationWorkflow(mockTxns, mockRules, { onUpdate });

    expect(onUpdate).toHaveBeenCalled();
    // Check that it was called with the rules-applied state
    const callState = onUpdate.mock.calls[0][0] as Transaction[];
    expect(callState.find(t => t.id === "1")?.category).toBe("Groceries");
  });
});
