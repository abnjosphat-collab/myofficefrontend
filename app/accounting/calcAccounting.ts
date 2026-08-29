// app/accounting/calcAccounting.ts — the assets/liabilities net-worth calculation
// behind the accounting page, split out of page.tsx per the "extract + test business
// logic" standard (app/timesheets/calcTotals.ts precedent). Previously inline in
// page.tsx with no test coverage at all. (Profit/loss and revenue/expense totals are
// server-computed — Summary.profit_or_loss etc. — so there's no client-side
// equivalent for those to extract here.)
import type { FinAsset, FinLiability } from './types';

export interface NetWorth {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

export function calcNetWorth(assets: FinAsset[], liabilities: FinLiability[]): NetWorth {
  const assetsTotal = assets.reduce((sum, a) => sum + a.value, 0);
  const liabilitiesTotal = liabilities.reduce((sum, l) => sum + l.amount, 0);
  return { assetsTotal, liabilitiesTotal, netWorth: assetsTotal - liabilitiesTotal };
}
