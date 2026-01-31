import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ImportScreen from "../import";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useAppStore } from "@/lib/store";

// Mock the Expo modules
jest.mock("expo-document-picker");
jest.mock("expo-file-system");

describe("ImportScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    jest.clearAllMocks();
  });

  it("should render correctly", () => {
    const { getByText } = render(<ImportScreen />);
    expect(getByText("Import CSV")).toBeTruthy();
    expect(getByText("Select CSV File")).toBeTruthy();
  });

  it("should handle CSV import correctly", async () => {
    // Mock DocumentPicker to return a "file"
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "test.csv", name: "test.csv" }],
    });

    // Mock FileSystem to return CSV content
    const csvContent =
      "Date,Description,Amount\n01/01/2024,TEST PURCHASE,-50.00";
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

    const { getByText, findByText } = render(<ImportScreen />);

    const importButton = getByText("Select CSV File");
    fireEvent.press(importButton);

    await waitFor(() => {
      expect(findByText("✓ Import Successful")).toBeTruthy();
    });

    expect(useAppStore.getState().transactions.length).toBe(1);
    expect(useAppStore.getState().transactions[0].description).toBe(
      "TEST PURCHASE",
    );
  });

  it("should update bank balance if balance is present in CSV", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "test.csv", name: "test.csv" }],
    });

    const csvContent =
      "Date,Amount,Description,Balance\n01/01/2024,-50.00,TEST PURCHASE,1000.00";
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

    const { getByText } = render(<ImportScreen />);

    const importButton = getByText("Select CSV File");
    fireEvent.press(importButton);

    await waitFor(() => {
      expect(useAppStore.getState().bankBalance).toBe(1000.0);
    });
  });
});
