import { detectRecurring, markRecurringTransactions } from "../recurring";
import { createTransaction } from "../../../__tests__/factories";

describe("recurring engine", () => {
  const mockTransactions = [
    // Pattern 1: Netflix (consistent)
    createTransaction({
      id: "n1",
      date: "2024-01-15",
      amount: -15.99,
      description: "NETFLIX.COM",
    }),
    createTransaction({
      id: "n2",
      date: "2024-02-14",
      amount: -15.99,
      description: "NETFLIX.COM",
    }),
    createTransaction({
      id: "n3",
      date: "2024-03-16",
      amount: -15.99,
      description: "NETFLIX.COM",
    }),

    // Pattern 2: Woolworths (varying amounts, not recurring)
    createTransaction({
      id: "w1",
      date: "2024-01-01",
      amount: -120.5,
      description: "WOOLWORTHS 123",
    }),
    createTransaction({
      id: "w2",
      date: "2024-01-10",
      amount: -45.2,
      description: "WOOLWORTHS 123",
    }),

    // Pattern 3: Rent (consistent amount, consistent day)
    createTransaction({
      id: "r1",
      date: "2024-01-01",
      amount: -500.0,
      description: "RENT PAYMENT",
    }),
    createTransaction({
      id: "r2",
      date: "2024-02-01",
      amount: -500.0,
      description: "RENT PAYMENT",
    }),

    // Random transaction
    createTransaction({
      id: "x1",
      date: "2024-01-20",
      amount: -20.0,
      description: "RANDOM SHOP",
    }),
  ];

  describe("detectRecurring", () => {
    it("should detect consistent monthly payments", () => {
      const patterns = detectRecurring(mockTransactions);

      const netflix = patterns.find((p) => p.keyword === "NETFLIX.COM");
      expect(netflix).toBeDefined();
      expect(netflix?.averageAmount).toBe(15.99);
      expect(netflix?.dayOfMonth).toBe(15); // Avg of 15, 14, 16 is 15

      const rent = patterns.find((p) => p.keyword === "RENT PAYMENT");
      expect(rent).toBeDefined();
      expect(rent?.averageAmount).toBe(500);
      expect(rent?.dayOfMonth).toBe(1);
    });

    it("should ignore transactions with inconsistent amounts", () => {
      const patterns = detectRecurring(mockTransactions);
      const woolworths = patterns.find((p) => p.keyword === "WOOLWORTHS 123");
      expect(woolworths).toBeUndefined();
    });

    it("should only consider expenses", () => {
      const income: Transaction[] = [
        {
          id: "i1",
          date: "2024-01-01",
          amount: 1000,
          description: "SALARY",
          category: "Income",
          isRecurring: false,
        },
        {
          id: "i2",
          date: "2024-02-01",
          amount: 1000,
          description: "SALARY",
          category: "Income",
          isRecurring: false,
        },
      ];
      const patterns = detectRecurring(income);
      expect(patterns.length).toBe(0);
    });
  });

  describe("markRecurringTransactions", () => {
    it("should flag transactions matching patterns", () => {
      const patterns = detectRecurring(mockTransactions);
      const results = markRecurringTransactions(mockTransactions, patterns);

      expect(results.find((t) => t.id === "n1")?.isRecurring).toBe(true);
      expect(results.find((t) => t.id === "r1")?.isRecurring).toBe(true);
      expect(results.find((t) => t.id === "w1")?.isRecurring).toBe(false);
      expect(results.find((t) => t.id === "x1")?.isRecurring).toBe(false);
    });
  });
});
