import { parseCSV } from "../lib/parsers";
import { detectSurcharges } from "../lib/utils/surcharges";
import { Transaction } from "../lib/store";

const TEST_CSV = `
"Date","Description","Amount","Balance"
"25/01/2026","VISA PURCHASE   YOMG Pacific Fair Broadbeach W 24/01 AU AUD","-$8.29","$2,884.42"
"25/01/2026","OSKO PAYMENT TO 082738 298509626 borgarrrr REF NO 65707720","-$18.90","$2,892.71"
"28/01/2026","NETFLIX.COM                 LOS GATOS     CA  AUD","-$22.99","$2,800.00"
"27/01/2026","OPENAI *CHATGPT SUBSCRIP    SAN FRANCISC  CA  AUD","-$30.00","$2,822.99"
"14/01/2026","REVERSAL OF TRANSACTION     WOOLWORTHS    AU  AUD","$15.20","$2,889.88"
"20/01/2026","ATM WITHDRAWAL FEE                                  ","-$2.50","$3,571.39"
`; // Simplified but captures the edge cases: Unsorted dates, Balance in middle row, Fee.

describe("Integration Fixes", () => {
  let parsedWait: any;

  beforeAll(() => {
    parsedWait = parseCSV(TEST_CSV);
  });

  test("1. Parser finds balance from LATEST date (28/01/2026)", () => {
    // Row 3 (28/01) > Row 1 (25/01) > Row 5 (14/01).
    // Balance should be $2,800.00
    expect(parsedWait.balance).toBe(2800.0);
  });

  test("2. Detect Surcharges by Category", () => {
    // We need to simulate the LLM categorization.
    // In a real flow, LLM runs after parse.
    // We will manually categorize the fee transaction to test utility.
    const feeTxn: Transaction = {
      id: "1",
      description: "ATM WITHDRAWAL FEE",
      amount: -2.5, // Expense
      date: "2026-01-20T00:00:00.000Z",
          category: "Merchant Card Fees & Surcharges", // LLM applied this
          isRecurring: false,
        };
    const feeTxn2: Transaction = {
      id: "2",
      description: "NORMAL PURCHASE",
      amount: -100,
      date: "2026-01-20T00:00:00.000Z",
      category: "Groceries",
      isRecurring: false,
    };

    // Note: detectSurcharges uses Current Month. Our mock date is Jan 2026.
    // We must pass the month of the transaction to the detector if we want it to work for Jan 2026 (assuming current real time isn't Jan 2026).
    // Wait, assuming current time IS Jan 2026 as per user prompt context.
    // If test runs in future/past, defaults to 'new Date()'.
    // We should pass explicit date to be safe.
    const jan2026 = new Date("2026-01-15");

    const result = detectSurcharges([feeTxn, feeTxn2], jan2026);

    expect(result.total).toBe(2.5);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe("ATM WITHDRAWAL FEE");
  });
});
