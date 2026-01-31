import { detectRecurring } from "../lib/engine/recurring";
import { calculateRoundUpSavings } from "../lib/utils/roundUp";
import { detectSubscriptions } from "../lib/utils/subscriptions";
import { Transaction } from "../lib/store";

describe("Logic Consistency & Regression Tests", () => {
  
  it("should handle merchant name casing inconsistencies from LLM", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-01-01", amount: -10, description: "SHOP", category: "Food", isRecurring: true, merchantName: "My Shop" },
      { id: "2", date: "2026-02-01", amount: -10, description: "SHOP", category: "Food", isRecurring: true, merchantName: "MY SHOP" }
    ];
    
    const patterns = detectRecurring(txns);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].keyword).toBe("MY SHOP");
    
    const subs = detectSubscriptions(txns);
    expect(subs).toHaveLength(1);
    expect(subs[0].name).toBe("MY SHOP");
  });

  it("should correctly detect price increases in subscriptions", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2025-12-01", amount: -16.99, description: "NETFLIX", category: "Subscriptions", isRecurring: true, merchantName: "Netflix" },
      { id: "2", date: "2026-01-01", amount: -22.99, description: "NETFLIX", category: "Subscriptions", isRecurring: true, merchantName: "Netflix" }
    ];
    
    const subs = detectSubscriptions(txns);
    expect(subs).toHaveLength(1);
    expect(subs[0].priceIncreased).toBe(true);
    expect(subs[0].currentAmount).toBe(22.99);
    expect(subs[0].previousAmount).toBe(16.99);
  });

  it("should respect month boundaries near UTC transition for Roundup", () => {
    // Transaction on Jan 1st morning (might be Dec 31st UTC)
    // 2026-01-01T01:00:00Z 
    const txns: Transaction[] = [
      { id: "1", date: "2026-01-01T01:00:00Z", amount: -10.50, description: "Test", category: "Food", isRecurring: false }
    ];
    
    // If we are in AEST (UTC+10), this is Jan 1st 11am.
    // If Roundup uses UTC substring, it sees "2026-01" which is fine.
    // But if it was 2026-01-01T00:00:00Z and user is in AEST, it's Jan 1st local.
    // Reverting to date-fns handles this based on the JS environment's local time (or provided Date object).
    
    const janResult = calculateRoundUpSavings(txns, new Date("2026-01-15"));
    expect(janResult.total).toBe(0.50);
  });
});
