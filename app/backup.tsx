import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { useAppStore } from "@/lib/store";

export default function BackupScreen() {
  const { exportState, importState, reset, _hasHydrated } = useAppStore();
  const [isResetting, setIsResetting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExport = async () => {
    try {
      const data = exportState();
      const json = JSON.stringify(data, null, 2);
      const fileName = `true-north-backup-${new Date().toISOString().split("T")[0]}.json`;

      if (Platform.OS === "web") {
        // Web: Trigger download
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Success", "Backup downloaded");
      } else {
        // Mobile: Share file
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, json);

        await Share.share({
          url: fileUri,
          title: "True North Backup",
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to create backup");
    }
  };

  const handleImport = async () => {
    setIsRestoring(true);
  };

  const confirmImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) {
        setIsRestoring(false);
        return;
      }

      const file = result.assets[0];
      let content = "";

      if (Platform.OS === "web") {
        const response = await fetch(file.uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      try {
        const data = JSON.parse(content);
        // Validate basic shape
        if (!Array.isArray(data.transactions)) {
          throw new Error("Invalid backup format");
        }

        importState(data);
        setIsRestoring(false);
        // Using a simpler alert here as it's just success, but even here we could use state if needed
        // For now let's hope success alert works or just navigate
        router.replace("/(tabs)");
      } catch (e) {
        setIsRestoring(false);
        Alert.alert("Error", "Invalid backup file");
      }
    } catch (error) {
      console.error(error);
      setIsRestoring(false);
      Alert.alert("Error", "Failed to import backup");
    }
  };

  const handleCopyDebug = async () => {
    const data = exportState();
    await Clipboard.setStringAsync(JSON.stringify(data, null, 2));
    Alert.alert("Copied", "Raw data copied to clipboard");
  };

  const handleReset = () => {
    setIsResetting(true);
  };

  const confirmReset = () => {
    reset();
    setIsResetting(false);
    router.replace("/(tabs)");
  };

  if (!_hasHydrated) {
    return null;
  }

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
          Backup & Restore
        </Text>
      </View>

      <View className="px-6 py-4 gap-6">
        <View className="bg-surface-subtle dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-3xl p-6">
          <Text className="text-accent dark:text-accent-dark font-bold text-lg mb-2">
            Your data is yours.
          </Text>
          <Text className="text-muted dark:text-muted-dark text-base leading-6">
            True North saves everything on this device. Create a backup file to
            move your data to another phone or keep it safe.
          </Text>
        </View>

        {/* Export */}
        <Pressable
          onPress={handleExport}
          className="bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-3xl p-6 active:bg-surface-subtle dark:active:bg-accent-dark/5"
        >
          <Text className="text-accent dark:text-accent-dark font-bold text-xl mb-1">
            Download Backup
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm">
            Save a .json file of all transactions and settings.
          </Text>
        </Pressable>

        {/* Import */}
        {!isRestoring ?
          <Pressable
            onPress={handleImport}
            className="bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-3xl p-6 active:bg-surface-subtle dark:active:bg-accent-dark/5"
          >
            <Text className="text-accent dark:text-accent-dark font-bold text-xl mb-1">
              Restore from Backup
            </Text>
            <Text className="text-muted dark:text-muted-dark text-sm">
              Overwrite current app data with a backup file.
            </Text>
          </Pressable>
        : <View className="bg-negative/5 dark:bg-negative/10 border border-negative/20 rounded-3xl p-6">
            <Text className="text-negative font-bold text-lg mb-2">
              Overwrite all data?
            </Text>
            <Text className="text-negative/60 dark:text-negative/40 mb-6">
              This will replace all current transactions and settings.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setIsRestoring(false)}
                className="flex-1 py-4 rounded-2xl items-center bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark active:bg-surface-subtle"
              >
                <Text className="text-accent dark:text-accent-dark font-bold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmImport}
                className="flex-1 py-4 rounded-2xl items-center bg-negative active:opacity-80"
              >
                <Text className="text-white font-bold">Yes, Restore</Text>
              </Pressable>
            </View>
          </View>
        }

        {/* Reset Section */}
        <View className="mt-8 pt-8 border-t border-border dark:border-border-dark">
          <Text className="text-negative font-bold text-sm uppercase mb-4 px-2">
            Danger Zone
          </Text>
          {!isResetting ?
            <Pressable
              onPress={handleReset}
              className="bg-negative/5 dark:bg-negative/10 border border-negative/20 rounded-3xl p-6 active:bg-negative/10"
            >
              <Text className="text-negative font-bold text-xl mb-1">
                Reset Account
              </Text>
              <Text className="text-negative/60 dark:text-negative/40 text-sm">
                Permanently wipe all data from this device.
              </Text>
            </Pressable>
          : <View className="bg-negative/10 dark:bg-negative/20 border-2 border-negative rounded-3xl p-6">
              <Text className="text-negative font-bold text-xl mb-2">
                Confirm Full Reset?
              </Text>
              <Text className="text-negative/80 dark:text-negative/60 mb-6">
                All transactions, rules, and your balance will be lost forever.
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setIsResetting(false)}
                  className="flex-1 py-4 rounded-2xl items-center bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark active:bg-surface-subtle"
                >
                  <Text className="text-accent dark:text-accent-dark font-bold">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmReset}
                  className="flex-1 py-4 rounded-2xl items-center bg-negative active:opacity-80"
                >
                  <Text className="text-white font-bold">Wipe Data</Text>
                </Pressable>
              </View>
            </View>
          }
        </View>

        {/* Debug */}
        <Pressable
          onPress={handleCopyDebug}
          className="mt-4 py-4 items-center active:opacity-60"
        >
          <Text className="text-muted dark:text-muted-dark text-sm font-medium">
            Copy Raw Data (Debug)
          </Text>
        </Pressable>

        <View className="items-center mt-4">
          <Text className="text-muted/50 dark:text-muted-dark/30 text-xs">
            v1.0.0 • True North Finance
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
