// app/accounting/types.ts — data-model interfaces only (the page's actual data
// contract). Component prop interfaces stay in page.tsx.

export interface Transaction {
  id: string;
  transactionDate: string;
  receiptNumber: string;
  serviceType: string;
  description: string;
  clientName: string;
  amount: number;
  notes: string;
}

export interface Expense {
  id: string;
  expenseDate: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
  notes: string;
}

export interface FinAsset {
  id: string;
  name: string;
  category: string;
  acquiredDate: string;
  value: number;
  notes: string;
}

export interface FinLiability {
  id: string;
  name: string;
  category: string;
  dueDate: string;
  amount: number;
  notes: string;
}

export interface Summary {
  revenue: number;
  expenses: number;
  profit_or_loss: number;
  transaction_count: number;
  expense_count: number;
  assets_total: number;
  liabilities_total: number;
  net_worth: number;
}

export interface TrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface ServiceTotal {
  service_type: string;
  total: number;
}
