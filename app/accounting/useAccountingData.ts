// app/accounting/useAccountingData.ts — the accounting page's data-fetching layer:
// backend<->frontend shape converters, per-resource CRUD, and a hook owning all
// four resources' state plus the shared date-range filter. Multiple independent-
// ish resources but one shared load cycle (they're all driven by the same date
// range and refreshed together), so — unlike maintenance's fully-independent
// resources — a single Promise.all-based load() fits here, same shape as ppe's
// usePPEData.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Transaction, Expense, FinAsset, FinLiability, Summary, TrendPoint, CategoryTotal, ServiceTotal } from './types';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v);
  return entries.length ? `?${new URLSearchParams(entries as [string, string][]).toString()}` : '';
}

function txFromBackend(d: Record<string, unknown>): Transaction {
  return {
    id: String(d.id),
    transactionDate: String(d.transaction_date ?? ''),
    receiptNumber: String(d.receipt_number ?? ''),
    serviceType: String(d.service_type ?? ''),
    description: String(d.description ?? ''),
    clientName: String(d.client_name ?? ''),
    amount: Number(d.amount ?? 0),
    notes: String(d.notes ?? ''),
  };
}
function expenseFromBackend(d: Record<string, unknown>): Expense {
  return {
    id: String(d.id),
    expenseDate: String(d.expense_date ?? ''),
    category: String(d.category ?? ''),
    vendor: String(d.vendor ?? ''),
    description: String(d.description ?? ''),
    amount: Number(d.amount ?? 0),
    paymentMethod: String(d.payment_method ?? ''),
    notes: String(d.notes ?? ''),
  };
}
function assetFromBackend(d: Record<string, unknown>): FinAsset {
  return {
    id: String(d.id),
    name: String(d.name ?? ''),
    category: String(d.category ?? ''),
    acquiredDate: String(d.acquired_date ?? ''),
    value: Number(d.value ?? 0),
    notes: String(d.notes ?? ''),
  };
}
function liabilityFromBackend(d: Record<string, unknown>): FinLiability {
  return {
    id: String(d.id),
    name: String(d.name ?? ''),
    category: String(d.category ?? ''),
    dueDate: String(d.due_date ?? ''),
    amount: Number(d.amount ?? 0),
    notes: String(d.notes ?? ''),
  };
}

export const txApi = {
  create: (body: object) => api.post<Record<string, unknown>>('/api/accounting/transactions', body).then(txFromBackend),
  update: (id: string, body: object) => api.patch<Record<string, unknown>>(`/api/accounting/transactions/${id}`, body).then(txFromBackend),
  delete: (id: string) => api.delete(`/api/accounting/transactions/${id}`),
};
export const expenseApi = {
  create: (body: object) => api.post<Record<string, unknown>>('/api/accounting/expenses', body).then(expenseFromBackend),
  update: (id: string, body: object) => api.patch<Record<string, unknown>>(`/api/accounting/expenses/${id}`, body).then(expenseFromBackend),
  delete: (id: string) => api.delete(`/api/accounting/expenses/${id}`),
};
export const assetApi = {
  create: (body: object) => api.post<Record<string, unknown>>('/api/accounting/assets', body).then(assetFromBackend),
  update: (id: string, body: object) => api.patch<Record<string, unknown>>(`/api/accounting/assets/${id}`, body).then(assetFromBackend),
  delete: (id: string) => api.delete(`/api/accounting/assets/${id}`),
};
export const liabilityApi = {
  create: (body: object) => api.post<Record<string, unknown>>('/api/accounting/liabilities', body).then(liabilityFromBackend),
  update: (id: string, body: object) => api.patch<Record<string, unknown>>(`/api/accounting/liabilities/${id}`, body).then(liabilityFromBackend),
  delete: (id: string) => api.delete(`/api/accounting/liabilities/${id}`),
};

export function useAccountingData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<FinAsset[]>([]);
  const [liabilities, setLiabilities] = useState<FinLiability[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryTotal[]>([]);
  const [revenueByService, setRevenueByService] = useState<ServiceTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const range = qs({ date_from: dateFrom, date_to: dateTo });
      const [tx, exp, ast, lia, sum, trendData, expByCat, revByService] = await Promise.all([
        api.get<unknown[]>(`/api/accounting/transactions${range}`).then(rows => rows.map(r => txFromBackend(r as Record<string, unknown>))),
        api.get<unknown[]>('/api/accounting/expenses').then(rows => rows.map(r => expenseFromBackend(r as Record<string, unknown>))),
        api.get<unknown[]>('/api/accounting/assets').then(rows => rows.map(r => assetFromBackend(r as Record<string, unknown>))),
        api.get<unknown[]>('/api/accounting/liabilities').then(rows => rows.map(r => liabilityFromBackend(r as Record<string, unknown>))),
        api.get<Summary>(`/api/accounting/summary${range}`),
        api.get<TrendPoint[]>('/api/accounting/trend?months=12'),
        api.get<CategoryTotal[]>(`/api/accounting/breakdown/expenses-by-category${range}`),
        api.get<ServiceTotal[]>(`/api/accounting/breakdown/revenue-by-service${range}`),
      ]);
      setTransactions(tx); setExpenses(exp); setAssets(ast); setLiabilities(lia);
      setSummary(sum); setTrend(trendData); setExpensesByCategory(expByCat); setRevenueByService(revByService);
    } catch (e) {
      toast.error(`Load failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return {
    transactions, setTransactions, expenses, setExpenses, assets, setAssets, liabilities, setLiabilities,
    summary, trend, expensesByCategory, revenueByService,
    loading, refresh: load, dateFrom, setDateFrom, dateTo, setDateTo,
  };
}
