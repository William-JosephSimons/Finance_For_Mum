import React from "react";
import { render } from "@testing-library/react-native";
import CalendarScreen from "../(tabs)/calendar";
import { useAppStore } from "@/lib/store";
import { createTransaction } from "../../__tests__/factories";

describe("CalendarScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-10T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render empty state correctly", () => {
    const { getByText } = render(<CalendarScreen />);
    expect(getByText("No Recurring Bills Detected")).toBeTruthy();
  });

  it("should display upcoming bills and projected balances", () => {
    // Setup a recurring pattern: RENT on 15th
    useAppStore.getState().setBankBalance(1000);
    useAppStore.getState().addTransactions([
      createTransaction({ id: "r1", date: "2023-12-15", amount: -500, description: "RENT", isRecurring: true }),
      createTransaction({ id: "r2", date: "2023-11-15", amount: -500, description: "RENT", isRecurring: true })
    ]);

    const { getByText } = render(<CalendarScreen />);
    
    // Today is Jan 10. Next RENT is Jan 15.
    expect(getByText("RENT")).toBeTruthy();
    expect(getByText("Due 15/01/2024")).toBeTruthy();
    expect(getByText("→ $500.00")).toBeTruthy(); // 1000 - 500
  });

  it("should show warning for negative projected balance", () => {
    useAppStore.getState().setBankBalance(100);
    useAppStore.getState().addTransactions([
      createTransaction({ id: "r1", date: "2023-12-15", amount: -500, description: "RENT", isRecurring: true })
    ]);

    const { getByText } = render(<CalendarScreen />);
    expect(getByText(/Balance will be negative/)).toBeTruthy();
    expect(getByText("→ -$400.00")).toBeTruthy();
  });
});
