import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DashboardScreen from "../(tabs)/index";
import { useAppStore } from "@/lib/store";

describe("DashboardScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
  });

  it("should render correctly", async () => {
    const { getByText } = render(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText("Mum's Finance")).toBeTruthy();
    });
    expect(getByText("Safe to Spend")).toBeTruthy();
  });

  it("should open Set Balance modal and update balance", async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(
      <DashboardScreen />,
    );

    const setBalanceButton = getByText("Set Balance");
    fireEvent.press(setBalanceButton);

    const input = getByPlaceholderText("0.00");
    fireEvent.changeText(input, "1234.56");

    const updateButton = getByText("Update Balance");
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(useAppStore.getState().bankBalance).toBe(1234.56);
    });

    // Check if UI reflects the new balance - using regex and getAllByText because it appears in multiple places
    expect(getAllByText(/\$1,234\.56/).length).toBeGreaterThanOrEqual(1);
  });

  it("should show empty state message when no transactions", async () => {
    const { findByText } = render(<DashboardScreen />);
    expect(await findByText("Ready to start?")).toBeTruthy();
  });
});