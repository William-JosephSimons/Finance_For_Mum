import { View, Text, ScrollView } from "react-native";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/format";
import { calculateRoundUpSavings } from "@/lib/utils/roundUp";
import { detectSurcharges } from "@/lib/utils/surcharges";
import { detectSubscriptions } from "@/lib/utils/subscriptions";
import { subMonths } from "date-fns";

export default function InsightsScreen() {
  const { transactions, _hasHydrated } = useAppStore();

  // Round-Up Simulator (current month)
  const roundUpData = useMemo(() => {
    if (!_hasHydrated) return { total: 0, transactionCount: 0 };
    return calculateRoundUpSavings(transactions);
  }, [transactions, _hasHydrated]);

  // Surcharge Detector (current month)
  const surchargeData = useMemo(() => {
    if (!_hasHydrated) return { total: 0, transactions: [] };
    return detectSurcharges(transactions);
  }, [transactions, _hasHydrated]);

  // Subscription Slayer
  const subscriptions = useMemo(() => {
    if (!_hasHydrated) return [];
    return detectSubscriptions(transactions);
  }, [transactions, _hasHydrated]);

  // Grocery Inflation (last 12 months)
  const groceryTrend = useMemo(() => {
    if (!_hasHydrated) return [];
    const months: { month: string; total: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStr = monthDate.toISOString().substring(0, 7);
      const monthTxns = transactions.filter(
        (t) =>
          t.date.startsWith(monthStr) &&
          t.category.toLowerCase().includes("grocer") &&
          t.amount < 0,
      );
      const total = monthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      months.push({
        month: monthDate.toLocaleDateString("en-AU", { month: "short" }),
        total,
      });
    }

    return months;
  }, [transactions]);

  const maxGrocery = Math.max(...groceryTrend.map((m) => m.total), 1);

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-display text-accent dark:text-accent-dark">
          Insights
        </Text>
        <Text className="text-muted dark:text-muted-dark mt-1 font-medium">
          Understand your spending patterns
        </Text>
      </View>

      <View className="px-6 py-4 gap-6">
        {/* Round-Up Simulator */}
        <View className="bg-positive-muted/50 dark:bg-positive/10 rounded-3xl p-6 border border-positive/20">
          <Text className="text-positive text-xs font-bold uppercase mb-1">
            💰 Round-Up Simulator
          </Text>
          <Text className="text-3xl font-bold text-accent dark:text-accent-dark mt-2">
            {formatCurrency(roundUpData.total)}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-base mt-2 font-medium">
            Potential savings from {roundUpData.transactionCount} transactions
          </Text>
        </View>

        {/* Surcharge Detector */}
        <View className="bg-negative-muted/50 dark:bg-negative/10 rounded-3xl p-6 border border-negative/20">
          <Text className="text-negative text-xs font-bold uppercase mb-1">
            💳 Card Fees & Surcharges
          </Text>
          <Text className="text-3xl font-bold text-accent dark:text-accent-dark mt-2">
            {formatCurrency(surchargeData.total)}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-base mt-2 font-medium">
            Lost to fees this month across {surchargeData.transactions.length}{" "}
            items
          </Text>
        </View>

        {/* Subscription Slayer */}
        <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark overflow-hidden">
          <View className="p-6 border-b border-border dark:border-border-dark">
            <Text className="text-accent dark:text-accent-dark font-bold text-lg">
              📺 Subscriptions
            </Text>
            <Text className="text-muted dark:text-muted-dark text-sm mt-1 font-medium">
              {subscriptions.length} detected
            </Text>
          </View>

          {subscriptions.length === 0 ?
            <View className="p-10 items-center">
              <Text className="text-muted dark:text-muted-dark font-medium">
                No subscriptions detected
              </Text>
            </View>
          : subscriptions.map((sub, index) => (
              <View
                key={sub.name}
                className={`px-6 py-5 flex-row items-center justify-between ${
                  index < subscriptions.length - 1 ?
                    "border-b border-border dark:border-border-dark"
                  : ""
                }`}
              >
                <View>
                  <Text className="text-accent dark:text-accent-dark font-bold text-base">
                    {sub.name}
                  </Text>
                  {sub.priceIncreased && sub.previousAmount && (
                    <Text className="text-negative text-xs font-bold mt-1 uppercase">
                      ⚠️ Was {formatCurrency(sub.previousAmount)}
                    </Text>
                  )}
                </View>
                <Text
                  className={`text-lg font-bold ${
                    sub.priceIncreased ? "text-negative" : (
                      "text-accent dark:text-accent-dark"
                    )
                  }`}
                >
                  {formatCurrency(sub.currentAmount)}/mo
                </Text>
              </View>
            ))
          }
        </View>

        {/* Grocery Inflation Monitor */}
        <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark p-6">
          <Text className="text-accent dark:text-accent-dark font-bold text-lg mb-1">
            🛒 Grocery Spending
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm mb-6 font-medium">
            12-month spending trend
          </Text>

          {/* Simple bar chart */}
          <View className="flex-row items-end h-32 gap-2">
            {groceryTrend.map((month, index) => (
              <View key={index} className="flex-1 items-center">
                <View
                  className="w-full bg-accent-blue/80 dark:bg-accent-blue/40 rounded-t-lg"
                  style={{
                    height: `${(month.total / maxGrocery) * 100}%`,
                    minHeight: month.total > 0 ? 4 : 0,
                  }}
                />
              </View>
            ))}
          </View>

          {/* Month labels */}
          <View className="flex-row mt-3">
            {groceryTrend.map((month, index) => (
              <Text
                key={index}
                className="flex-1 text-center text-[10px] font-bold text-muted dark:text-muted-dark uppercase"
              >
                {index % 3 === 0 ? month.month : ""}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom padding */}
      <View className="h-24" />
    </ScrollView>
  );
}
