import { useAppStore } from "../index";
import { Transaction, Rule } from "../index";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe("AppStore", () => {
  beforeEach(() => {
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
    useAppStore.getState().addTransactions([mockTxn]);

    expect(useAppStore.getState().transactions.length).toBe(1);
  });

  it("should update a transaction", () => {
    useAppStore.getState().addTransactions([mockTxn]);
    useAppStore.getState().updateTransaction("1", { category: "Food" });

    expect(useAppStore.getState().transactions[0].category).toBe("Food");
  });

  it("should add and remove rules", () => {
    const rule: Rule = { id: "r1", keyword: "TEST", category: "Testing" };
    useAppStore.getState().addRule(rule);

    expect(useAppStore.getState().rules.length).toBe(1);
    expect(useAppStore.getState().rules[0].keyword).toBe("TEST"); // Should be uppercase

    useAppStore.getState().removeRule("r1");
    expect(useAppStore.getState().rules.length).toBe(0);
  });

  it("should set and reset state", () => {
    useAppStore.getState().setBankBalance(1000);
    expect(useAppStore.getState().bankBalance).toBe(1000);

    useAppStore.getState().reset();
    expect(useAppStore.getState().bankBalance).toBe(0);
  });

  it("should export state correctly", () => {
    useAppStore.getState().setBankBalance(500);
    const exported = useAppStore.getState().exportState();
    expect(exported.bankBalance).toBe(500);
    // Ensure functions are not in exported state
    expect((exported as any).addTransactions).toBeUndefined();
  });
});
