import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { runCategorizationWorkflow } from "../engine/categorization";
import { detectRecurring, RecurringPattern } from "../engine/recurring";

// ============================================================================
// Types
// ============================================================================

export interface Transaction {
  id: string;
  date: string; // ISO 8601
  amount: number; // Negative = expense, Positive = income
  description: string;
  category: string;
  isRecurring: boolean;
  merchantName?: string;
}

export interface Rule {
  id: string;
  keyword: string; // Stored UPPERCASE for matching
  category: string;
}

export interface AppState {
  transactions: Transaction[];
  rules: Rule[];
  bankBalance: number;
  savingsBuckets: number;
  hasSeenWelcome: boolean;
  lastBackupDate: string | null;

  isAnalyzing: boolean;
  _hasHydrated: boolean;

  // Derived / Cached Data
  recurringPatterns: RecurringPattern[];
}

export interface AppActions {
  addTransactions: (txns: Transaction[]) => number;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  setBankBalance: (balance: number) => void;
  setSavingsBuckets: (amount: number) => void;
  setHasSeenWelcome: (seen: boolean) => void;
  setLastBackupDate: (date: string) => void;
  setHasHydrated: (val: boolean) => void;

  reset: () => void;
  reapplyRules: () => Promise<void>;
  importState: (data: Partial<AppState>) => void;
  exportState: () => AppState;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fast sort for ISO 8601 strings.
 * Avoids expensive 'new Date()' calls in the comparator.
 */
const sortTransactions = (txns: Transaction[]) => {
  return [...txns].sort((a, b) => b.date.localeCompare(a.date));
};

// ============================================================================
// Initial State
// ============================================================================

const initialState: AppState = {
  transactions: [],
  rules: [],
  bankBalance: 0,
  savingsBuckets: 0,
  hasSeenWelcome: false,
  lastBackupDate: null,
  isAnalyzing: false,
  _hasHydrated: false,
  recurringPatterns: [],
};

// ============================================================================
// Store
// ============================================================================

export const useAppStore = create<AppState & AppActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      setHasHydrated: (val) =>
        set((state) => {
          state._hasHydrated = val;
        }),

      addTransactions: (txns) => {
        let count = 0;
        set((state) => {
          if (txns.length === 0) return;

          const existingIds = new Set(state.transactions.map((t) => t.id));
          const newTxns = txns.filter((t) => !existingIds.has(t.id));

          count = newTxns.length;
          if (count === 0) return;

          const combined = [...state.transactions, ...newTxns];
          combined.sort((a, b) => b.date.localeCompare(a.date));
          state.transactions = combined;

          // Update derived patterns
          state.recurringPatterns = detectRecurring(state.transactions);
        });
        return count;
      },

      updateTransaction: (id, updates) =>
        set((state) => {
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index !== -1) {
            Object.assign(state.transactions[index], updates);
            // Update derived patterns if recurring status or amount/merchant changed
            if (
              updates.isRecurring !== undefined ||
              updates.amount !== undefined ||
              updates.merchantName !== undefined
            ) {
              state.recurringPatterns = detectRecurring(state.transactions);
            }
          }
        }),

      deleteTransaction: (id) =>
        set((state) => {
          state.transactions = state.transactions.filter((t) => t.id !== id);
          state.recurringPatterns = detectRecurring(state.transactions);
        }),

      addRule: (rule) =>
        set((state) => {
          const upperKeyword = rule.keyword.toUpperCase();
          const exists = state.rules.some((r) => r.keyword === upperKeyword);
          if (exists) return;

          state.rules.push({
            ...rule,
            keyword: upperKeyword,
          });
        }),

      removeRule: (id) =>
        set((state) => {
          state.rules = state.rules.filter((r) => r.id !== id);
        }),

      setBankBalance: (balance) =>
        set((state) => {
          state.bankBalance = balance;
        }),

      setSavingsBuckets: (amount) =>
        set((state) => {
          state.savingsBuckets = amount;
        }),

      setHasSeenWelcome: (seen) =>
        set((state) => {
          state.hasSeenWelcome = seen;
        }),

      setLastBackupDate: (date) =>
        set((state) => {
          state.lastBackupDate = date;
        }),

      reset: () =>
        set((state) => ({
          ...initialState,
          _hasHydrated: state._hasHydrated,
        })),

      reapplyRules: async () => {
        const { transactions, rules } = get();
        if (transactions.length === 0) return;

        set((state) => {
          state.isAnalyzing = true;
        });

        try {
          const updatedTxns = await runCategorizationWorkflow(
            transactions,
            rules,
            {
              onUpdate: (txns) => {
                // Only update if something actually changed from the rules phase
                if (txns !== transactions) {
                  set((state) => {
                    state.transactions = txns;
                    state.recurringPatterns = detectRecurring(txns);
                  });
                }
              },
            },
          );

          set((state) => {
            state.transactions = updatedTxns;
            state.recurringPatterns = detectRecurring(updatedTxns);
            state.isAnalyzing = false;
          });
        } catch (error) {
          console.error("Analysis failed", error);
          set((state) => {
            state.isAnalyzing = false;
          });
        }
      },

      importState: (data) =>
        set((state) => {
          Object.assign(state, data);
          state.recurringPatterns = detectRecurring(state.transactions);
        }),

      exportState: () => {
        const {
          addTransactions,
          updateTransaction,
          deleteTransaction,
          addRule,
          removeRule,
          setBankBalance,
          setSavingsBuckets,
          setHasSeenWelcome,
          setLastBackupDate,
          reset,
          reapplyRules,
          importState,
          exportState,
          setHasHydrated,
          ...state
        } = get();
        return state as AppState;
      },
    })),
    {
      name: "true-north-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => {
          state?.setHasHydrated(true);
          // Recalculate patterns after hydration
          if (state) {
            useAppStore.setState({
              recurringPatterns: detectRecurring(state.transactions),
            });
          }
        };
      },
    },
  ),
);
