import { useAppStore } from "../lib/store";
import { detectRecurring } from "../lib/engine/recurring";
import { createTransaction } from "./factories";

describe("E2E Integration: Categorization to Bills Sync", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("should show a transaction on the Bills page after categorizing it as Utilities", () => {
    const store = useAppStore.getState();
    
    // 1. Simulate Import
    const txn = createTransaction({
      description: "ORIGIN ENERGY 12345",
      amount: -150.00,
      category: "Uncategorized",
      isRecurring: false
    });
    
    store.addTransactions([txn]);
    
    // Verify initial state: not recurring, no bills
    let currentTxns = useAppStore.getState().transactions;
    expect(currentTxns[0].category).toBe("Uncategorized");
    expect(currentTxns[0].isRecurring).toBe(false);
    
    let patterns = detectRecurring(currentTxns);
    expect(patterns.length).toBe(0);

    // 2. Simulate User Categorization (matching logic in TransactionsScreen.tsx)
    const newCategory = "Utilities";
    const isRecurring = txn.isRecurring || newCategory === "Utilities" || newCategory === "Subscriptions";
    
    useAppStore.getState().updateTransaction(txn.id, { 
      category: newCategory, 
      isRecurring 
    });

    // 3. Verify Sync
    const updatedTxns = useAppStore.getState().transactions;
    expect(updatedTxns[0].category).toBe("Utilities");
    expect(updatedTxns[0].isRecurring).toBe(true);

    // 4. Verify Bills Page logic (detectRecurring)
    const updatedPatterns = detectRecurring(updatedTxns);
    expect(updatedPatterns.length).toBe(1);
    expect(updatedPatterns[0].keyword).toBe("ORIGIN ENERGY 1"); // Description slice logic
  });
});
