import React from "react";
import { render, within } from "@testing-library/react-native";
import InsightsScreen from "../(tabs)/insights";
import { useAppStore } from "@/lib/store";
import { createTransaction } from "../../__tests__/factories";

describe("InsightsScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
  });

  it("should render empty state correctly", () => {
    const { getByText, getAllByText } = render(<InsightsScreen />);
    expect(getByText("Insights")).toBeTruthy();
    // Round-up and Surcharge cards both show $0.00
    expect(getAllByText("$0.00").length).toBeGreaterThanOrEqual(2);
    expect(getByText("No subscriptions detected")).toBeTruthy();
  });

  it("should display round-up and surcharge data", () => {
    const now = new Date();
    const monthStr = now.toISOString().substring(0, 7);
    
    useAppStore.getState().addTransactions([
      createTransaction({ id: "1", amount: -4.30, date: `${monthStr}-01`, description: "COFFEE" }),
      createTransaction({ id: "2", amount: -0.50, date: `${monthStr}-02`, description: "EFTPOS SURCHARGE" })
    ]);

    const { getByTestId } = render(<InsightsScreen />);
    
    // Round up: 
    // 4.30 -> 5.00 (0.70)
    // 0.50 -> 1.00 (0.50)
    // Total: 1.20
    const roundupCard = getByTestId("round-up-card");
    expect(within(roundupCard).getByText("$1.20")).toBeTruthy();

    // Surcharge: 0.50
    const surchargeCard = getByTestId("surcharge-card");
    expect(within(surchargeCard).getByText("$0.50")).toBeTruthy();
  });

  it("should display subscriptions and price increases", () => {
    useAppStore.getState().addTransactions([
      createTransaction({ id: "s1", amount: -15.99, description: "NETFLIX", isRecurring: true, category: "Subscriptions", date: "2024-01-01" }),
      createTransaction({ id: "s2", amount: -10.99, description: "NETFLIX", isRecurring: true, category: "Subscriptions", date: "2023-12-01" })
    ]);

    const { getByText } = render(<InsightsScreen />);
    expect(getByText("NETFLIX")).toBeTruthy();
    expect(getByText("⚠️ Was $10.99")).toBeTruthy();
  });
});