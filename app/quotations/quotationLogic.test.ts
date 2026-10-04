import { describe, expect, it } from 'vitest';
import { amountOf, blankDraft, clientLabel, fileNameOf, money, problems, readCompany, readDraft, readSaved, totalsOf, usedLines } from './quotationLogic';
import type { Draft } from './quotationLogic';

const base = (over: Partial<Draft> = {}): Draft => ({ ...blankDraft(new Date(2026, 8, 30, 14, 5)), client: { name: 'Ann', company: '', email: '', phone: '', address: '', city: '', country: '' }, lines: [{ id: 1, description: 'Pump seal kit', quantity: '2', rate: '12.5' }], ...over });

describe('a new quotation', () => {
  it('has a number from the date and time, a 30-day expiry, and nothing invented', () => {
    const d = blankDraft(new Date(2026, 8, 30, 14, 5));
    expect(d.number).toBe('QT-260930-1405');
    expect(d.date).toBe('2026-09-30'); expect(d.validUntil).toBe('2026-10-30');
    expect(d.client.name).toBe(''); expect(d.notes).toBe(''); expect(d.terms).toBe('');
    expect(d.lines).toHaveLength(1); expect(d.lines[0].description).toBe('');
  });
});
describe('amounts and totals', () => {
  it('works lines out from text and treats a blank or invalid number as zero', () => {
    expect(amountOf({ id: 1, description: '', quantity: '3', rate: '2.5' })).toBe(7.5);
    expect(amountOf({ id: 1, description: '', quantity: '', rate: 'x' })).toBe(0);
  });
  it('adds tax and takes off the discount, both as a share of the subtotal', () => {
    const t = totalsOf(base({ taxRate: '10', discount: '5', lines: [{ id: 1, description: 'a', quantity: '2', rate: '50' }] }));
    expect(t).toEqual({ subtotal: 100, tax: 10, discount: 5, total: 105 });
  });
  it('formats money with the currency symbol and two decimals', () => { expect(money(1234.5, 'USD')).toBe('$1,234.50'); expect(money(3, 'ZAR')).toBe('R3.00'); expect(money(3, 'XYZ')).toBe('XYZ3.00'); });
  it('counts only lines with a description or an amount', () => {
    expect(usedLines(base({ lines: [{ id: 1, description: '', quantity: '1', rate: '0' }, { id: 2, description: 'x', quantity: '1', rate: '0' }] }))).toHaveLength(1);
  });
});
describe('what stops an export', () => {
  it('passes a complete quotation', () => { expect(problems(base())).toEqual([]); });
  it('asks for a client, a line and a number', () => {
    const p = problems(base({ number: ' ', client: { name: '', company: '', email: '', phone: '', address: '', city: '', country: '' }, lines: [{ id: 1, description: '', quantity: '1', rate: '0' }] }));
    expect(p).toEqual(expect.arrayContaining([expect.stringMatching(/who the quotation is for/), 'Add at least one line item.', 'Give the quotation a number.']));
  });
  it('flags an amount without a description, a zero quantity, and out-of-range tax or discount', () => {
    const p = problems(base({ taxRate: '120', discount: '-1', lines: [{ id: 1, description: '', quantity: '1', rate: '5' }, { id: 2, description: 'x', quantity: '0', rate: '1' }] }));
    expect(p).toEqual(expect.arrayContaining(['Line 1 has an amount but no description.', 'Line 2 needs a quantity above zero.', 'The tax rate must be between 0 and 100.', 'The discount must be between 0 and 100.']));
  });
  it('flags an expiry before the date', () => { expect(problems(base({ validUntil: '2026-01-01' }))).toContain('The quotation expires before its date.'); });
});
describe('names and storage', () => {
  it('makes a safe file name', () => { expect(fileNameOf({ number: 'QT 26/09 #1' }, 'pdf')).toBe('quotation-QT-26-09-1.pdf'); expect(fileNameOf({ number: '' }, 'docx')).toBe('quotation-draft.docx'); });
  it('labels a client by company, then name', () => { expect(clientLabel({ name: 'Ann', company: 'Acme', email: '', phone: '', address: '', city: '', country: '' })).toBe('Acme'); expect(clientLabel({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '' })).toBe('No client'); });
  it('reads a stored draft back, and refuses anything else', () => {
    const d = base();
    expect(readDraft(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(readDraft({ lines: 'x' })).toBeUndefined(); expect(readDraft(null)).toBeUndefined();
    expect(readDraft({ ...d, currency: 'NOPE', theme: 'none' })).toMatchObject({ currency: 'USD', theme: 'executive' });
  });
  it('drops saved entries that are not drafts', () => { expect(readSaved([{ id: 'a', savedAt: 'now', draft: base() }, { id: 'b', draft: 5 }, 7])).toHaveLength(1); expect(readSaved('x')).toBeUndefined(); });
  it('accepts only PNG or JPEG data for the logo', () => { expect(readCompany({ name: 'A', logo: 'data:image/svg+xml;base64,AAA' })?.logo).toBe(''); expect(readCompany({ name: 'A', logo: 'data:image/png;base64,AAA' })?.logo).toContain('png'); });
});
