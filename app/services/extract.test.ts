import { describe, expect, it } from 'vitest';
import { fileMode, ocrToRecord, parseExcelDate, rowToRecord } from './extract';

describe('parseExcelDate', () => {
  it('reads a spreadsheet date by its UTC fields, so the day never shifts', () => {
    expect(parseExcelDate(new Date(Date.UTC(2026, 8, 5)))).toBe('2026-09-05');
  });
  it('reads text dates day-first and passes anything else through', () => {
    expect(parseExcelDate('5/9/26')).toBe('2026-09-05');
    expect(parseExcelDate('05-09-2026')).toBe('2026-09-05');
    expect(parseExcelDate('2026-09-05')).toBe('2026-09-05');
    expect(parseExcelDate('soon')).toBe('soon');
  });
});

describe('fileMode', () => {
  it('sends spreadsheets to the browser and everything else to OCR', () => {
    expect(fileMode('Tracker.XLSX')).toBe('spreadsheet');
    expect(fileMode('scan.pdf')).toBe('document');
    expect(fileMode('noext')).toBe('document');
  });
});

describe('rowToRecord', () => {
  it('maps headers, stage ticks and the GRV number', () => {
    const r = rowToRecord({ 'Task Description': 'Pump overhaul', Contractor: ' Acme ', 'PR#': 'R1', 'PO#': 'P1', Date: '5/9/2026', Planning: 'TRUE', 'Eng. Mgr': 'TRUE', Finance: 'FALSE', 'GRV#': 'G9', Unknown: 'x' })!;
    expect(r).toMatchObject({ description: 'Pump overhaul', supplier: 'Acme', requisition_number: 'R1', order_number: 'P1', date: '2026-09-05' });
    expect(r.planning.signed).toBe(true);
    expect(r.engineering_manager.signed).toBe(true); // the sheet view's own "Eng. Mgr" header must import back in
    expect(r.finance.signed).toBe(false);
    expect(r.stores.grv_number).toBe('G9');
  });
  it('skips a row that has neither a description nor a supplier', () => {
    expect(rowToRecord({ Date: '5/9/2026', Amount: '10' })).toBeNull();
  });
});

describe('ocrToRecord', () => {
  it('fills what the scan found and leaves the rest empty, including the date', () => {
    const r = ocrToRecord({ description: 'Valve service', supplier: 'Acme', grv_number: 'G1', payment_reference: null, date: null });
    expect(r).toMatchObject({ description: 'Valve service', supplier: 'Acme', date: '', invoice_number: '' });
    expect(r.stores.grv_number).toBe('G1');
    expect(r.payment.payment_reference).toBe('');
  });
});
