import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useAppStore } from "@/lib/store";
import { parseCSV, BANK_NAMES } from "@/lib/parsers";
import { formatCurrency } from "@/lib/utils/format";

export default function ImportScreen() {
  const { rules, addTransactions, setBankBalance, reapplyRules } =
    useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    duplicates: number;
    bank: string;
    total: number;
  } | null>(null);

  const handlePickFile = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      // Pick a CSV file
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
      });

      if (docResult.canceled) {
        setIsLoading(false);
        return;
      }

      const file = docResult.assets[0];
      if (!file) {
        setIsLoading(false);
        return;
      }

      // Read file content
      let content: string;

      if (Platform.OS === "web") {
        // For web, we need to fetch the file
        const response = await fetch(file.uri);
        content = await response.text();
      } else {
        // For native, use FileSystem
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      // Parse CSV
      const parseResult = parseCSV(content);

      if (parseResult.errors.length > 0) {
        Alert.alert("Import Error", parseResult.errors.join("\n"));
        setIsLoading(false);
        return;
      }

      // Add to store
      const addedCount = addTransactions(parseResult.transactions);
      const duplicateCount = parseResult.transactions.length - addedCount;

      // Trigger background analysis (async)
      reapplyRules();

      // Update bank balance if provided in CSV
      if (parseResult.balance !== undefined) {
        setBankBalance(parseResult.balance);
      }

      // Calculate totals for display
      const total = parseResult.transactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );

      setResult({
        count: addedCount,
        duplicates: duplicateCount,
        bank: BANK_NAMES[parseResult.bank],
        total,
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Import error:", error);
      Alert.alert("Error", "Failed to import file. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-2 active:opacity-60"
        >
          <Text className="text-accent-blue text-lg font-bold">← Back</Text>
        </Pressable>
        <Text className="text-2xl font-display text-accent dark:text-accent-dark">
          Import CSV
        </Text>
      </View>

      {/* Instructions */}
      <View className="px-6 py-4">
        <View className="bg-surface-subtle dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-3xl p-6">
          <Text className="text-accent dark:text-accent-dark font-bold text-lg mb-4">
            How to export from your bank:
          </Text>
          <View className="gap-3">
            {[
              "Log into your online banking",
              "Go to Transaction History",
              "Select date range",
              "Download as CSV",
            ].map((step, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View className="w-6 h-6 rounded-full bg-accent-blue/10 items-center justify-center">
                  <Text className="text-accent-blue text-xs font-bold">
                    {i + 1}
                  </Text>
                </View>
                <Text className="text-muted dark:text-muted-dark text-base font-medium">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Supported Banks */}
      <View className="px-6 py-6">
        <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-4">
          Supported Banks
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {["CommBank", "NAB", "Westpac", "ANZ", "Suncorp"].map((bank) => (
            <View
              key={bank}
              className="bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-full px-5 py-2"
            >
              <Text className="text-accent dark:text-accent-dark font-bold text-sm">
                {bank}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Import Button */}
      <View className="px-6 py-4">
        <Pressable
          onPress={handlePickFile}
          disabled={isLoading}
          className={`py-6 rounded-[24px] items-center ${
            isLoading ?
              "bg-border dark:bg-border-dark"
            : "bg-accent dark:bg-accent-dark active:opacity-80"
          }`}
        >
          <Text
            className={`text-xl font-bold ${isLoading ? "text-muted" : "text-accent-dark dark:text-accent"}`}
          >
            {isLoading ? "Processing..." : "Select CSV File"}
          </Text>
        </Pressable>
      </View>

      {/* Result */}
      {result && (
        <View className="px-6 py-4">
          <View className="bg-positive-muted/50 dark:bg-positive/10 border border-positive/20 rounded-3xl p-6">
            <Text className="text-positive font-bold text-xl mb-4">
              ✓ Import Successful
            </Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-muted dark:text-muted-dark font-medium">
                  Bank
                </Text>
                <Text className="text-accent dark:text-accent-dark font-bold">
                  {result.bank}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted dark:text-muted-dark font-medium">
                  New Transactions
                </Text>
                <Text className="text-positive font-bold">
                  {result.count}
                </Text>
              </View>
              {result.duplicates > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-muted dark:text-muted-dark font-medium">
                    Duplicates Ignored
                  </Text>
                  <Text className="text-muted dark:text-muted-dark font-bold">
                    {result.duplicates}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between pt-2 border-t border-positive/10">
                <Text className="text-muted dark:text-muted-dark font-medium">
                  Net Value
                </Text>
                <Text className="text-accent dark:text-accent-dark font-bold">
                  {formatCurrency(result.total)}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleDone}
            className="mt-6 py-5 rounded-[20px] items-center bg-positive active:opacity-80"
          >
            <Text className="text-white text-lg font-bold">Done</Text>
          </Pressable>
        </View>
      )}

      {/* Help */}
      <View className="px-6 py-12">
        <Text className="text-muted dark:text-muted-dark text-center text-xs font-semibold leading-relaxed">
          Your data stays on this device.{"\n"}
          Nothing is uploaded to the internet.
        </Text>
      </View>
    </ScrollView>
  );
}
