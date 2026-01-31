import { useAppStore } from "../index";
import { Transaction, Rule } from "../index";
import { runCategorizationWorkflow } from "../../engine/categorization";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Categorization Workflow
jest.mock("../../engine/categorization", () => ({
  runCategorizationWorkflow: jest.fn(),
}));

describe("AppStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().reset();
  });

  const mockTxn: Transaction = {
    id: "1",
    date: "2024-01-01",
    amount: -100,
    description: "Test",
    category: "Uncategorized",
    isRecurring: false,
  };

  it("should add transactions and sort them by date descending", () => {
    const txn1 = { ...mockTxn, id: "1", date: "2024-01-01" };
    const txn2 = { ...mockTxn, id: "2", date: "2024-01-05" };

    useAppStore.getState().addTransactions([txn1, txn2]);

    const state = useAppStore.getState();
    expect(state.transactions.length).toBe(2);
    expect(state.transactions[0].id).toBe("2"); // Jan 5 first
    expect(state.transactions[1].id).toBe("1"); // Jan 1 second
  });

  it("should deduplicate transactions by ID", () => {
    useAppStore.getState().addTransactions([mockTxn]);
    const count = useAppStore.getState().addTransactions([mockTxn]);

    expect(useAppStore.getState().transactions.length).toBe(1);
    expect(count).toBe(0); // Returns number of NEW transactions
  });

  it("should update a transaction", () => {
    useAppStore.getState().addTransactions([mockTxn]);
    useAppStore.getState().updateTransaction("1", { category: "Food" });

    expect(useAppStore.getState().transactions[0].category).toBe("Food");
  });

  it("should delete a transaction", () => {
    useAppStore.getState().addTransactions([mockTxn]);
    useAppStore.getState().deleteTransaction("1");
    expect(useAppStore.getState().transactions).toHaveLength(0);
  });

  it("should add and remove rules", () => {
    const rule: Rule = { id: "r1", keyword: "test", category: "Testing" };
    useAppStore.getState().addRule(rule);

    expect(useAppStore.getState().rules.length).toBe(1);
    expect(useAppStore.getState().rules[0].keyword).toBe("TEST"); // Should be uppercase

    // Prevent duplicate keywords
    useAppStore.getState().addRule({ id: "r2", keyword: "test", category: "Other" });
    expect(useAppStore.getState().rules).toHaveLength(1);

    useAppStore.getState().removeRule("r1");
    expect(useAppStore.getState().rules.length).toBe(0);
  });

  it("should set and reset state", () => {
    useAppStore.getState().setBankBalance(1000);
    useAppStore.getState().setSavingsBuckets(200);
    useAppStore.getState().setHasSeenWelcome(true);
    useAppStore.getState().setLastBackupDate("2024-01-01");
    
    expect(useAppStore.getState().bankBalance).toBe(1000);
    expect(useAppStore.getState().savingsBuckets).toBe(200);

    useAppStore.getState().reset();
    expect(useAppStore.getState().bankBalance).toBe(0);
    expect(useAppStore.getState().hasSeenWelcome).toBe(false);
  });

  it("should import state correctly", () => {
    const partialState = { bankBalance: 999, rules: [{ id: "r1", keyword: "I", category: "C" }] };
    useAppStore.getState().importState(partialState);
    expect(useAppStore.getState().bankBalance).toBe(999);
    expect(useAppStore.getState().rules).toHaveLength(1);
  });

  it("should handle reapplyRules workflow", async () => {
    const updatedTxns = [{ ...mockTxn, category: "Categorized" }];
    (runCategorizationWorkflow as jest.Mock).mockResolvedValue(updatedTxns);

    const promise = useAppStore.getState().reapplyRules();
    expect(useAppStore.getState().isAnalyzing).toBe(true);

    await promise;
    expect(useAppStore.getState().isAnalyzing).toBe(false);
    expect(useAppStore.getState().transactions[0].category).toBe("Categorized");
  });

  it("should handle reapplyRules failure", async () => {
    (runCategorizationWorkflow as jest.Mock).mockRejectedValue(new Error("Fail"));
    console.error = jest.fn(); // Suppress expected error log

    await useAppStore.getState().reapplyRules();
    expect(useAppStore.getState().isAnalyzing).toBe(false);
  });
});