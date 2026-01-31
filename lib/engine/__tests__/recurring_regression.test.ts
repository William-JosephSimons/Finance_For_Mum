import { detectRecurring } from "../recurring";
import { Transaction } from "../../store";

describe("Recurring Engine Regression Tests", () => {
  it("should detect a recurring bill even with a significant price change (e.g., Netflix $16.99 -> $22.99)", () => {
    const transactions: Transaction[] = [
      {
        id: "tx1",
        date: "2025-12-28T10:00:00Z",
        amount: -16.99,
        description: "NETFLIX",
        category: "Subscriptions",
        isRecurring: true,
        merchantName: "Netflix"
      },
      {
        id: "tx2",
        date: "2026-01-28T10:00:00Z",
        amount: -22.99,
        description: "NETFLIX",
        category: "Subscriptions",
        isRecurring: true,
        merchantName: "Netflix"
      }
    ];

    const patterns = detectRecurring(transactions);
    
    // We expect ONE pattern for Netflix, not zero or two.
    expect(patterns).toHaveLength(1);
    expect(patterns[0].keyword).toBe("NETFLIX");
    // averageAmount should be based on the latest occurrence in the original logic, 
    // but the pattern average calculation also matters.
  });

  it("should handle casing inconsistency in merchantName from LLM", () => {
    const transactions: Transaction[] = [
      {
        id: "tx1",
        date: "2025-12-28T10:00:00Z",
        amount: -16.99,
        description: "NETFLIX",
        category: "Subscriptions",
        isRecurring: true,
        merchantName: "Netflix"
      },
      {
        id: "tx2",
        date: "2026-01-28T10:00:00Z",
        amount: -22.99,
        description: "NETFLIX",
        category: "Subscriptions",
        isRecurring: true,
        merchantName: "NETFLIX"
      }
    ];

    const patterns = detectRecurring(transactions);
    
    // We expect ONE pattern even if LLM returned different casing
    expect(patterns).toHaveLength(1);
  });
});
