// app/employees/import/parseWorkbook.test.ts — the Excel importer's browser side:
// parsing, header detection and column-mapping suggestions. Fixtures are
// workbooks built in-memory (no binary files): a wide register sheet with a
// title row, and a long issue-log sheet.
import { describe, expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import {
  MAX_IMPORT_ROWS, dataRows, detectHeaderRow, headerLabels,
  parseWorkbookData, suggestMapping, toServerMapping,
} from './parseWorkbook';

const TYPES = [
  { code: 'helmet', label: 'Hard hat' },
  { code: 'boots', label: 'Boots' },
];

const WIDE: unknown[][] = [
  ['MINING REGISTER OCTOBER 2025', '', '', '', '', '', ''],
  ['Mine No', 'Full Name', 'Job Title', 'Section', 'Hard hat', 'Size Helmet', 'Date Engaged'],
  ['M0001', 'MOYO Farai', 'Fitter', 'Mining', '10/03/2024', '10', '2021-06-01'],
  ['M0002', 'Tinashe Sibanda', 'Fitter', '', '', '', ''],
  ['M0003', 'Tendai Ncube', 'General Hand', '', 44947, '', ''],
];

const LONG: unknown[][] = [
  ['Mine No', 'Name', 'Item', 'Size', 'Issue Date'],
  ['M0004', 'SIBANDA Tinashe', 'HELMET', '58', '03/03/2024'],
  ['M0004', 'SIBANDA Tinashe', 'Dust mask', '', '04/03/2024'],
];

function workbookBytes(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) utils.book_append_sheet(wb, utils.aoa_to_sheet(aoa), name);
  return write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('parseWorkbookData', () => {
  it('parses every sheet into rows, keeping numbers and text as the sheet holds them', () => {
    const parsed = parseWorkbookData(workbookBytes({ Register: WIDE, Log: LONG }), 'mining.xlsx');
    expect(parsed.fileName).toBe('mining.xlsx');
    expect(parsed.sheets.map(s => s.name)).toEqual(['Register', 'Log']);
    const register = parsed.sheets[0].rows;
    expect(register[2][0]).toBe('M0001');
    expect(register[4][4]).toBe(44947);
  });

  it('refuses garbage that is not a workbook', () => {
    expect(() => parseWorkbookData(new ArrayBuffer(16), 'nope.xlsx')).toThrow();
  });
});

describe('header detection', () => {
  it('skips the title row and finds the header', () => {
    const parsed = parseWorkbookData(workbookBytes({ Register: WIDE }), 'mining.xlsx');
    expect(detectHeaderRow(parsed.sheets[0].rows)).toBe(1);
  });

  it('reads column labels from the header row and drops it from the sent rows', () => {
    const parsed = parseWorkbookData(workbookBytes({ Register: WIDE }), 'mining.xlsx');
    const rows = parsed.sheets[0].rows;
    expect(headerLabels(rows, 1)).toEqual(['Mine No', 'Full Name', 'Job Title', 'Section', 'Hard hat', 'Size Helmet', 'Date Engaged']);
    const sent = dataRows(rows, 1);
    expect(sent).toHaveLength(4);
    expect(sent[0][0]).toBe('MINING REGISTER OCTOBER 2025');
    expect(sent[1][0]).toBe('M0001');
  });

  it('falls back to the first row when nothing looks like a header', () => {
    expect(detectHeaderRow([['M0001']])).toBe(0);
  });
});

describe('suggestMapping', () => {
  it('maps a wide register: person fields, a PPE column with its label, and its size', () => {
    const mapping = suggestMapping(['Mine No', 'Full Name', 'Job Title', 'Section', 'Hard hat', 'Size Helmet', 'Date Engaged'], 'wide', TYPES);
    expect(mapping['0']).toBe('mine_number');
    expect(mapping['1']).toBe('full_name');
    expect(mapping['2']).toBe('job_title');
    expect(mapping['3']).toBe('section');
    expect(mapping['4']).toEqual({ target: 'ppe:helmet', label: 'Hard hat' });
    expect(mapping['5']).toEqual({ target: 'size:helmet' });
    expect(mapping['6']).toBe('date_engaged');
  });

  it('maps a long issue log: item text, size and issue date', () => {
    const mapping = suggestMapping(['Mine No', 'Name', 'Item', 'Size', 'Issue Date'], 'long', TYPES);
    expect(mapping).toEqual({ 0: 'mine_number', 1: 'full_name', 2: 'item_text', 3: 'size', 4: 'issue_date' });
  });

  it('ignores columns it does not recognise, and never repeats a single-use target', () => {
    const mapping = suggestMapping(['Mine No', 'Name', 'Name again', 'Notes'], 'long', TYPES);
    expect(mapping['1']).toBe('full_name');
    expect(mapping['2']).toBe('ignore');
    expect(mapping['3']).toBe('ignore');
  });

  it('sends only mapped columns to the server', () => {
    expect(toServerMapping({ 0: 'mine_number', 1: 'ignore', 4: { target: 'ppe:helmet', label: 'Hard hat' } }))
      .toEqual({ 0: 'mine_number', 4: { target: 'ppe:helmet', label: 'Hard hat' } });
  });
});

describe('import limits', () => {
  it('caps the rows the browser will send', () => {
    expect(MAX_IMPORT_ROWS).toBe(20000);
  });
});
