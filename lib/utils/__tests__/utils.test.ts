import { formatCurrency, formatDate, formatRelativeDate } from "../format";
import { calculateRoundUpSavings } from "../roundUp";
import { calculateSafeBalance } from "../safeBalance";
import { detectSubscriptions } from "../subscriptions";
import { detectSurcharges } from "../surcharges";
import { Transaction } from "../../store";

describe("Utility Functions", () => {
  describe("format", () => {
    describe("formatCurrency", () => {
      it("should format positive amounts correctly", () => {
        expect(formatCurrency(1234.56)).toBe("$1,234.56");
        expect(formatCurrency(0)).toBe("$0.00");
        expect(formatCurrency(1000000)).toBe("$1,000,000.00");
      });

      it("should format negative amounts with a leading minus", () => {
        expect(formatCurrency(-50)).toBe("-$50.00");
        expect(formatCurrency(-0.01)).toBe("-$0.01");
      });
    });

    describe("formatDate", () => {
      it("should format string dates correctly", () => {
        expect(formatDate("2024-01-01")).toBe("01/01/2024");
      });

      it("should format Date objects correctly", () => {
        expect(formatDate(new Date(2024, 0, 15))).toBe("15/01/2024");
      });
    });

    describe("formatRelativeDate", () => {
      beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      it('should return "Today" for current date', () => {
        expect(formatRelativeDate("2024-01-10")).toBe("Today");
      });

      it('should return "Yesterday" for one day ago', () => {
        expect(formatRelativeDate("2024-01-09")).toBe("Yesterday");
      });

      it('should return "X days ago" for within a week', () => {
        expect(formatRelativeDate("2024-01-05")).toBe("5 days ago");
        expect(formatRelativeDate("2024-01-04")).toBe("6 days ago");
      });

      it("should return absolute date for more than a week ago", () => {
        expect(formatRelativeDate("2024-01-01")).toBe("01/01/2024");
      });
    });
  });

  describe("roundUp", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-01", amount: -4.3, description: "Coffee", category: "Food" },
      { id: "2", date: "2024-01-02", amount: -10.0, description: "Lunch", category: "Food" }, // No roundup
      { id: "3", date: "2024-01-03", amount: 50.0, description: "Salary", category: "Income" }, // Income ignored
      { id: "4", date: "2024-01-05", amount: -0.05, description: "Tiny", category: "Misc" }, // Rounds to 1.00? No, ceil(0.05) is 1. Roundup is 0.95.
      { id: "5", date: "2024-02-01", amount: -5.5, description: "Next Month", category: "Food" }, // Different month
    ];

    it("should calculate savings for the specified month", () => {
      const result = calculateRoundUpSavings(transactions, new Date("2024-01-15"));
      // 4.3 -> 5.0 (0.7)
      // 0.05 -> 1.0 (0.95)
      // Total: 1.65
      expect(result.total).toBe(1.65);
      expect(result.transactionCount).toBe(2);
    });

    it("should return zero if no qualifying transactions", () => {
      const result = calculateRoundUpSavings([], new Date("2024-01-15"));
      expect(result.total).toBe(0);
      expect(result.transactionCount).toBe(0);
    });
  });

  describe("safeBalance", () => {
    const today = new Date("2024-01-10");
    const patterns = [
      { keyword: "RENT", averageAmount: 500, dayOfMonth: 15 },
      { keyword: "INTERNET", averageAmount: 80, dayOfMonth: 5 },
    ];

    it("should include unpaid bills within 30 days", () => {
      const transactions: Transaction[] = []; // No bills paid yet
      const result = calculateSafeBalance(2000, 200, transactions, patterns, today);
      
      // RENT (Jan 15) is upcoming
      // INTERNET (Jan 5) was due, but not paid this month, so it's OVERDUE (still in Jan)
      expect(result.upcomingBills).toHaveLength(2);
      expect(result.totalUpcomingBills).toBe(580);
      expect(result.safeBalance).toBe(2000 - 580 - 200);
    });

    it("should exclude bills already paid this month", () => {
      const transactions: Transaction[] = [
        { id: "1", date: "2024-01-05", amount: -80, description: "INTERNET", category: "Bills" }
      ];
      const result = calculateSafeBalance(2000, 200, transactions, patterns, today);
      
      // INTERNET is paid, next due is Feb 5 (within 30 days of Jan 10)
      // RENT is Jan 15 (upcoming)
      expect(result.upcomingBills).toHaveLength(2);
      expect(result.upcomingBills.find(b => b.description === "INTERNET")?.dueDate.getMonth()).toBe(1); // February
    });

    it("should handle empty patterns", () => {
      const result = calculateSafeBalance(1000, 0, [], [], today);
      expect(result.safeBalance).toBe(1000);
      expect(result.upcomingBills).toHaveLength(0);
    });
  });

  describe("subscriptions", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-01", amount: -15.99, description: "NETFLIX", category: "Subscriptions", isRecurring: true },
      { id: "2", date: "2023-12-01", amount: -10.99, description: "NETFLIX", category: "Subscriptions", isRecurring: true },
      { id: "3", date: "2024-01-05", amount: -12.00, description: "SPOTIFY", category: "Subscriptions", isRecurring: true },
    ];

    it("should detect subscriptions and price increases", () => {
      const subs = detectSubscriptions(transactions);
      expect(subs).toHaveLength(2);
      
      const netflix = subs.find(s => s.name === "NETFLIX");
      expect(netflix?.currentAmount).toBe(15.99);
      expect(netflix?.previousAmount).toBe(10.99);
      expect(netflix?.priceIncreased).toBe(true);
    });

    it("should group by merchantName if available", () => {
      const txns: Transaction[] = [
        { id: "1", date: "2024-01-01", amount: -10, description: "AMZN MKTP", merchantName: "Amazon", category: "Shopping", isRecurring: true },
        { id: "2", date: "2023-12-01", amount: -10, description: "AMAZON.COM", merchantName: "Amazon", category: "Shopping", isRecurring: true },
      ];
      const subs = detectSubscriptions(txns);
      expect(subs).toHaveLength(1);
      expect(subs[0].name).toBe("Amazon");
    });
  });

  describe("surcharges", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-01", amount: -0.50, description: "EFTPOS SURCHARGE", category: "Misc" },
      { id: "2", date: "2024-01-02", amount: -2.50, description: "COFFEE", category: "Merchant Card Fees & Surcharges" },
      { id: "3", date: "2024-01-03", amount: -10.00, description: "GROCERIES", category: "Food" },
    ];

    it("should detect surcharges by keyword and category", () => {
      const result = detectSurcharges(transactions, new Date("2024-01-15"));
      expect(result.total).toBe(3.00);
      expect(result.transactions).toHaveLength(2);
    });

    it("should filter by month", () => {
      const result = detectSurcharges(transactions, new Date("2024-02-15"));
      expect(result.total).toBe(0);
    });
  });
});