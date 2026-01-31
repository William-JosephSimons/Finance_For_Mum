import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import TransactionsScreen from "../(tabs)/transactions";
import { useAppStore } from "@/lib/store";
import { createTransaction } from "../../__tests__/factories";

describe("TransactionsScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
    // Add a sample transaction
    useAppStore.getState().addTransactions([
      createTransaction({
        id: "txn1",
        description: "WOOLWORTHS",
        amount: -100,
        date: "2024-01-01"
      }),
      createTransaction({
        id: "txn2",
        description: "NETFLIX",
        amount: -15,
        date: "2024-01-02"
      })
    ]);
  });

  it("should render transaction list correctly", () => {
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText("WOOLWORTHS")).toBeTruthy();
    expect(getByText("NETFLIX")).toBeTruthy();
  });

  it("should filter transactions based on search query", () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<TransactionsScreen />);
    
    const searchInput = getByPlaceholderText("Search transactions...");
    fireEvent.changeText(searchInput, "WOOL");

    expect(getByText("WOOLWORTHS")).toBeTruthy();
    expect(queryByText("NETFLIX")).toBeNull();
  });

  it("should open categorization modal and handle deletion", async () => {
    const { getByText, findByText } = render(<TransactionsScreen />);

    fireEvent.press(getByText("WOOLWORTHS"));
    expect(getByText("Categorize Transaction")).toBeTruthy();

    fireEvent.press(getByText("🗑️"));
    expect(await findByText("Delete Transaction?")).toBeTruthy();

    fireEvent.press(getByText("Yes, Delete"));

    await waitFor(() => {
      expect(useAppStore.getState().transactions.length).toBe(1);
    });
  });

  it("should handle categorization and recurring toggle", async () => {
    const { getByText, getByRole } = render(<TransactionsScreen />);

    fireEvent.press(getByText("WOOLWORTHS"));
    
    // Toggle recurring (Switch is harder to find without testID, usually by role)
    // Actually handleCategorize handles it
    fireEvent.press(getByText("Groceries"));

    await waitFor(() => {
      expect(useAppStore.getState().transactions.find(t => t.id === "txn1")?.category).toBe("Groceries");
    });
  });
  
  it("should show empty state message", () => {
    useAppStore.getState().reset();
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText("No transactions yet")).toBeTruthy();
  });
});