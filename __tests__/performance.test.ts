import { applyRules } from "../lib/engine/rules";
import { useAppStore, Transaction, Rule } from "../lib/store";
import * as llm from "../lib/engine/llm";

// Mock LLM
jest.mock("../lib/engine/llm");

const generateTransactions = (count: number): Transaction[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i}`,
    date: new Date(Date.now() - i * 86400000).toISOString(),
    amount: -Math.random() * 100,
    description: `Transaction ${i} Merchant ${i % 100}`,
    category: "Uncategorized",
    isRecurring: false,
  }));
};

const generateRules = (count: number): Rule[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `r-${i}`,
    keyword: `Merchant ${i}`,
    category: `Category ${i % 10}`,
  }));
};

describe("Performance Benchmarks", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    jest.clearAllMocks();
  });

  it("Benchmark: applyRules (1000 txns, 100 rules)", () => {
    const txns = generateTransactions(1000);
    const rules = generateRules(100);

    const start = Date.now();
    const result = applyRules(txns, rules);
    const end = Date.now();

    console.log(`BENCHMARK: applyRules (1000 txns, 100 rules): ${end - start}ms`);
    expect(result).toHaveLength(1000);
  });

  it("Benchmark: store.addTransactions (1000 txns)", () => {
    const txns = generateTransactions(1000);

    const start = Date.now();
    useAppStore.getState().addTransactions(txns);
    const end = Date.now();

    console.log(`BENCHMARK: store.addTransactions (1000 txns): ${end - start}ms`);
    expect(useAppStore.getState().transactions).toHaveLength(1000);
  });

  it("Benchmark: reapplyRules (1000 txns, 10 rules, 100 LLM hits)", async () => {
    const txns = generateTransactions(1000);
    const rules = generateRules(10);
    useAppStore.getState().addTransactions(txns);
    rules.forEach(r => useAppStore.getState().addRule(r));

    const mockLLMResults = new Map();
    for (let i = 0; i < 100; i++) {
        mockLLMResults.set(`tx-${i}`, { 
            category: "Food", 
            cleanMerchantName: "Mock", 
            isSubscription: false, 
            isRecurring: false, 
            confidence: 0.9, 
            reasoning: "Mock" 
        });
    }
    (llm.analyzeBatch as jest.Mock).mockResolvedValue(mockLLMResults);

    const start = Date.now();
    await useAppStore.getState().reapplyRules();
    const end = Date.now();

    console.log(`BENCHMARK: store.reapplyRules (1000 txns): ${end - start}ms`);
  });
});
