// app/quotations/quotationLogic.ts — the rules behind the quotation generator that need no screen: the blank draft, line amounts and
// totals, what stops an export, the currencies and document themes, and reading a stored draft back safely. Pure, so each is tested
// without rendering. Nothing here is seeded: a new quotation starts with no company, client, lines, notes or terms.
import { lineTotal } from '@/components/shared/utils';
import { calculateTotals } from './calcQuotations';

export interface Line { id: number; description: string; quantity: string; rate: string }
export interface Party { name: string; company: string; email: string; phone: string; address: string; city: string; country: string }
export interface Company { name: string; tagline: string; email: string; phone: string; address: string; city: string; country: string; website: string; taxId: string; logo: string }
export interface Draft {
  number: string; date: string; validUntil: string; currency: string; taxRate: string; discount: string; paymentTerms: string; deliveryTime: string;
  theme: string; notes: string; terms: string; client: Party; lines: Line[];
}
export interface Saved { id: string; savedAt: string; draft: Draft }

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' }, { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' }, { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold' }, { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }, { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];
export const symbolOf = (code: string): string => CURRENCIES.find(c => c.code === code)?.symbol ?? code;
/** RGB for the PDF and a hex for the Word file and the on-screen swatch. */
export const THEMES = [
  { id: 'executive', name: 'Executive', rgb: [30, 64, 175] as [number, number, number], hex: '1E40AF' },
  { id: 'modern', name: 'Modern', rgb: [109, 40, 217] as [number, number, number], hex: '6D28D9' },
  { id: 'corporate', name: 'Corporate', rgb: [4, 120, 87] as [number, number, number], hex: '047857' },
  { id: 'luxury', name: 'Luxury', rgb: [153, 27, 27] as [number, number, number], hex: '991B1B' },
];
export const themeOf = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];
export const PAYMENT_TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 60'];
export const DELIVERY_TIMES = ['To be agreed', '1-2 weeks', '2-4 weeks', '4-6 weeks', '8+ weeks'];

export const blankParty = (): Party => ({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '' });
export const blankCompany = (): Company => ({ name: '', tagline: '', email: '', phone: '', address: '', city: '', country: '', website: '', taxId: '', logo: '' });
export const blankLine = (id: number): Line => ({ id, description: '', quantity: '1', rate: '0' });
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A new quotation: numbered from the date and time (QT-260930-1415), valid for 30 days, with nothing else filled in. */
export function blankDraft(now: Date): Draft {
  const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  return {
    number: `QT-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`, date: isoDay(now), validUntil: isoDay(valid),
    currency: 'USD', taxRate: '0', discount: '0', paymentTerms: 'Net 30', deliveryTime: 'To be agreed', theme: 'executive', notes: '', terms: '', client: blankParty(), lines: [blankLine(1)],
  };
}

const num = (v: string): number => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
export const amountOf = (l: Line): number => Math.round(lineTotal(num(l.quantity), num(l.rate)) * 100) / 100;
/** Totals as numbers, rounded once (calculateTotals rounds to cents). */
export function totalsOf(d: Pick<Draft, 'lines' | 'taxRate' | 'discount'>) {
  const t = calculateTotals(d.lines.map(l => ({ id: l.id, description: l.description, quantity: num(l.quantity), rate: num(l.rate), amount: amountOf(l), category: '' })), num(d.taxRate), num(d.discount));
  return { subtotal: Number(t.subtotal), tax: Number(t.taxAmount), discount: Number(t.discountAmount), total: Number(t.total) };
}
export const money = (n: number, code: string): string => `${symbolOf(code)}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Lines that count: a description and an amount. A line with neither is the empty one waiting to be filled. */
export const usedLines = (d: Pick<Draft, 'lines'>): Line[] => d.lines.filter(l => l.description.trim() || amountOf(l) !== 0);

/** What stops an export, in the order a person would fix it. */
export function problems(d: Draft): string[] {
  const out: string[] = [];
  if (!d.client.name.trim() && !d.client.company.trim()) out.push('Enter who the quotation is for (a client name or company).');
  const used = usedLines(d);
  if (used.length === 0) out.push('Add at least one line item.');
  d.lines.forEach((l, i) => { if (!l.description.trim() && amountOf(l) !== 0) out.push(`Line ${i + 1} has an amount but no description.`); if (l.description.trim() && num(l.quantity) <= 0) out.push(`Line ${i + 1} needs a quantity above zero.`); if (num(l.rate) < 0) out.push(`Line ${i + 1} has a negative rate.`); });
  if (num(d.taxRate) < 0 || num(d.taxRate) > 100) out.push('The tax rate must be between 0 and 100.');
  if (num(d.discount) < 0 || num(d.discount) > 100) out.push('The discount must be between 0 and 100.');
  if (d.validUntil && d.date && d.validUntil < d.date) out.push('The quotation expires before its date.');
  if (!d.number.trim()) out.push('Give the quotation a number.');
  return out;
}

export const fileNameOf = (d: Pick<Draft, 'number'>, ext: string): string => `quotation-${(d.number.trim() || 'draft').replace(/[^A-Za-z0-9._-]+/g, '-')}.${ext}`;
export const clientLabel = (c: Party): string => c.company.trim() || c.name.trim() || 'No client';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
/** Reads a stored draft back; anything that is not shaped like one is refused, so a corrupt entry falls back to a new quotation. */
export function readDraft(raw: unknown): Draft | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.lines) || !r.client || typeof r.client !== 'object') return undefined;
  const c = r.client as Record<string, unknown>;
  const lines = (r.lines as unknown[]).filter((l): l is Record<string, unknown> => !!l && typeof l === 'object').map((l, i) => ({ id: typeof l.id === 'number' ? l.id : i + 1, description: text(l.description), quantity: text(l.quantity) || '1', rate: text(l.rate) || '0' }));
  return {
    number: text(r.number), date: text(r.date), validUntil: text(r.validUntil), currency: CURRENCIES.some(x => x.code === r.currency) ? (r.currency as string) : 'USD', taxRate: text(r.taxRate) || '0', discount: text(r.discount) || '0',
    paymentTerms: text(r.paymentTerms) || 'Net 30', deliveryTime: text(r.deliveryTime) || 'To be agreed', theme: THEMES.some(t => t.id === r.theme) ? (r.theme as string) : 'executive', notes: text(r.notes), terms: text(r.terms),
    client: { name: text(c.name), company: text(c.company), email: text(c.email), phone: text(c.phone), address: text(c.address), city: text(c.city), country: text(c.country) }, lines: lines.length ? lines : [blankLine(1)],
  };
}
export const readSaved = (raw: unknown): Saved[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  return raw.flatMap(s => { const d = s && typeof s === 'object' ? readDraft((s as Record<string, unknown>).draft) : undefined; const o = s as Record<string, unknown>; return d ? [{ id: text(o.id) || d.number, savedAt: text(o.savedAt), draft: d }] : []; });
};
export const readCompany = (raw: unknown): Company | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  return { name: text(r.name), tagline: text(r.tagline), email: text(r.email), phone: text(r.phone), address: text(r.address), city: text(r.city), country: text(r.country), website: text(r.website), taxId: text(r.taxId), logo: /^data:image\/(png|jpe?g);base64,/.test(text(r.logo)) ? text(r.logo) : '' };
};
