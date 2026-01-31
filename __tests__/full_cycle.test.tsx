import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ImportScreen from "../app/import";
import DashboardScreen from "../app/(tabs)/index";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useAppStore } from "@/lib/store";

// Mock the Expo modules
jest.mock("expo-document-picker");
jest.mock("expo-file-system");

describe("Full Cycle: Import to Dashboard", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
    jest.clearAllMocks();
  });

  it("should reflect imported transactions on the dashboard", async () => {
    // 1. Mock CSV with a specific transaction and balance
    const csvContent = "Date,Amount,Description,Balance\n01/01/2024,-123.45,GROCERIES,5000.00";
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "test.csv", name: "test.csv" }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

    // 2. Render Import Screen and trigger import
    const { getByText: getByTextImport, findByText: findByTextImport } = render(<ImportScreen />);
    fireEvent.press(getByTextImport("Select CSV File"));

    await waitFor(() => {
      expect(findByTextImport("✓ Import Successful")).toBeTruthy();
    });

    // 3. Verify Store state directly
    const state = useAppStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.bankBalance).toBe(5000.00);

    // 4. Render Dashboard and check if it shows the updated balance
    const { getAllByText } = render(<DashboardScreen />);
    
    // Check balance appears in the Hero section and the Balance card
    await waitFor(() => {
        expect(getAllByText(/\$5,000.00/).length).toBeGreaterThanOrEqual(2);
    });
  });
});
