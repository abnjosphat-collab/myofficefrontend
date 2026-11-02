import { describe, expect, it, vi } from 'vitest';
import { allocationRegisterTable, findingsTable, inspectionChecklistTable, setDefinitionTable } from './setExportTables';

const saved: Record<string, Blob> = {};
vi.mock('file-saver', () => ({
  saveAs: (blob: Blob, name: string) => { saved[name] = blob; },
}));

const LINES = [
  { line_no: 1, name: 'Slotted screwdriver', size: 'SL6.5 × 38 mm', qty: 1, notes: null },
  { line_no: 2, name: 'Screw', size: 'ST4', qty: 10, notes: null },
];

describe('setDefinitionTable', () => {
  it('lists every line and totals the printed pieces', () => {
    const table = setDefinitionTable('Total 228 Piece Hand Tools Set (SET-228)', LINES);
    expect(table.rows).toHaveLength(2);
    expect(table.subtitle).toContain('2 lines · 11 printed pieces');
  });
});

describe('allocationRegisterTable', () => {
  it('counts issued sets and keeps custodian identity', () => {
    const table = allocationRegisterTable('SET-228', [
      { register_number: 'SET-01', custodian_name: 'David Muronda', custodian_number: 'C1001', department: 'Mining', location: 'Shaft store', status: 'issued', issued_at: '2026-11-05' },
      { register_number: 'SET-02', department: 'Mining', location: 'Store', status: 'available' },
    ]);
    expect(table.subtitle).toContain('2 sets · 1 issued');
    expect(table.rows[0]).toContain('C1001');
    expect(table.rows[1][1]).toBe('');
  });
});

describe('inspectionChecklistTable', () => {
  it('gives every piece write-in columns and a sign-off row', () => {
    const table = inspectionChecklistTable('SET-228', 'SET-01', 'David Muronda', LINES);
    expect(table.headers).toEqual(['Line', 'Item', 'Size', 'Expected', 'Present', 'Missing', 'Damaged', 'Notes']);
    expect(table.rows).toHaveLength(4);
    expect(table.rows[0]).toEqual([1, 'Slotted screwdriver', 'SL6.5 × 38 mm', 1, '', '', '', '']);
    expect(table.rows[3][0]).toBe('Inspected by');
  });
});

describe('set workbooks through the real exporter', () => {
  it('builds four non-empty xlsx files', async () => {
    const { exportTable } = await import('./toolsExports');
    await exportTable('xlsx', setDefinitionTable('SET-228', LINES));
    await exportTable('xlsx', allocationRegisterTable('SET-228', [{
      register_number: 'SET-01', custodian_name: 'David Muronda', custodian_number: 'C1001',
      department: 'Mining', location: 'Shaft store', status: 'issued', issued_at: '2026-11-05',
    }]));
    await exportTable('xlsx', inspectionChecklistTable('SET-228', 'SET-01', 'David Muronda', LINES));
    await exportTable('xlsx', findingsTable('SET-228', []));
    const names = Object.keys(saved).sort();
    expect(names).toEqual([
      'set-228-allocation-register.xlsx',
      'set-228-inspection-checklist-set-01.xlsx',
      'set-228-set-definition.xlsx',
      'set-228-unresolved-findings.xlsx',
    ]);
    for (const name of names) {
      const bytes = Buffer.from(await saved[name].arrayBuffer());
      expect(bytes.subarray(0, 2).toString()).toBe('PK');
      expect(bytes.length).toBeGreaterThan(4000);
    }
  }, 60000);
});

describe('findingsTable', () => {
  it('lists only unresolved pieces and stays empty when all are good', () => {
    const sets = [{
      register_number: 'SET-01', custodian_name: 'David Muronda', status: 'issued',
      pieces: [
        { piece_number: 'SET-01/001', name: 'Spanner 13mm', size: '13', condition: 'Good', status: 'present' },
        { piece_number: 'SET-01/002', name: 'Spanner 14mm', size: '14', condition: 'Good', status: 'missing' },
        { piece_number: 'SET-01/003', name: 'Torque wrench', size: null, condition: 'Damaged', status: 'present' },
      ],
    }];
    const table = findingsTable('SET-228', sets);
    expect(table.subtitle).toContain('2 unresolved pieces');
    expect(table.rows.map(r => r[2])).toEqual(['SET-01/002', 'SET-01/003']);
    expect(findingsTable('SET-228', [{
      register_number: 'SET-02', status: 'available',
      pieces: [{ piece_number: 'SET-02/001', name: 'Spanner', size: null, condition: 'Good', status: 'present' }],
    }]).rows).toHaveLength(0);
  });
});
