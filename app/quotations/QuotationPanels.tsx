// app/quotations/QuotationPanels.tsx — the fields of a quotation in four panels: your company (kept in this browser, with a logo for
// the document), the client, the quotation's own details (number, dates, currency, tax, discount, terms, document colour) and the
// line items. Every number is typed as text and read once by the rules in quotationLogic, so a half-typed value is never rewritten.
'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button, Field, IconButton, Input, Segmented, Select, Textarea } from '@/components/ui-system';
import { DELIVERY_TIMES, CURRENCIES, PAYMENT_TERMS, THEMES, amountOf, blankLine, money, type Company, type Draft, type Line, type Party } from './quotationLogic';

export function Section({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 id={id} className="font-display text-title font-semibold text-ink">{title}</h2>{description && <p className="font-sans text-body-sm text-ink-muted">{description}</p>}</div>{actions}</div>
      {children}
    </section>
  );
}

const LOGO_MAX = 300 * 1024;
/** The logo is a data URL kept in this browser, so it is shown as it is rather than through the image optimiser. */
export function Logo({ src, alt, className }: { src: string; alt: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
export function CompanyPanel({ company, onChange }: { company: Company; onChange: (c: Company) => void }) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const set = (patch: Partial<Company>) => onChange({ ...company, ...patch });
  const pickLogo = (file?: File) => {
    setLogoError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) { setLogoError('Use a PNG or JPEG image.'); return; }
    if (file.size > LOGO_MAX) { setLogoError('The logo is over 300 KB. Use a smaller image.'); return; }
    const reader = new FileReader();
    reader.onload = () => set({ logo: typeof reader.result === 'string' ? reader.result : '' });
    reader.onerror = () => setLogoError('The logo could not be read.');
    reader.readAsDataURL(file);
  };
  return (
    <Section title="Your company" description="Printed at the top of the quotation. Kept in this browser, so you type it once.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2"><Input value={company.name} onChange={e => set({ name: e.target.value })} autoComplete="organization" /></Field>
        <Field label="Tagline" optional className="sm:col-span-2"><Input value={company.tagline} onChange={e => set({ tagline: e.target.value })} /></Field>
        <Field label="Email" optional><Input type="email" value={company.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Phone" optional><Input value={company.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Address" optional className="sm:col-span-2"><Input value={company.address} onChange={e => set({ address: e.target.value })} /></Field>
        <Field label="City" optional><Input value={company.city} onChange={e => set({ city: e.target.value })} /></Field>
        <Field label="Country" optional><Input value={company.country} onChange={e => set({ country: e.target.value })} /></Field>
        <Field label="Website" optional><Input value={company.website} onChange={e => set({ website: e.target.value })} /></Field>
        <Field label="Tax ID" optional><Input value={company.taxId} onChange={e => set({ taxId: e.target.value })} /></Field>
        <Field label="Logo" optional description="PNG or JPEG, up to 300 KB." error={logoError ?? undefined} className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            {company.logo && <Logo src={company.logo} alt="Your logo" className="size-12 rounded-control border border-line object-contain" />}
            <Input type="file" accept="image/png,image/jpeg" onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
            {company.logo && <Button variant="ghost" icon="delete" onClick={() => set({ logo: '' })}>Remove logo</Button>}
          </div>
        </Field>
      </div>
    </Section>
  );
}

export function ClientPanel({ client, onChange, recent }: { client: Party; onChange: (c: Party) => void; recent: { label: string; party: Party }[] }) {
  const set = (patch: Partial<Party>) => onChange({ ...client, ...patch });
  return (
    <Section title="Who it is for" description="A name or a company is enough to export.">
      {recent.length > 0 && (
        <div role="group" aria-label="Clients from saved quotations" className="flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-caption text-ink-muted">From your saved quotations:</span>
          {recent.map(r => <Button key={r.label} size="sm" variant="secondary" onClick={() => onChange(r.party)}>{r.label}</Button>)}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Client name"><Input value={client.name} onChange={e => set({ name: e.target.value })} autoComplete="off" /></Field>
        <Field label="Company" optional><Input value={client.company} onChange={e => set({ company: e.target.value })} autoComplete="off" /></Field>
        <Field label="Email" optional><Input type="email" value={client.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Phone" optional><Input value={client.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Address" optional className="sm:col-span-2"><Input value={client.address} onChange={e => set({ address: e.target.value })} /></Field>
        <Field label="City" optional><Input value={client.city} onChange={e => set({ city: e.target.value })} /></Field>
        <Field label="Country" optional><Input value={client.country} onChange={e => set({ country: e.target.value })} /></Field>
      </div>
    </Section>
  );
}

export function DetailsPanel({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <Section title="The quotation">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Quotation number" className="sm:col-span-2"><Input value={draft.number} onChange={e => onChange({ number: e.target.value })} /></Field>
        <Field label="Date"><Input type="date" value={draft.date} onChange={e => onChange({ date: e.target.value })} /></Field>
        <Field label="Valid until"><Input type="date" value={draft.validUntil} onChange={e => onChange({ validUntil: e.target.value })} /></Field>
        <Field label="Currency"><Select aria-label="Currency" value={draft.currency} onValueChange={v => onChange({ currency: v })} options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax (%)"><Input type="number" min={0} max={100} step="any" value={draft.taxRate} onChange={e => onChange({ taxRate: e.target.value })} /></Field>
          <Field label="Discount (%)"><Input type="number" min={0} max={100} step="any" value={draft.discount} onChange={e => onChange({ discount: e.target.value })} /></Field>
        </div>
        <Field label="Payment terms"><Select aria-label="Payment terms" value={draft.paymentTerms} onValueChange={v => onChange({ paymentTerms: v })} options={PAYMENT_TERMS.map(v => ({ value: v, label: v }))} /></Field>
        <Field label="Delivery"><Select aria-label="Delivery" value={draft.deliveryTime} onValueChange={v => onChange({ deliveryTime: v })} options={DELIVERY_TIMES.map(v => ({ value: v, label: v }))} /></Field>
        <div className="sm:col-span-2"><Segmented label="Document colour" value={draft.theme} onValueChange={v => onChange({ theme: v })} options={THEMES.map(t => ({ value: t.id, label: t.name }))} /></div>
      </div>
    </Section>
  );
}

export function LineItems({ lines, currency, onChange }: { lines: Line[]; currency: string; onChange: (lines: Line[]) => void }) {
  const set = (id: number, patch: Partial<Line>) => onChange(lines.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const add = () => onChange([...lines, blankLine(Math.max(0, ...lines.map(l => l.id)) + 1)]);
  return (
    <Section title="Line items" description="Quantity times rate gives each amount." actions={<Button icon="plus" onClick={add}>Add a line</Button>}>
      <div className="hidden grid-cols-[1fr_6rem_8rem_8rem_2.25rem] gap-2 font-sans text-caption text-ink-muted md:grid" aria-hidden><span>Description</span><span>Quantity</span><span>Rate</span><span className="text-right">Amount</span><span /></div>
      <ul className="flex flex-col gap-3" aria-label="Line items">
        {lines.map((l, i) => (
          <li key={l.id} className="grid grid-cols-2 items-center gap-2 rounded-control border border-line bg-surface-subtle p-3 md:grid-cols-[1fr_6rem_8rem_8rem_2.25rem] md:border-0 md:bg-transparent md:p-0">
            <Input className="col-span-2 md:col-span-1" aria-label={`Line ${i + 1} description`} placeholder="What is being quoted" value={l.description} onChange={e => set(l.id, { description: e.target.value })} />
            <Input aria-label={`Line ${i + 1} quantity`} type="number" min={0} step="any" value={l.quantity} onChange={e => set(l.id, { quantity: e.target.value })} />
            <Input aria-label={`Line ${i + 1} rate`} type="number" min={0} step="any" value={l.rate} onChange={e => set(l.id, { rate: e.target.value })} />
            <p className="col-span-1 text-right font-sans text-body font-semibold tabular text-ink md:col-span-1" aria-label={`Line ${i + 1} amount`}>{money(amountOf(l), currency)}</p>
            <IconButton icon="delete" size="sm" variant="ghost" label={`Remove line ${i + 1}`} disabled={lines.length === 1 && !l.description && l.rate === '0'} onClick={() => onChange(lines.length === 1 ? [blankLine(l.id)] : lines.filter(x => x.id !== l.id))} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function TextPanels({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="Notes" description="Shown to the client under the totals."><Field label="Notes" optional><Textarea rows={4} value={draft.notes} onChange={e => onChange({ notes: e.target.value })} placeholder="Scope, assumptions, thanks" /></Field></Section>
      <Section title="Terms and conditions"><Field label="Terms and conditions" optional><Textarea rows={4} value={draft.terms} onChange={e => onChange({ terms: e.target.value })} placeholder="Payment, delivery, validity" /></Field></Section>
    </div>
  );
}
