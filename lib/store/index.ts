import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyRules, Category } from "../engine/rules";
import { analyzeBatch } from "../engine/llm";

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

export interface PayIDContact {
  id: string;
  name: string;
  payId: string;
  type: "Phone" | "Email" | "ABN";
}

export interface AppState {
  transactions: Transaction[];
  rules: Rule[];
  contacts: PayIDContact[];
  bankBalance: number;
  savingsBuckets: number;
  hasSeenWelcome: boolean;
  lastBackupDate: string | null;

  isAnalyzing: boolean;
}

export interface AppActions {
  addTransactions: (txns: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  addContact: (contact: PayIDContact) => void;
  removeContact: (id: string) => void;
  setBankBalance: (balance: number) => void;
  setSavingsBuckets: (amount: number) => void;
  setHasSeenWelcome: (seen: boolean) => void;
  setLastBackupDate: (date: string) => void;

  reset: () => void;
  reapplyRules: () => Promise<void>;
  importState: (data: Partial<AppState>) => void;
  exportState: () => AppState;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AppState = {
  transactions: [],
  rules: [],
  contacts: [],
  bankBalance: 0,
  savingsBuckets: 0,
  hasSeenWelcome: false,
  lastBackupDate: null,
  isAnalyzing: false,
};

// ============================================================================
// Store
// ============================================================================

export const useAppStore = create<AppState & AppActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      addTransactions: (txns) =>
        set((state) => {
          const existingIds = new Set(state.transactions.map((t) => t.id));
          const newTxns = txns.filter((t) => !existingIds.has(t.id));
          state.transactions.push(...newTxns);
          // Sort by date descending
          state.transactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        }),

      updateTransaction: (id, updates) =>
        set((state) => {
          const index = state.transactions.findIndex((t) => t.id === id);
          if (index !== -1) {
            const txn = state.transactions[index];
            Object.assign(txn, updates);
          }
        }),

      deleteTransaction: (id) =>
        set((state) => {
          state.transactions = state.transactions.filter((t) => t.id !== id);
        }),

      addRule: (rule) =>
        set((state) => {
          // Ensure keyword is uppercase
          state.rules.push({
            ...rule,
            keyword: rule.keyword.toUpperCase(),
          });
        }),

      removeRule: (id) =>
        set((state) => {
          state.rules = state.rules.filter((r) => r.id !== id);
        }),

      addContact: (contact) =>
        set((state) => {
          state.contacts.push(contact);
        }),

      removeContact: (id) =>
        set((state) => {
          state.contacts = state.contacts.filter((c) => c.id !== id);
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

      reset: () => set(initialState),

      reapplyRules: async () => {
        set((state) => {
          state.isAnalyzing = true;
        });

        try {
          const state = get();

          // 1. Apply explicit rules first (sync)
          let txns = applyRules(state.transactions, state.rules);
          set((state) => {
            state.transactions = txns;
          });

          // 2. Identify remaining Uncategorized for LLM
          const uncategorized = txns.filter(
            (t) => t.category === "Uncategorized",
          );

          if (uncategorized.length === 0) {
            set((state) => {
              state.isAnalyzing = false;
            });
            return;
          }

          // Analyze with LLM
          const results = await analyzeBatch(
            uncategorized,
            // (completed, total) => console.log(`Analyzed ${completed}/${total}`)
          );

          set((state) => {
            state.transactions.forEach((txn) => {
              if (results.has(txn.id)) {
                const analysis = results.get(txn.id)!;
                txn.category = analysis.category;

                // Also update other metadata if plausible
                if (analysis.isSubscription) txn.isRecurring = true;
                if (analysis.cleanMerchantName)
                  txn.merchantName = analysis.cleanMerchantName;
              }
            });
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
        }),

      exportState: () => {
        const {
          addTransactions,
          updateTransaction,
          deleteTransaction,
          addRule,
          removeRule,
          addContact,
          removeContact,
          setBankBalance,
          setSavingsBuckets,
          setHasSeenWelcome,
          setLastBackupDate,
          reset,
          reapplyRules,
          importState,
          exportState,
          ...state
        } = get();
        return state as AppState;
      },
    })),
    {
      name: "true-north-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
