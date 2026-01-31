import { View, Text, ScrollView } from "react-native";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { detectRecurring } from "@/lib/engine/recurring";
import { addDays, isAfter, isBefore, getDate } from "date-fns";

interface UpcomingBill {
  description: string;
  amount: number;
  dueDate: Date;
  projectedBalance: number;
}

export default function CalendarScreen() {
  const { transactions, bankBalance, _hasHydrated } = useAppStore();

  // Detect recurring patterns
  const recurringPatterns = useMemo(() => {
    if (!_hasHydrated) return [];
    return detectRecurring(transactions);
  }, [transactions, _hasHydrated]);

  // Project upcoming bills for next 30 days
  const upcomingBills = useMemo(() => {
    if (!_hasHydrated) return [];
    const today = new Date();
    const horizon = addDays(today, 30);
    const bills: UpcomingBill[] = [];
    let runningBalance = bankBalance;

    recurringPatterns.forEach((pattern) => {
      // Calculate this month's occurrence
      const thisMonthDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        pattern.dayOfMonth,
      );
      let nextDue = thisMonthDate;

      if (isBefore(thisMonthDate, today)) {
        // Already passed this month, use next month
        nextDue = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          pattern.dayOfMonth,
        );
      }

      if (isBefore(nextDue, horizon) && isAfter(nextDue, today)) {
        bills.push({
          description: pattern.keyword,
          amount: pattern.averageAmount,
          dueDate: nextDue,
          projectedBalance: 0, // Will be calculated after sorting
        });
      }
    });

    // Sort by date
    bills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Calculate running projected balance
    bills.forEach((bill) => {
      runningBalance -= bill.amount;
      bill.projectedBalance = runningBalance;
    });

    return bills;
  }, [recurringPatterns, bankBalance]);

  // Group bills by week
  const billsByWeek = useMemo(() => {
    const weeks: Record<string, UpcomingBill[]> = {
      "This Week": [],
      "Next Week": [],
      "Later This Month": [],
    };

    const today = new Date();
    const oneWeek = addDays(today, 7);
    const twoWeeks = addDays(today, 14);

    upcomingBills.forEach((bill) => {
      if (isBefore(bill.dueDate, oneWeek)) {
        weeks["This Week"].push(bill);
      } else if (isBefore(bill.dueDate, twoWeeks)) {
        weeks["Next Week"].push(bill);
      } else {
        weeks["Later This Month"].push(bill);
      }
    });

    return Object.entries(weeks).filter(([_, bills]) => bills.length > 0);
  }, [upcomingBills]);

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-display text-accent dark:text-accent-dark">
          Upcoming Bills
        </Text>
        <Text className="text-muted dark:text-muted-dark mt-1 font-medium">
          Next 30 days • {upcomingBills.length} bills detected
        </Text>
      </View>

      {/* Current Balance */}
      <View className="px-6 py-4">
        <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl p-6 border border-border dark:border-border-dark">
          <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
            Starting Balance
          </Text>
          <Text className="text-size-balance text-accent dark:text-accent-dark">
            {formatCurrency(bankBalance)}
          </Text>
        </View>
      </View>

      {/* Bills Timeline */}
      <View className="px-6 py-4">
        {billsByWeek.map(([weekLabel, bills]) => (
          <View key={weekLabel} className="mb-6">
            {/* Bills Section */}
            <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-4">
              {weekLabel}
            </Text>

            <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark overflow-hidden">
              {bills.map((bill, index) => (
                <View
                  key={`${bill.description}-${index}`}
                  className={`px-5 py-5 ${
                    index < bills.length - 1 ?
                      "border-b border-border dark:border-border-dark"
                    : ""
                  }`}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-accent dark:text-accent-dark font-bold text-base">
                        {bill.description}
                      </Text>
                      <Text className="text-muted dark:text-muted-dark text-sm mt-1 font-medium">
                        Due {formatDate(bill.dueDate)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-negative font-bold text-lg">
                        -{formatCurrency(bill.amount)}
                      </Text>
                      <Text
                        className={`text-sm mt-1 font-bold ${
                          bill.projectedBalance < 0 ?
                            "text-negative"
                          : "text-muted dark:text-muted-dark"
                        }`}
                      >
                        → {formatCurrency(bill.projectedBalance)}
                      </Text>
                    </View>
                  </View>

                  {/* Warning if balance goes negative */}
                  {bill.projectedBalance < 0 && (
                    <View className="mt-3 bg-negative-muted rounded-lg px-3 py-2">
                      <Text className="text-negative text-sm">
                        ⚠️ Balance will be negative after this bill
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Empty State */}
        {upcomingBills.length === 0 && (
          <View className="bg-accent-muted rounded-2xl p-8 items-center">
            <Text className="text-accent text-lg font-semibold mb-2">
              No Recurring Bills Detected
            </Text>
            <Text className="text-accent/70 text-center">
              Import more transactions to detect patterns
            </Text>
          </View>
        )}
      </View>

      {/* Bottom padding */}
      <View className="h-24" />
    </ScrollView>
  );
}
