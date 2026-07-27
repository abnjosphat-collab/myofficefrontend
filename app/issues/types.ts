// app/issues/types.ts — the stock-issues page's data model: the spare/issue record
// shapes, the issue-form row shape, server stats, and the analytics time-series/stats
// shapes. Split out of page.tsx as part of the standing "decompose on touch" convention.
// Component *prop* interfaces stay in page.tsx — they're coupled to one component, not
// the page's data contract.

export interface Spare {
  id: number;
  stock_code: string;
  description: string;
  unit_of_measure?: string;
  unit_price: number;
  category?: string;
  current_quantity: number;
}

export interface IssueItemRow {
  id: string;
  stockCode: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
}

export interface IssueItem {
  stock_code?: string;
  description: string;
  qty: number;
  unit?: string;
  unit_price?: number;
}

export interface StockIssue {
  id: number;
  issued_at: string;
  recipient_name: string;
  recipient_id?: string;
  issued_by?: string;
  items: IssueItem[];
  notes?: string;
}

export interface Stats {
  total: number;
  today: number;
  this_week: number;
  unique_recipients: number;
}

export type Period = 'day' | 'week' | 'month';

export interface PeriodPoint {
  key: string;
  label: string;
  cost: number;
  count: number;
  costWithPrice: number;
  itemCount: number;
}

export interface DescStats {
  total: number;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  costed: number;
}
