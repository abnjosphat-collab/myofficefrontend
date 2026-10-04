// app/quotations/QuotationPreview.tsx — the quotation as the client will read it: company, who it is for, the lines with their
// amounts, the totals, and the notes and terms. It is built from the same draft and the same rules as the PDF and Word files, so
// what is on screen is what is exported. The document colour follows the chosen theme.
'use client';

import { fmtDate } from '@/components/shared/utils';
import { Logo } from './QuotationPanels';
import { amountOf, money, themeOf, totalsOf, usedLines, type Company, type Draft } from './quotationLogic';

const place = (c: { address: string; city: string; country: string }) => [c.address, c.city, c.country].filter(Boolean).join(', ');

export function QuotationPreview({ draft: d, company }: { draft: Draft; company: Company }) {
  const theme = themeOf(d.theme);
  const accent = { color: `#${theme.hex}` };
  const totals = totalsOf(d);
  const who = [d.client.name, d.client.company, d.client.email, d.client.phone, place(d.client)].filter(Boolean);
  const lines = usedLines(d);
  return (
    <article aria-label="Quotation preview" className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex min-w-0 items-start gap-4">
          {company.logo && <Logo src={company.logo} alt="" className="size-16 shrink-0 object-contain" />}
          <div className="min-w-0">
            <h2 className="font-display text-title font-semibold text-ink [overflow-wrap:anywhere]" style={accent}>{company.name || <span className="text-ink-muted">Your company name</span>}</h2>
            {company.tagline && <p className="font-sans text-body-sm text-ink-muted">{company.tagline}</p>}
            {[[company.email, company.phone].filter(Boolean).join('  ·  '), place(company), company.taxId ? `Tax ID ${company.taxId}` : ''].filter(Boolean).map(l => <p key={l} className="font-sans text-caption text-ink-muted">{l}</p>)}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-section font-semibold tracking-wide" style={accent}>QUOTATION</p>
          <p className="font-sans text-body-sm font-semibold text-ink tabular">{d.number}</p>
          <p className="font-sans text-caption text-ink-muted">Date {d.date ? fmtDate(d.date) : 'not set'}</p>
          {d.validUntil && <p className="font-sans text-caption text-ink-muted">Valid until {fmtDate(d.validUntil)}</p>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section aria-label="For"><h3 className="font-sans text-label font-semibold text-ink">For</h3>{who.length ? who.map(l => <p key={l} className="font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{l}</p>) : <p className="font-sans text-body-sm text-ink-muted">No client yet</p>}</section>
        <section aria-label="Terms"><h3 className="font-sans text-label font-semibold text-ink">Terms</h3><p className="font-sans text-body-sm text-ink">Payment: {d.paymentTerms}</p><p className="font-sans text-body-sm text-ink">Delivery: {d.deliveryTime}</p></section>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse font-sans text-body-sm">
          <caption className="sr-only">Quotation lines</caption>
          <thead><tr className="border-b-2" style={{ borderColor: `#${theme.hex}` }}><th scope="col" className="py-2 pr-3 text-left font-semibold text-ink">Description</th><th scope="col" className="px-3 py-2 text-right font-semibold text-ink">Qty</th><th scope="col" className="px-3 py-2 text-right font-semibold text-ink">Rate</th><th scope="col" className="py-2 pl-3 text-right font-semibold text-ink">Amount</th></tr></thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={4} className="py-4 text-ink-muted">No line items yet.</td></tr>}
            {lines.map(l => <tr key={l.id} className="border-b border-line-subtle"><td className="py-2 pr-3 text-ink [overflow-wrap:anywhere]">{l.description}</td><td className="px-3 py-2 text-right tabular">{l.quantity}</td><td className="px-3 py-2 text-right tabular">{money(Number(l.rate) || 0, d.currency)}</td><td className="py-2 pl-3 text-right font-medium tabular">{money(amountOf(l), d.currency)}</td></tr>)}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 font-sans text-body-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="tabular">{money(totals.subtotal, d.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Tax ({Number(d.taxRate) || 0}%)</dt><dd className="tabular">{money(totals.tax, d.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Discount ({Number(d.discount) || 0}%)</dt><dd className="tabular">-{money(totals.discount, d.currency)}</dd></div>
        <div className="mt-1 flex justify-between border-t border-line pt-2 font-display text-title font-semibold text-ink"><dt>Total</dt><dd className="tabular" style={accent}>{money(totals.total, d.currency)}</dd></div>
      </dl>

      {(d.notes.trim() || d.terms.trim()) && (
        <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
          {d.notes.trim() && <section aria-label="Notes"><h3 className="font-sans text-label font-semibold text-ink">Notes</h3><p className="whitespace-pre-line font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{d.notes}</p></section>}
          {d.terms.trim() && <section aria-label="Terms and conditions"><h3 className="font-sans text-label font-semibold text-ink">Terms and conditions</h3><p className="whitespace-pre-line font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{d.terms}</p></section>}
        </div>
      )}
    </article>
  );
}
