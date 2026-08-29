// app/accounting/page.tsx — Finance & Accounting: sales transactions with PDF
// receipts, expenses, automatic profit/loss, and an assets/liabilities register.
// Manager+ only — hidden from the nav (components/app-shell/modules.ts's
// `minRole`) and rejected server-side (the whole /api/accounting router is
// gated in main.py); this page guard is defense-in-depth #2, same pattern as
// app/admin/page.tsx.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import {
  useTheme, accentText, PageHero, StatTile, GlowCard, ACCENT_HEX, PrimaryButton, FormField,
  SelectField, EmptyState,
} from '@/components/shared/theme';
import {
  Wallet, Receipt, CreditCard, Scale, TrendingUp, TrendingDown,
  Plus, Download, Trash2, Edit, Check, X, LineChart as LineChartGlyph,
} from '@/components/shared/theme';
import { PillTabs, type PillTab } from '@/components/shared/PillTabs';
import { UnderlineTabs, type UnderlineTab } from '@/components/shared/UnderlineTabs';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { formatCurrency, fmtDate } from '@/components/shared/utils';
import { EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import { useAccountingData, txApi, expenseApi, assetApi, liabilityApi } from './useAccountingData';
import { calcNetWorth } from './calcAccounting';
import type { Transaction, Expense, FinAsset, FinLiability } from './types';

const EXPENSE_CATEGORY_SEEDS = ['Subscriptions', 'Equipment', 'Utilities', 'Rent', 'Marketing', 'Other'];
const ASSET_CATEGORY_SEEDS = ['Equipment', 'Cash & Bank', 'Receivables', 'Property', 'Investments', 'Other'];
const LIABILITY_CATEGORY_SEEDS = ['Loan', 'Credit Card', 'Accounts Payable', 'Tax Payable', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Money'];
const PIE_COLORS = [ACCENT_HEX.violet, ACCENT_HEX.blue, ACCENT_HEX.emerald, ACCENT_HEX.amber, ACCENT_HEX.cyan, '#f43f5e'];

// A proper single-item invoice/receipt layout instead of a flat label:value
// list — letterhead band, a bordered details panel, a real line-item table
// (jspdf-autotable, same brand styling DownloadButton's PDF export already
// uses), a right-aligned total in a shaded box, and a muted footer.
async function generateReceiptPdf(tx: Transaction) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const marginX = 18;

  // ── Letterhead ──────────────────────────────────────────────────────────
  doc.setFillColor(...EXPORT_BRAND_RGB);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('OZECH', marginX, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MyOffice — Business Services', marginX, 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('RECEIPT', pageWidth - marginX, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(tx.receiptNumber, pageWidth - marginX, 24, { align: 'right' });

  // ── Details panel (billed-to / date) ────────────────────────────────────
  let y = 48;
  doc.setTextColor(140, 148, 158); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', marginX, y);
  doc.text('DATE', pageWidth - marginX, y, { align: 'right' });
  y += 6;
  doc.setTextColor(30, 41, 59); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text(tx.clientName || 'Walk-in client', marginX, y);
  doc.text(fmtDate(tx.transactionDate), pageWidth - marginX, y, { align: 'right' });
  y += 12;

  doc.setDrawColor(220, 226, 234); doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ── Line item ────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: [[
      tx.description ? `${tx.serviceType}\n${tx.description}` : tx.serviceType,
      formatCurrency(tx.amount),
    ]],
    styles: { font: 'helvetica', fontSize: 10, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, valign: 'top' },
    headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    margin: { left: marginX, right: marginX },
    tableLineColor: [220, 226, 234], tableLineWidth: 0.1,
  });

  // ── Total box ────────────────────────────────────────────────────────────
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const boxW = 70, boxX = pageWidth - marginX - boxW;
  doc.setFillColor(237, 243, 248);
  doc.roundedRect(boxX, afterTable, boxW, 16, 2, 2, 'F');
  doc.setTextColor(...EXPORT_BRAND_RGB); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TOTAL PAID', boxX + 5, afterTable + 6.5);
  doc.setFontSize(13);
  doc.text(formatCurrency(tx.amount), boxX + boxW - 5, afterTable + 12, { align: 'right' });

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = 275;
  doc.setDrawColor(230, 235, 240); doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(100, 110, 122);
  doc.text('Thank you for your business.', marginX, footerY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 168, 178);
  doc.text(`Generated ${fmtDate(new Date().toISOString())} · Ozech MyOffice`, pageWidth - marginX, footerY, { align: 'right' });

  doc.save(`receipt-${tx.receiptNumber}.pdf`);
  toast.success('Receipt downloaded');
}

