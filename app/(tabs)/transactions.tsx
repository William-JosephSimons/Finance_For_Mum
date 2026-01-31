import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useState, useMemo } from "react";
import { useAppStore, Transaction } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CATEGORIES, suggestKeyword } from "@/lib/engine/rules";

// Bypass NativeWind's JSX interception for FlatList to avoid columnWrapperStyle issue on web
class SafeFlatList extends FlatList<any> {
  _checkProps(props: any) {
    // The original _checkProps throws an invariant error if columnWrapperStyle is present 
    // but numColumns is 1. NativeWind v4 sometimes injects this prop.
  }
}

export default function TransactionsScreen() {
  const {
    transactions,
    rules,
    addRule,
    updateTransaction,
    deleteTransaction,
    reapplyRules,
    isAnalyzing,
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [alwaysApply, setAlwaysApply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(
      (txn) =>
        txn.description.toLowerCase().includes(query) ||
        txn.category.toLowerCase().includes(query),
    );
  }, [transactions, searchQuery]);

  // Group by month
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filteredTransactions.forEach((txn) => {
      const monthKey = txn.date.substring(0, 7); // YYYY-MM
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(txn);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  const handleCategorize = (category: string) => {
    if (!selectedTxn) return;

    // Update the transaction's category (triggers Bayesian training in store)
    updateTransaction(selectedTxn.id, { category });

    // Create rule if "always apply" is checked
    if (alwaysApply) {
      const keyword = suggestKeyword(selectedTxn.description);
      addRule({
        id: Date.now().toString(),
        keyword,
        category,
      });

      // Retroactively apply to all
      reapplyRules();
    }

    // Update local state to reflect the change visually in the modal
    setSelectedTxn({ ...selectedTxn, category });
  };

  const handleDelete = () => {
    if (!selectedTxn) return;
    setIsDeleting(true);
  };

  const confirmDelete = () => {
    if (!selectedTxn) return;
    deleteTransaction(selectedTxn.id);
    setSelectedTxn(null);
    setIsDeleting(false);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-display text-accent dark:text-accent-dark">
          Transactions
        </Text>
        <Text className="text-muted dark:text-muted-dark mt-1 font-medium">
          {transactions.length} total
          {isAnalyzing && " • Analyzing..."}
        </Text>
      </View>

      {/* Search */}
      <View className="px-6 pb-6">
        <TextInput
          className="bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark rounded-2xl px-5 py-4 text-lg text-accent dark:text-accent-dark"
          placeholder="Search transactions..."
          placeholderTextColor="#A1A1AA"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Transaction List */}
      <SafeFlatList
        data={groupedTransactions}
        keyExtractor={([monthKey]: [string, any]) => monthKey}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        renderItem={({ item: [monthKey, txns] }: { item: [string, Transaction[]] }) => (
          <View className="mb-6">
            {/* Month Header */}
            <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {new Date(monthKey + "-01").toLocaleDateString("en-AU", {
                month: "long",
                year: "numeric",
              })}
            </Text>

            {/* Transactions */}
            <View className="bg-white dark:bg-surface-subtle-dark rounded-3xl border border-border dark:border-border-dark overflow-hidden shadow-sm">
              {txns.map((txn, index) => (
                <Pressable
                  key={txn.id}
                  onPress={() => setSelectedTxn(txn)}
                  className={`px-4 py-5 flex-row items-center active:bg-surface-subtle dark:active:bg-accent-dark/10 ${
                    index < txns.length - 1 ?
                      "border-b border-border dark:border-border-dark"
                    : ""
                  }`}
                >
                  {/* Category indicator */}
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      txn.category === "Uncategorized" ?
                        "bg-gray-100"
                      : "bg-accent-muted"
                    }`}
                  >
                    <Text className="text-lg">
                      {txn.amount < 0 ? "↑" : "↓"}
                    </Text>
                  </View>

                  {/* Details */}
                  <View className="flex-1">
                    <Text
                      className="text-accent dark:text-accent-dark font-semibold text-base"
                      numberOfLines={1}
                    >
                      {txn.description}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-muted dark:text-muted-dark text-xs font-medium">
                        {formatDate(txn.date)}
                      </Text>
                      <Text className="text-muted dark:text-muted-dark opacity-30">
                        •
                      </Text>
                      <Text
                        className={`text-xs font-bold ${
                          txn.category === "Uncategorized" ?
                            "text-muted dark:text-muted-dark"
                          : "text-accent-blue"
                        }`}
                      >
                        {txn.category}
                      </Text>

                      {txn.isRecurring && (
                        <>
                          <Text className="text-muted dark:text-muted-dark opacity-30">
                            •
                          </Text>
                          <Text className="text-sm">🔄</Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Amount */}
                  <Text
                    className={`font-bold text-lg ${
                      txn.amount < 0 ?
                        "text-accent dark:text-accent-dark"
                      : "text-positive"
                    }`}
                  >
                    {formatCurrency(txn.amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-muted text-lg">No transactions yet</Text>
            <Text className="text-muted mt-1">Import a CSV to get started</Text>
          </View>
        }
      />

      {/* Categorization Modal */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-surface-dark rounded-t-[40px] p-6 pb-12 max-h-[80%]">
            <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full self-center mb-6" />

            <View className="flex-row justify-between items-start mb-1">
              <View className="flex-1">
                <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-2">
                  Categorize Transaction
                </Text>
                <Text className="text-accent dark:text-accent-dark text-xl font-bold mb-1">
                  {selectedTxn?.description}
                </Text>
                <Text className="text-muted dark:text-muted-dark text-base">
                  {selectedTxn ? formatCurrency(selectedTxn.amount) : ""} •{" "}
                  {selectedTxn ? formatDate(selectedTxn.date) : ""}
                </Text>
              </View>
              {!isDeleting && (
                <Pressable
                  onPress={handleDelete}
                  className="w-12 h-12 bg-negative/10 rounded-full items-center justify-center active:scale-95"
                >
                  <Text className="text-xl">🗑️</Text>
                </Pressable>
              )}
            </View>

            {isDeleting ?
              <View className="mt-6 bg-negative/5 dark:bg-negative/10 border border-negative/20 rounded-[32px] p-6">
                <Text className="text-negative font-bold text-lg mb-2 text-center">
                  Delete Transaction?
                </Text>
                <Text className="text-negative/80 dark:text-negative/60 text-center mb-6">
                  This action cannot be undone. Are you sure?
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setIsDeleting(false)}
                    className="flex-1 py-4 rounded-2xl items-center bg-white dark:bg-surface-subtle-dark border border-border dark:border-border-dark"
                  >
                    <Text className="text-accent dark:text-accent-dark font-bold">
                      Keep it
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmDelete}
                    className="flex-1 py-4 rounded-2xl items-center bg-negative active:scale-95"
                  >
                    <Text className="text-white font-bold">Yes, Delete</Text>
                  </Pressable>
                </View>
              </View>
            : <>
                <View className="flex-row items-center justify-between mt-6 mb-6 bg-surface-subtle dark:bg-surface-subtle-dark p-4 rounded-2xl border border-border dark:border-border-dark">
                  <View>
                    <Text className="text-accent dark:text-accent-dark font-bold text-sm">
                      Always apply to similar
                    </Text>
                    <Text className="text-muted dark:text-muted-dark text-xs">
                      Create a rule for this store
                    </Text>
                  </View>
                  <Switch
                    value={alwaysApply}
                    onValueChange={(value) => {
                      setAlwaysApply(value);
                      // If transaction is already categorized, apply rule immediately
                      if (
                        value &&
                        selectedTxn &&
                        selectedTxn.category !== "Uncategorized"
                      ) {
                        const keyword = suggestKeyword(selectedTxn.description);
                        addRule({
                          id: Date.now().toString(),
                          keyword,
                          category: selectedTxn.category,
                        });
                        reapplyRules();
                        Alert.alert(
                          "Rule Created",
                          `Successfully applied "${selectedTxn.category}" to similar transactions.`,
                        );
                      }
                    }}
                    trackColor={{ false: "#E4E4E7", true: "#000" }}
                  />
                </View>

                <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-widest mb-4">
                  Select Category
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => handleCategorize(cat)}
                        className={`px-4 py-3 rounded-2xl border ${
                          selectedTxn?.category === cat ?
                            "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                          : "bg-surface-subtle dark:bg-surface-subtle-dark border-border dark:border-border-dark"
                        }`}
                      >
                        <Text
                          className={`font-bold ${
                            selectedTxn?.category === cat ?
                              "text-white dark:text-black"
                            : "text-accent dark:text-accent-dark"
                          }`}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            }

            <Pressable
              onPress={() => {
                setSelectedTxn(null);
                setAlwaysApply(false);
                setIsDeleting(false);
              }}
              className="mt-8 py-5 rounded-2xl items-center bg-accent dark:bg-accent-dark active:scale-95 transition-transform"
            >
              <Text className="text-white dark:text-black font-bold">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
