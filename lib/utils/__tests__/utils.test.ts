import { formatCurrency, formatDate } from "../format";
import { calculateSafeBalance } from "../safeBalance";
import { Transaction } from "../../store";

describe("Utility Functions", () => {
  describe("format", () => {
    it("should format currency correctly", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatCurrency(-50)).toBe("-$50.00");
    });

    it("should format dates correctly", () => {
      expect(formatDate("2024-01-01")).toBe("01/01/2024");
    });
  });

  describe("safeBalance", () => {
    const mockTxns: Transaction[] = [
      {
        id: "1",
        date: "2024-01-01",
        amount: -100,
        description: "BILLS",
        category: "Utilities",
        isRecurring: true,
      },
    ];

    it("should calculate safe balance including recurring expenses", () => {
      const balance = 1000;
      const buckets = 200;
      const patterns = [
        { keyword: "BILLS", averageAmount: 100, dayOfMonth: 1 },
      ];
      const result = calculateSafeBalance(balance, buckets, mockTxns, patterns);
      expect(result.safeBalance).toBeLessThan(balance);
    });
  });
});