const inputCls = (t: ReturnType<typeof useTheme>) =>
  `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

type AccountingTab = 'overview' | 'transactions' | 'assets';
type TransactionSubTab = 'income' | 'expenses';

function AccountingContent() {
  const t = useTheme();
  const { profile, loading: authLoading, isAtLeast } = useAuth();
  const router = useRouter();
  const cls = inputCls(t);

  const data = useAccountingData();
  const [tab, setTab] = useState<AccountingTab>('overview');

  // Defense-in-depth #2 — the nav hides the tile and the backend router rejects
  // the API for anyone below manager, but a direct URL visit still needs this.
  useEffect(() => {
    if (!authLoading && profile && !isAtLeast('manager')) router.replace('/');
  }, [authLoading, profile, isAtLeast, router]);

  if (authLoading || !profile) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <div className={`h-8 w-8 border-2 ${t.border} border-t-emerald-500 rounded-full animate-spin`} />
      </main>
    );
  }
  if (!isAtLeast('manager')) return null;

  const TABS: PillTab<AccountingTab>[] = [
    { key: 'overview', label: 'Overview', icon: LineChartGlyph },
    { key: 'transactions', label: 'Transactions', icon: Receipt, count: data.transactions.length + data.expenses.length },
    { key: 'assets', label: 'Assets & Liabilities', icon: Scale },
  ];

  const s = data.summary;
  const profitPositive = (s?.profit_or_loss ?? 0) >= 0;
  const netWorthPositive = (s?.net_worth ?? 0) >= 0;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHero
        icon={Wallet} accent="emerald"
        crumbs={['Finance & Accounting', 'Accounting']}
        title="Accounting"
        description="Transactions, expenses, receipts and profit/loss"
        actions={
          <div className="flex items-center gap-2">
            <input type="date" value={data.dateFrom} onChange={e => data.setDateFrom(e.target.value)} className={`${cls} w-36`} />
            <span className={`text-xs ${t.textFaint}`}>to</span>
            <input type="date" value={data.dateTo} onChange={e => data.setDateTo(e.target.value)} className={`${cls} w-36`} />
          </div>
        }
      />

      <PillTabs tabs={TABS} value={tab} onChange={setTab} wrap="wrap" />

      {data.loading ? (
        <div className="flex justify-center py-20">
          <div className={`h-8 w-8 border-2 ${t.border} border-t-emerald-500 rounded-full animate-spin`} />
        </div>
      ) : tab === 'overview' ? (
        <OverviewTab data={data} profitPositive={profitPositive} netWorthPositive={netWorthPositive} />
      ) : tab === 'transactions' ? (
        <TransactionsParentTab data={data} />
      ) : (
        <AssetsLiabilitiesTab data={data} />
      )}
    </main>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────────

function OverviewTab({ data, profitPositive, netWorthPositive }: {
  data: ReturnType<typeof useAccountingData>; profitPositive: boolean; netWorthPositive: boolean;
}) {
  const t = useTheme();
  const s = data.summary;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlowCard color={ACCENT_HEX.emerald} className="p-4">
          <p className={`text-[11px] ${t.textFaint} mb-1`}>Revenue</p>
          <p className={`text-xl font-bold ${t.textPrimary}`}>{formatCurrency(s?.revenue ?? 0)}</p>
        </GlowCard>
        <GlowCard color={ACCENT_HEX.amber} className="p-4">
          <p className={`text-[11px] ${t.textFaint} mb-1`}>Expenses</p>
          <p className={`text-xl font-bold ${t.textPrimary}`}>{formatCurrency(s?.expenses ?? 0)}</p>
        </GlowCard>
        <GlowCard color={profitPositive ? ACCENT_HEX.emerald : '#f43f5e'} className="p-4">
          <p className={`text-[11px] ${t.textFaint} mb-1 flex items-center gap-1`}>
            {profitPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {profitPositive ? 'Profit' : 'Loss'}
          </p>
          <p className="text-xl font-bold" style={{ color: profitPositive ? '#34d399' : '#f87171' }}>
            {formatCurrency(Math.abs(s?.profit_or_loss ?? 0))}
          </p>
          <p className={`text-[10px] mt-0.5 ${t.textFaint}`}>
            {(s?.revenue ?? 0) === 0 && (s?.expenses ?? 0) === 0
              ? 'No activity yet'
              : profitPositive ? 'You made a profit this period' : 'You made a loss this period'}
          </p>
        </GlowCard>
        <GlowCard color={netWorthPositive ? ACCENT_HEX.blue : '#f43f5e'} className="p-4">
          <p className={`text-[11px] ${t.textFaint} mb-1`}>Net Worth</p>
          <p className="text-xl font-bold" style={{ color: netWorthPositive ? undefined : '#f87171' }}>
            {formatCurrency(s?.net_worth ?? 0)}
          </p>
        </GlowCard>
      </div>

      <GlowCard color={ACCENT_HEX.blue} surface={`${t.glass} rounded-2xl`} className="p-4">
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Monthly Trend</p>
        <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={240} minWidth={320}>
            <LineChart data={data.trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke={ACCENT_HEX.emerald} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke={ACCENT_HEX.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke={ACCENT_HEX.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlowCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlowCard color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Expenses by Category</p>
          {data.expensesByCategory.length === 0 ? <EmptyState icon={CreditCard} title="No expenses recorded yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.expensesByCategory as unknown as Record<string, unknown>[]} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => entry.category ?? ''}>
                  {data.expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlowCard>

        <GlowCard color={ACCENT_HEX.cyan} surface={`${t.glass} rounded-2xl`} className="p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Revenue by Service</p>
          {data.revenueByService.length === 0 ? <EmptyState icon={Receipt} title="No transactions recorded yet" /> : (
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={280}>
                <BarChart data={data.revenueByService} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="service_type" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill={ACCENT_HEX.cyan} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlowCard>
      </div>
    </div>
  );
}

// ─── Transactions (Income / Expenses sub-tabs) ─────────────────────────────

function TransactionsParentTab({ data }: { data: ReturnType<typeof useAccountingData> }) {
  const t = useTheme();
  const [sub, setSub] = useState<TransactionSubTab>('income');
  const SUB_TABS: UnderlineTab<TransactionSubTab>[] = [
    { id: 'income', label: `Income (${data.transactions.length})` },
    { id: 'expenses', label: `Expenses (${data.expenses.length})` },
  ];
  return (
    <div className={`${t.glass} rounded-2xl overflow-hidden`}>
      <UnderlineTabs tabs={SUB_TABS} value={sub} onChange={setSub} accent="emerald" />
      <div className="p-4">
        {sub === 'income' ? <TransactionsTab data={data} /> : <ExpensesTab data={data} />}
      </div>
    </div>
  );
}

const emptyTxForm = () => ({ transactionDate: new Date().toISOString().slice(0, 10), serviceType: '', clientName: '', description: '', amount: '' });

function TransactionsTab({ data }: { data: ReturnType<typeof useAccountingData> }) {
  const t = useTheme();
  const cls = inputCls(t);
  const [form, setForm] = useState(emptyTxForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const runningTotal = data.transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({ transactionDate: tx.transactionDate, serviceType: tx.serviceType, clientName: tx.clientName, description: tx.description, amount: String(tx.amount) });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyTxForm()); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceType.trim() || !form.amount) { toast.error('Service and amount are required'); return; }
    setSaving(true);
    try {
      const payload = {
        transaction_date: form.transactionDate, service_type: form.serviceType,
        client_name: form.clientName || undefined, description: form.description || undefined,
        amount: parseFloat(form.amount),
      };
      if (editingId) {
        const updated = await txApi.update(editingId, payload);
        data.setTransactions(prev => prev.map(x => x.id === editingId ? updated : x));
        toast.success('Transaction updated');
        cancelEdit();
      } else {
        const created = await txApi.create(payload);
        data.setTransactions(prev => [created, ...prev]);
        setForm(emptyTxForm());
        toast.success(`Recorded — receipt ${created.receiptNumber}`);
      }
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await txApi.delete(id);
      data.setTransactions(prev => prev.filter(x => x.id !== id));
      if (editingId === id) cancelEdit();
      toast.success('Transaction removed');
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
  };

  const columns: DLColumn[] = [
    { key: 'transactionDate', label: 'Date', format: v => fmtDate(v as string) },
    { key: 'receiptNumber', label: 'Receipt #' },
    { key: 'serviceType', label: 'Service' },
    { key: 'clientName', label: 'Client' },
    { key: 'amount', label: 'Amount', format: v => formatCurrency(v as number) },
  ];

  return (
    <div className="space-y-4">
      <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <FormField label="Date"><input type="date" value={form.transactionDate} onChange={e => setForm({ ...form, transactionDate: e.target.value })} className={cls} /></FormField>
          <FormField label="Service" required>
            <PredictiveInput historyKey="acc_service_type" value={form.serviceType} onChange={v => setForm({ ...form, serviceType: v })} placeholder="e.g. Website Build" />
          </FormField>
          <FormField label="Client"><PredictiveInput historyKey="acc_client_name" value={form.clientName} onChange={v => setForm({ ...form, clientName: v })} placeholder="Optional" /></FormField>
          <FormField label="Amount" required><input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={cls} placeholder="0.00" /></FormField>
          <div className="flex gap-2">
            <PrimaryButton type="submit" icon={editingId ? Check : Plus} accent="emerald" submitting={saving} fullWidth>{editingId ? 'Save' : 'Add'}</PrimaryButton>
            {editingId && (
              <button type="button" onClick={cancelEdit} title="Cancel edit" className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><X className="h-4 w-4" /></button>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <PredictiveInput historyKey="acc_tx_description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Description (optional)" />
          </div>
        </form>
      </GlowCard>

      <div className="flex items-center justify-between">
        <span className={`text-sm ${t.textFaint}`}>Running total: <span className={`font-semibold ${t.textPrimary}`}>{formatCurrency(runningTotal)}</span></span>
        <DownloadButton data={data.transactions as unknown as Record<string, unknown>[]} columns={columns} filename="transactions" title="Transactions" />
      </div>

      {data.transactions.length === 0 ? <EmptyState icon={Receipt} title="No transactions recorded yet" /> : (
        <div className="space-y-1.5">
          {data.transactions.map(tx => (
            <div key={tx.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${editingId === tx.id ? 'ring-1 ring-emerald-500/40 bg-emerald-500/5' : t.glassSoft}`}>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${t.textPrimary}`}>{tx.serviceType}{tx.clientName ? ` — ${tx.clientName}` : ''}</p>
                <p className={`text-[11px] ${t.textFaint}`}>{fmtDate(tx.transactionDate)} · {tx.receiptNumber}</p>
              </div>
              <span className={`text-sm font-semibold ${t.textPrimary}`}>{formatCurrency(tx.amount)}</span>
              <button type="button" onClick={() => generateReceiptPdf(tx)} title="Download Receipt" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><Download className="h-4 w-4" /></button>
              <button type="button" onClick={() => startEdit(tx)} title="Edit" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><Edit className="h-4 w-4" /></button>
              <button type="button" onClick={() => handleDelete(tx.id)} title="Delete" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} ${t.hoverBg}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Expenses ───────────────────────────────────────────────────────────────

const emptyExpenseForm = () => ({ expenseDate: new Date().toISOString().slice(0, 10), category: '', vendor: '', description: '', amount: '', paymentMethod: '' });

function ExpensesTab({ data }: { data: ReturnType<typeof useAccountingData> }) {
  const t = useTheme();
  const cls = inputCls(t);
  const [form, setForm] = useState(emptyExpenseForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const runningTotal = data.expenses.reduce((sum, e) => sum + e.amount, 0);

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setForm({ expenseDate: exp.expenseDate, category: exp.category, vendor: exp.vendor, description: exp.description, amount: String(exp.amount), paymentMethod: exp.paymentMethod });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyExpenseForm()); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category.trim() || !form.amount) { toast.error('Category and amount are required'); return; }
    setSaving(true);
    try {
      const payload = {
        expense_date: form.expenseDate, category: form.category, vendor: form.vendor || undefined,
        description: form.description || undefined, amount: parseFloat(form.amount), payment_method: form.paymentMethod || undefined,
      };
      if (editingId) {
        const updated = await expenseApi.update(editingId, payload);
        data.setExpenses(prev => prev.map(x => x.id === editingId ? updated : x));
        toast.success('Expense updated');
        cancelEdit();
      } else {
        const created = await expenseApi.create(payload);
        data.setExpenses(prev => [created, ...prev]);
        setForm(emptyExpenseForm());
        toast.success('Expense recorded');
      }
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await expenseApi.delete(id);
      data.setExpenses(prev => prev.filter(x => x.id !== id));
      if (editingId === id) cancelEdit();
      toast.success('Expense removed');
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
  };

  const columns: DLColumn[] = [
    { key: 'expenseDate', label: 'Date', format: v => fmtDate(v as string) },
    { key: 'category', label: 'Category' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'amount', label: 'Amount', format: v => formatCurrency(v as number) },
  ];

  return (
    <div className="space-y-4">
      <GlowCard color={ACCENT_HEX.amber} surface={`${t.glass} rounded-2xl`} className="p-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <FormField label="Date"><input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} className={cls} /></FormField>
          <FormField label="Category" required><PredictiveInput historyKey="acc_expense_category" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="e.g. Subscriptions" hints={EXPENSE_CATEGORY_SEEDS} /></FormField>
          <FormField label="Vendor"><PredictiveInput historyKey="acc_vendor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Optional" /></FormField>
          <FormField label="Amount" required><input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={cls} placeholder="0.00" /></FormField>
          <FormField label="Payment"><SelectField value={form.paymentMethod} onChange={v => setForm({ ...form, paymentMethod: v })} options={PAYMENT_METHODS} placeholder="Method" /></FormField>
          <div className="sm:col-span-2 lg:col-span-4">
            <PredictiveInput historyKey="acc_expense_description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Description (optional)" />
          </div>
          <div className="flex gap-2">
            <PrimaryButton type="submit" icon={editingId ? Check : Plus} accent="amber" submitting={saving} fullWidth>{editingId ? 'Save' : 'Add'}</PrimaryButton>
            {editingId && (
              <button type="button" onClick={cancelEdit} title="Cancel edit" className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><X className="h-4 w-4" /></button>
            )}
          </div>
        </form>
      </GlowCard>

      <div className="flex items-center justify-between">
        <span className={`text-sm ${t.textFaint}`}>Running total: <span className={`font-semibold ${t.textPrimary}`}>{formatCurrency(runningTotal)}</span></span>
        <DownloadButton data={data.expenses as unknown as Record<string, unknown>[]} columns={columns} filename="expenses" title="Expenses" />
      </div>

      {data.expenses.length === 0 ? <EmptyState icon={CreditCard} title="No expenses recorded yet" /> : (
        <div className="space-y-1.5">
          {data.expenses.map(exp => (
            <div key={exp.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${editingId === exp.id ? 'ring-1 ring-amber-500/40 bg-amber-500/5' : t.glassSoft}`}>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${t.textPrimary}`}>{exp.category}{exp.vendor ? ` — ${exp.vendor}` : ''}</p>
                <p className={`text-[11px] ${t.textFaint}`}>{fmtDate(exp.expenseDate)}{exp.paymentMethod ? ` · ${exp.paymentMethod}` : ''}</p>
              </div>
              <span className={`text-sm font-semibold ${t.textPrimary}`}>{formatCurrency(exp.amount)}</span>
              <button type="button" onClick={() => startEdit(exp)} title="Edit" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><Edit className="h-4 w-4" /></button>
              <button type="button" onClick={() => handleDelete(exp.id)} title="Delete" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} ${t.hoverBg}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assets & Liabilities ───────────────────────────────────────────────────

function AssetsLiabilitiesTab({ data }: { data: ReturnType<typeof useAccountingData> }) {
  const t = useTheme();
  const cls = inputCls(t);
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [assetForm, setAssetForm] = useState({ name: '', category: '', value: '' });
  const [liabilityForm, setLiabilityForm] = useState({ name: '', category: '', dueDate: '', amount: '' });
  const [savingAsset, setSavingAsset] = useState(false);
  const [savingLiability, setSavingLiability] = useState(false);

  const { assetsTotal, liabilitiesTotal, netWorth } = calcNetWorth(data.assets, data.liabilities);

  const addAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name.trim() || !assetForm.category.trim()) { toast.error('Name and category are required'); return; }
    setSavingAsset(true);
    try {
      const created = await assetApi.create({ name: assetForm.name, category: assetForm.category, value: parseFloat(assetForm.value || '0') });
      data.setAssets(prev => [...prev, created]);
      setAssetForm({ name: '', category: '', value: '' });
      toast.success('Asset added');
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
    finally { setSavingAsset(false); }
  };

  const addLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabilityForm.name.trim() || !liabilityForm.category.trim()) { toast.error('Name and category are required'); return; }
    setSavingLiability(true);
    try {
      const created = await liabilityApi.create({ name: liabilityForm.name, category: liabilityForm.category, due_date: liabilityForm.dueDate || undefined, amount: parseFloat(liabilityForm.amount || '0') });
      data.setLiabilities(prev => [...prev, created]);
      setLiabilityForm({ name: '', category: '', dueDate: '', amount: '' });
      toast.success('Liability added');
    } catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
    finally { setSavingLiability(false); }
  };

  const removeAsset = async (id: string) => {
    try { await assetApi.delete(id); data.setAssets(prev => prev.filter(x => x.id !== id)); }
    catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
  };
  const removeLiability = async (id: string) => {
    try { await liabilityApi.delete(id); data.setLiabilities(prev => prev.filter(x => x.id !== id)); }
    catch (err) { toast.error(`Failed: ${(err as Error).message}`); }
  };

  return (
    <div className="space-y-4">
      <GlowCard color={netWorth >= 0 ? ACCENT_HEX.blue : '#f43f5e'} className="p-4 flex items-center justify-between">
        <span className={`text-sm font-medium ${t.textMuted}`}>Net Worth (Assets − Liabilities)</span>
        <span className="text-xl font-bold" style={{ color: netWorth >= 0 ? undefined : '#f87171' }}>{formatCurrency(netWorth)}</span>
      </GlowCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-4 space-y-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Assets · {formatCurrency(assetsTotal)}</p>
          <form onSubmit={addAsset} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <PredictiveInput historyKey="acc_asset_name" value={assetForm.name} onChange={v => setAssetForm({ ...assetForm, name: v })} placeholder="Name" />
            <SelectField value={assetForm.category} onChange={v => setAssetForm({ ...assetForm, category: v })} options={ASSET_CATEGORY_SEEDS} placeholder="Category" />
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0" value={assetForm.value} onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} className={cls} placeholder="Value" />
              <PrimaryButton type="submit" icon={Plus} accent="emerald" submitting={savingAsset}>Add</PrimaryButton>
            </div>
          </form>
          {data.assets.length === 0 ? <EmptyState icon={Wallet} title="No assets recorded yet" /> : (
            <div className="space-y-1">
              {data.assets.map(a => (
                <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${t.glassSoft}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${t.textPrimary}`}>{a.name}</p>
                    <p className={`text-[10px] ${t.textFaint}`}>{a.category}</p>
                  </div>
                  <span className={`text-sm font-medium ${t.textPrimary}`}>{formatCurrency(a.value)}</span>
                  <button type="button" onClick={() => removeAsset(a.id)} className={`h-7 w-7 flex items-center justify-center rounded ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </GlowCard>

        <GlowCard color="#f43f5e" surface={`${t.glass} rounded-2xl`} className="p-4 space-y-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Liabilities · {formatCurrency(liabilitiesTotal)}</p>
          <form onSubmit={addLiability} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
            <PredictiveInput historyKey="acc_liability_name" value={liabilityForm.name} onChange={v => setLiabilityForm({ ...liabilityForm, name: v })} placeholder="Name" />
            <SelectField value={liabilityForm.category} onChange={v => setLiabilityForm({ ...liabilityForm, category: v })} options={LIABILITY_CATEGORY_SEEDS} placeholder="Category" />
            <input type="date" value={liabilityForm.dueDate} onChange={e => setLiabilityForm({ ...liabilityForm, dueDate: e.target.value })} className={cls} />
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0" value={liabilityForm.amount} onChange={e => setLiabilityForm({ ...liabilityForm, amount: e.target.value })} className={cls} placeholder="Amount" />
              <PrimaryButton type="submit" icon={Plus} accent="violet" submitting={savingLiability}>Add</PrimaryButton>
            </div>
          </form>
          {data.liabilities.length === 0 ? <EmptyState icon={Scale} title="No liabilities recorded yet" /> : (
            <div className="space-y-1">
              {data.liabilities.map(l => {
                const dueSoon = !!l.dueDate && l.dueDate <= in30Days && l.dueDate >= today;
                const overdue = !!l.dueDate && l.dueDate < today;
                return (
                  <div key={l.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${overdue ? 'bg-rose-500/10' : dueSoon ? 'bg-amber-500/10' : t.glassSoft}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${t.textPrimary}`}>{l.name}</p>
                      <p className={`text-[10px] ${overdue ? accentText('rose', t.light) : dueSoon ? accentText('amber', t.light) : t.textFaint}`}>
                        {l.category}{l.dueDate ? ` · due ${fmtDate(l.dueDate)}${overdue ? ' (overdue)' : dueSoon ? ' (soon)' : ''}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${t.textPrimary}`}>{formatCurrency(l.amount)}</span>
                    <button type="button" onClick={() => removeLiability(l.id)} className={`h-7 w-7 flex items-center justify-center rounded ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </GlowCard>
      </div>
    </div>
  );
}

export default function AccountingPage() {
  return <AppShell><AccountingContent /></AppShell>;
}
