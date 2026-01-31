import { Transaction, Rule, PayIDContact } from "../lib/store";

export const createTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => {
  return {
    id: Math.random().toString(36).substring(7),
    date: new Date().toISOString(),
    amount: -Math.floor(Math.random() * 100),
    description: "Test Transaction",
    category: "Uncategorized",
    isRecurring: false,
    ...overrides,
  };
};

export const createRule = (overrides: Partial<Rule> = {}): Rule => {
  return {
    id: Math.random().toString(36).substring(7),
    keyword: "TEST_KEYWORD",
    category: "Test Category",
    ...overrides,
  };
};

export const createPayIDContact = (
  overrides: Partial<PayIDContact> = {},
): PayIDContact => {
  return {
    id: Math.random().toString(36).substring(7),
    name: "Test Contact",
    payId: "test@example.com",
    type: "Email",
    ...overrides,
  };
};
