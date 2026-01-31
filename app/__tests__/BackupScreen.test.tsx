import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import BackupScreen from "../backup";
import { useAppStore } from "@/lib/store";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Share, Alert } from "react-native";
import { router } from "expo-router";

// Mock dependencies
jest.mock("expo-file-system");
jest.mock("expo-document-picker");
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock("react-native/Libraries/Share/Share", () => ({
  share: jest.fn(),
}));

describe("BackupScreen", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setHasHydrated(true);
    jest.clearAllMocks();
  });

  it("should render correctly", () => {
    const { getByText } = render(<BackupScreen />);
    expect(getByText("Backup & Restore")).toBeTruthy();
    expect(getByText("Download Backup")).toBeTruthy();
  });

  it("should trigger export flow", async () => {
    const { getByText } = render(<BackupScreen />);
    fireEvent.press(getByText("Download Backup"));

    await waitFor(() => {
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Share.share).toHaveBeenCalled();
    });
  });

  it("should show restore confirmation and handle import", async () => {
    const { getByText, findByText } = render(<BackupScreen />);
    fireEvent.press(getByText("Restore from Backup"));

    expect(await findByText("Overwrite all data?")).toBeTruthy();

    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "backup.json" }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ transactions: [], rules: [], bankBalance: 123 })
    );

    fireEvent.press(getByText("Yes, Restore"));

    await waitFor(() => {
      expect(useAppStore.getState().bankBalance).toBe(123);
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("should handle reset flow", async () => {
    const { getByText, findByText } = render(<BackupScreen />);
    fireEvent.press(getByText("Reset Account"));

    expect(await findByText("Confirm Full Reset?")).toBeTruthy();

    fireEvent.press(getByText("Wipe Data"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });
});
