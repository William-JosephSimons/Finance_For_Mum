import { applyRules, suggestKeyword } from "../rules";
import { Transaction, Rule } from "../../store";
import { createRule, createTransaction } from "../../../__tests__/factories";

describe("rules engine", () => {
  const mockRules: Rule[] = [
    createRule({ id: "1", keyword: "WOOLWORTHS", category: "Groceries" }),
    createRule({ id: "2", keyword: "NETFLIX", category: "Subscriptions" }),
    createRule({ id: "3", keyword: "WOOLWORTHS ONLINE", category: "Shopping" }),
  ];

  const mockTransactions: Transaction[] = [
    createTransaction({
      id: "t1",
      description: "WOOLWORTHS 1234 SYDNEY",
      amount: -50,
    }),
    createTransaction({
      id: "t2",
      description: "NETFLIX.COM",
      amount: -15,
    }),
    createTransaction({
      id: "t3",
      description: "WOOLWORTHS ONLINE MELBOURNE",
      amount: -100,
    }),
    createTransaction({
      id: "t4",
      description: "7-ELEVEN",
      amount: -20,
    }),
  ];

  describe("applyRules", () => {
    it("should categorize transactions based on keywords", () => {
      const results = applyRules(mockTransactions, mockRules);
      expect(results.find((t) => t.id === "t1")?.category).toBe("Groceries");
      expect(results.find((t) => t.id === "t2")?.category).toBe(
        "Subscriptions",
      );
    });

    it("should respect rule precedence (longer keywords first)", () => {
      const results = applyRules(mockTransactions, mockRules);
      // 'WOOLWORTHS ONLINE' is longer than 'WOOLWORTHS'
      expect(results.find((t) => t.id === "t3")?.category).toBe("Shopping");
    });

    it("should not overwrite existing categorization", () => {
      const alreadyCategorized: Transaction = {
        ...mockTransactions[0],
        category: "Personal",
      };
      const results = applyRules([alreadyCategorized], mockRules);
      expect(results[0].category).toBe("Personal");
    });

    it("should leave unknown transactions uncategorized", () => {
      const results = applyRules(mockTransactions, mockRules);
      expect(results.find((t) => t.id === "t4")?.category).toBe(
        "Uncategorized",
      );
    });
  });

  describe("suggestKeyword", () => {
    it("should remove dates and amounts", () => {
      expect(suggestKeyword("WOOLWORTHS 24/12 $50.00")).toBe("WOOLWORTHS");
    });

    it("should remove reference numbers and VISA/EFTPOS noise", () => {
      expect(suggestKeyword("VISA DEBIT WOOLWORTHS REF: 123456")).toBe(
        "WOOLWORTHS",
      );
    });

    it("should take first meaningful words", () => {
      expect(suggestKeyword("THE BIG COFFEE SHOP SYDNEY CBD")).toBe("THE BIG");
    });

    it("should cluster common Australian merchants universally", () => {
      // Patterns taken from the user's actual CSV
      expect(suggestKeyword("VISA PURCHASE   WOOLWORTHS/KINGSCLIFF")).toBe(
        "WOOLWORTHS",
      );
      expect(suggestKeyword("VISA PURCHASE   COLES 4577 BANORA POINT")).toBe(
        "COLES",
      );
      expect(suggestKeyword("VISA PURCHASE   JB HI FI PACIFIC FAI")).toBe(
        "JB HI",
      );
      expect(suggestKeyword("VISA PURCHASE   MCDONALDS ROBINA FCI")).toBe(
        "MCDONALDS",
      );
      expect(suggestKeyword("VISA PURCHASE   KFC Tweed Heads FC")).toBe(
        "KFC TWEED",
      );
    });

    it("should normalize to uppercase and trim", () => {
      expect(suggestKeyword("  coffee shop  ")).toBe("COFFEE");
    });
  });
});
