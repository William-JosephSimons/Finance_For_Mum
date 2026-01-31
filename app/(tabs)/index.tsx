import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/format";
import { calculateSafeBalance } from "@/lib/utils/safeBalance";
import { detectRecurring } from "@/lib/engine/recurring";
import { calculateRoundUpSavings } from "@/lib/utils/roundUp";
import { detectSurcharges } from "@/lib/utils/surcharges";
import { Link } from "expo-router";

export default function DashboardScreen() {
  console.log("Dashboard Loaded - PWA Refresh Active");
  const { transactions, bankBalance, savingsBuckets, setBankBalance } =
    useAppStore();
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [pendingBalance, setPendingBalance] = useState(bankBalance.toString());

  const handleSetBalance = () => {
    setPendingBalance(bankBalance.toString());
    setIsBalanceModalVisible(true);
  };

  const saveBalance = () => {
    const num = parseFloat(pendingBalance || "0");
    if (!isNaN(num)) {
      setBankBalance(num);
    }
    setIsBalanceModalVisible(false);
  };

  // Calculate recurring patterns for safe balance
  const recurringPatterns = detectRecurring(transactions);
  const { safeBalance, upcomingBills, reservedForSavings } =
    calculateSafeBalance(
      bankBalance,
      savingsBuckets,
      transactions,
      recurringPatterns,
    );

  // Round-up simulator
  const { total: roundUpSavings } = calculateRoundUpSavings(transactions);

  // Surcharge detector
  const { total: surchargesTotal } = detectSurcharges(transactions);

  const isPositive = safeBalance >= 0;

  return (
    <ScrollView
      className="flex-1 bg-surface dark:bg-surface-dark"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-16 pb-8 flex-row justify-between items-center">
        <View>
          <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-[0.2em]">
            True North
          </Text>
          <Text className="text-accent dark:text-accent-dark text-2xl font-display mt-1">
            Mum's Finance
          </Text>
        </View>
        <Link href="/backup" asChild>
          <Pressable
            className="w-12 h-12 bg-surface-subtle dark:bg-surface-subtle-dark rounded-full items-center justify-center active:scale-95 transition-transform"
            accessibilityRole="button"
            accessibilityLabel="Backup and Restore"
          >
            <Text className="text-xl">⚙️</Text>
          </Pressable>
        </Link>
      </View>

      {/* Safe Balance Hero Section */}
      <View className="px-6 py-10 mb-6 mx-6 bg-accent dark:bg-accent-dark rounded-[40px] items-center shadow-2xl shadow-black/10">
        <Text className="text-accent-dark dark:text-accent text-sm font-semibold mb-3 tracking-[0.1em] opacity-80 uppercase">
          Safe to Spend
        </Text>
        <Text
          className={`text-hero font-display ${
            isPositive ? "text-positive" : "text-negative"
          }`}
        >
          {formatCurrency(safeBalance)}
        </Text>
        <View className="mt-6 px-4 py-2 bg-white/10 rounded-full">
          <Text className="text-accent-dark dark:text-accent text-sm font-medium">
            After {upcomingBills.length} upcoming items
          </Text>
        </View>
      </View>

      {/* Quick Actions - Polished Layout */}
      <View className="px-6 flex-row gap-4 mb-8">
        <Link href="/import" asChild>
          <Pressable
            className="flex-1 bg-surface-subtle dark:bg-surface-subtle-dark p-6 rounded-3xl items-center border border-border dark:border-border-dark active:scale-95 transition-transform"
            accessibilityRole="button"
          >
            <Text className="text-2xl mb-2">📥</Text>
            <Text className="text-accent dark:text-accent-dark text-sm font-bold">
              Import CSV
            </Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={handleSetBalance}
          className="flex-1 bg-surface-subtle dark:bg-surface-subtle-dark p-6 rounded-3xl items-center border border-border dark:border-border-dark active:scale-95 transition-transform"
          accessibilityRole="button"
        >
          <Text className="text-2xl mb-2">💰</Text>
          <Text className="text-accent dark:text-accent-dark text-sm font-bold">
            Set Balance
          </Text>
        </Pressable>
      </View>

      {/* Insights & Cards */}
      <View className="px-6 gap-6">
        {/* Current Bank Balance Card */}
        <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl p-6 border border-border dark:border-border-dark shadow-sm">
          <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
            Bank Balance
          </Text>
          <Text className="text-balance text-accent dark:text-accent-dark">
            {formatCurrency(bankBalance)}
          </Text>
        </View>

        {/* Highlight Insights - Grid layout for smaller cards if needed, but keeping vertical for mum's readability */}
        <View className="gap-4">
          {/* Round-Up Potential - More subtle & integrated */}
          <View className="bg-positive-muted/50 dark:bg-positive/10 rounded-3xl p-6 border border-positive/20">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="bg-positive w-2 h-2 rounded-full" />
              <Text className="text-positive dark:text-positive text-xs font-bold uppercase tracking-widest">
                Round-Up Potential
              </Text>
            </View>
            <Text className="text-3xl font-bold text-accent dark:text-accent-dark">
              {formatCurrency(roundUpSavings)}
            </Text>
            <Text className="text-muted dark:text-muted-dark text-xs mt-2 font-medium">
              Extra savings potential this month
            </Text>
          </View>

          {/* Surcharge Alert - High urgency design */}
          {surchargesTotal > 0 && (
            <View className="bg-negative-muted/50 dark:bg-negative/10 rounded-3xl p-6 border border-negative/20">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="bg-negative w-2 h-2 rounded-full" />
                <Text className="text-negative dark:text-negative text-xs font-bold uppercase tracking-widest">
                  Merchant Surcharges
                </Text>
              </View>
              <Text className="text-3xl font-bold text-accent dark:text-accent-dark">
                {formatCurrency(surchargesTotal)}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs mt-2 font-medium">
                Fees collected by retailers
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming Bills List */}
        {upcomingBills.length > 0 && (
          <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl p-6 border border-border dark:border-border-dark mb-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-accent dark:text-accent-dark text-lg font-bold">
                Upcoming Bills
              </Text>
              <View className="bg-surface-subtle dark:bg-accent-dark px-3 py-1 rounded-full">
                <Text className="text-accent dark:text-accent-dark text-xs font-bold">
                  Next 14 Days
                </Text>
              </View>
            </View>

            <View className="gap-4">
              {upcomingBills.slice(0, 3).map((bill, index) => (
                <View
                  key={index}
                  className="flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-accent dark:text-accent-dark font-semibold text-base">
                      {bill.description}
                    </Text>
                    <Text className="text-muted dark:text-muted-dark text-xs">
                      Estimated
                    </Text>
                  </View>
                  <Text className="text-accent dark:text-accent-dark font-bold text-lg">
                    {formatCurrency(bill.amount)}
                  </Text>
                </View>
              ))}
            </View>

            {upcomingBills.length > 3 && (
              <Pressable className="mt-6 pt-6 border-t border-border dark:border-border-dark items-center">
                <Text className="text-accent-blue font-bold text-sm">
                  View all bills
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Empty State */}
        {transactions.length === 0 && (
          <View className="bg-accent-blue/5 dark:bg-accent-blue/10 rounded-4xl p-10 items-center border-2 border-dashed border-accent-blue/20">
            <View className="w-20 h-20 bg-accent-blue/10 rounded-full items-center justify-center mb-6">
              <Text className="text-4xl">🚀</Text>
            </View>
            <Text className="text-accent dark:text-accent-dark text-xl font-bold mb-2">
              Ready to start?
            </Text>
            <Text className="text-muted dark:text-muted-dark text-center leading-relaxed">
              Import your latest bank statement to see your safe-to-spend
              balance.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom padding for tab bar */}
      <View className="h-32" />

      {/* Manual Balance Modal */}
      <Modal
        visible={isBalanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBalanceModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white dark:bg-surface-dark w-full rounded-[32px] p-8 shadow-2xl">
            <Text className="text-accent dark:text-accent-dark text-2xl font-bold mb-2">
              Set Bank Balance
            </Text>
            <Text className="text-muted dark:text-muted-dark text-base mb-6">
              Enter the current balance shown in your banking app.
            </Text>

            <View className="bg-surface-subtle dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-2xl px-5 py-4 mb-6">
              <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-1">
                Amount ($)
              </Text>
              <TextInput
                className="text-2xl font-bold text-accent dark:text-accent-dark"
                keyboardType="decimal-pad"
                autoFocus
                value={pendingBalance}
                onChangeText={setPendingBalance}
                placeholder="0.00"
              />
            </View>

            <View className="flex-row gap-4">
              <Pressable
                onPress={() => setIsBalanceModalVisible(false)}
                className="flex-1 py-4 rounded-2xl items-center bg-gray-100 dark:bg-gray-800"
              >
                <Text className="text-accent dark:text-accent-dark font-bold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveBalance}
                className="flex-2 py-4 rounded-2xl items-center bg-accent dark:bg-accent-dark active:scale-95"
              >
                <Text className="text-white dark:text-black font-bold">
                  Update Balance
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
