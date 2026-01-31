import { parseCSV, detectBank } from "../index";

describe("Parser Logic", () => {
  describe("detectBank", () => {
    it("should detect CommBank", () => {
      expect(detectBank(["Date", "Amount", "Description", "Balance"])).toBe("commbank");
    });

    it("should detect NAB", () => {
      expect(detectBank(["Date", "Debit", "Credit", "Balance"])).toBe("nab");
    });

    it("should detect Westpac", () => {
      expect(detectBank(["Bank Account", "Date", "Narrative"])).toBe("westpac");
    });

    it("should detect ANZ", () => {
      expect(detectBank(["Date", "Transaction Details", "Particulars"])).toBe("anz");
    });

    it("should return unknown for random headers", () => {
      expect(detectBank(["Foo", "Bar"])).toBe("unknown");
    });
  });

  describe("parseCSV", () => {
    it("should parse a standard CommBank CSV", () => {
      const csv = "Date,Amount,Description,Balance\n01/01/2024,-10.50,Coffee,1000.00";
      const result = parseCSV(csv);
      expect(result.bank).toBe("commbank");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(-10.5);
      expect(result.balance).toBe(1000);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle NAB format with separate Debit/Credit", () => {
      const csv = "Date,Transaction Type,Debit,Credit,Balance\n01/01/2024,Grocery,50.00,,950.00\n02/01/2024,Salary,,100.00,1050.00";
      const result = parseCSV(csv);
      expect(result.bank).toBe("nab");
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].amount).toBe(-50);
      expect(result.transactions[1].amount).toBe(100);
    });

    it("should return error for empty CSV", () => {
      const result = parseCSV("");
      expect(result.errors).toContain("No data found in CSV");
    });

    it("should return error for unknown bank format", () => {
      const csv = "Foo,Bar\n1,2";
      const result = parseCSV(csv);
      expect(result.bank).toBe("unknown");
      expect(result.errors[0]).toContain("Could not detect bank format");
    });

    it("should handle malformed amounts gracefully", () => {
      const csv = "Date,Amount,Description,Balance\n01/01/2024,invalid,Coffee,1000.00";
      const result = parseCSV(csv);
      // It detects CommBank but finds 0 valid transactions because 'invalid' isn't a number
      expect(result.bank).toBe("commbank");
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toContain("No valid transactions found in CSV");
    });

    it("should handle various date formats", () => {
      const formats = [
        "01/01/2024",
        "1/1/2024",
        "01-01-2024",
        "1 Jan 2024",
        "1 Jan 24"
      ];
      
      formats.forEach(dateStr => {
        const csv = `Date,Amount,Description\n${dateStr},-10,Test`;
        const result = parseCSV(csv);
        expect(result.transactions).toHaveLength(1);
        expect(new Date(result.transactions[0].date).getFullYear()).toBe(2024);
      });
    });

    it("should handle large files efficiently (simulated)", () => {
      let csv = "Date,Amount,Description,Balance\n";
      for (let i = 0; i < 1000; i++) {
        csv += `01/01/2024,-1.00,Item ${i},1000.00\n`;
      }
      const start = Date.now();
      const result = parseCSV(csv);
      const end = Date.now();
      
      expect(result.transactions).toHaveLength(1000);
      expect(end - start).toBeLessThan(500); // Should be very fast
    });
  });
});
