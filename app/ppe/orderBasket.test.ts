import { describe, expect, it } from 'vitest';
import { addableInWindow, addableSoon, buildBasket, coveredRecordIds, dueNow, excludedRecordIds, exclusionId, freeLineId, weekWindow, type BasketRegister } from './orderBasket';
import type { OrderListEntry } from './calcPPE';
import type { PPERecord } from './types';

const TODAY = '2026-10-22';
const register: BasketRegister = { known: new Set(['C100', 'C200', 'C500']), archived: new Set(['C500']) };

function rec(id: string, over: Partial<PPERecord> = {}): PPERecord {
  return {
    id, employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', department: '',
    ppe_type: 'safety_shoes', item_name: 'Boots', size: '8', issue_date: '2026-01-10',
    expiry_date: '2026-10-01', condition: 'good', status: 'active', notes: '', issued_by: '',
    location: '', mine_section: '',
    ...over,
  };
}

function line(id: string, over: Partial<OrderListEntry> = {}): OrderListEntry {
  return { record_id: id, employee_id: 'C100', employee_name: 'Ann Alpha', ppe_type: 'safety_shoes', item_name: 'Boots', size: '8', expiry_date: '2026-10-01', ...over };
}

describe('dueNow', () => {
  it('takes active on-register records expired on or before today', () => {
    expect(dueNow([rec('1'), rec('2', { expiry_date: TODAY })], register, TODAY).map(r => r.id)).toEqual(['1', '2']);
  });
  it('leaves future, dateless, inactive, off-register and archived records out', () => {
    const rows = [
      rec('future', { expiry_date: '2026-12-01' }),
      rec('dateless', { expiry_date: null }),
      rec('returned', { status: 'returned' }),
      rec('off-register', { employee_id: 'C999' }),
      rec('archived', { employee_id: 'C500' }),
    ];
    expect(dueNow(rows, register, TODAY)).toEqual([]);
  });
  it('matches ids the way the register does (case and spacing do not matter)', () => {
    expect(dueNow([rec('1', { employee_id: ' c100 ' })], register, TODAY).map(r => r.id)).toEqual(['1']);
  });
});

describe('buildBasket', () => {
  const REG = register;
  it('builds automatic lines from due-now records', () => {
    const b = buildBasket([rec('1'), rec('2', { expiry_date: '2027-01-01' })], [], REG, TODAY);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0]).toMatchObject({ record_id: '1', origin: 'auto', kind: 'line', qty: 1, employee_name: 'Ann Alpha' });
    expect(b.counts).toEqual({ auto: 1, manual: 0, free: 0, excluded: 0 });
    expect(b.twins).toEqual([]);
    expect(b.notDueLegacy).toEqual([]);
  });
  it('an exclusion shuts its record out, and a renewal (new expiry) breaks the pair so the line returns', () => {
    const shut = [line(exclusionId('1', '2026-10-01'), { kind: 'excluded' })];
    expect(buildBasket([rec('1')], shut, REG, TODAY).lines).toEqual([]);
    expect(buildBasket([rec('1')], shut, REG, TODAY).counts.excluded).toBe(1);
    expect(buildBasket([rec('1', { expiry_date: '2027-01-01' })], shut, REG, TODAY).lines).toEqual([]);
    expect(buildBasket([rec('1', { expiry_date: TODAY })], shut, REG, TODAY).lines.map(l => l.record_id)).toEqual(['1']);
  });
  it('stored manual lines keep their shape and become manual lines', () => {
    const b = buildBasket([], [line('9', { kind: 'line', qty: 3, note: 'wide fit' })], REG, TODAY);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0]).toMatchObject({ record_id: '9', origin: 'manual', qty: 3, note: 'wide fit' });
    expect(b.counts.manual).toBe(1);
  });
  it('a kind-less (legacy) line reads as manual', () => {
    const b = buildBasket([], [line('9')], REG, TODAY);
    expect(b.lines[0]).toMatchObject({ origin: 'manual', kind: 'line', qty: 1 });
  });
  it('a manual line for an automatic record is a twin: banner-only, never a line, never counted', () => {
    const stored = [line('1', { kind: 'line' }), line('1b', {})];
    const b = buildBasket([rec('1')], [...stored, line('1', {})], REG, TODAY);
    expect(b.twins.map(t => t.record_id)).toEqual(['1', '1']);
    expect(b.lines.map(l => l.record_id)).toEqual(['1', '1b']);
    expect(b.lines[0].origin).toBe('auto');
    expect(b.counts).toEqual({ auto: 1, manual: 1, free: 0, excluded: 0 });
  });
  it('kind-less lines outside the automatic set land in the tidy banner (gone, back in date, or off the register alike)', () => {
    const stored = [line('gone'), line('2', { expiry_date: '2027-01-01' }), line('3')];
    const b = buildBasket([rec('1'), rec('2', { expiry_date: '2027-01-01' })], stored, REG, TODAY);
    expect(b.notDueLegacy.map(e => e.record_id).sort()).toEqual(['2', '3', 'gone']);
    // ...but they still show as manual lines until the banner is acted on
    expect(b.lines.filter(l => l.origin === 'manual').map(l => l.record_id).sort()).toEqual(['2', '3', 'gone']);
  });
  it('free lines pass through untouched', () => {
    const b = buildBasket([], [line('free:abc', { kind: 'free', employee_id: '', employee_name: '', qty: 5 })], REG, TODAY);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0]).toMatchObject({ origin: 'free', qty: 5 });
    expect(b.counts.free).toBe(1);
  });
  it('a manual line for an excluded record stands (an explicit flag beats the automatic shut-out)', () => {
    const stored = [line(exclusionId('1', '2026-10-01'), { kind: 'excluded' }), line('1', { kind: 'line' })];
    const b = buildBasket([rec('1')], stored, REG, TODAY);
    expect(b.lines.map(l => l.record_id)).toEqual(['1']);
    expect(b.lines[0].origin).toBe('manual');
    expect(b.twins).toEqual([]);
  });
});

describe('coveredRecordIds / excludedRecordIds', () => {
  it('covers automatic and manual lines, never free lines', () => {
    const b = buildBasket([rec('1')], [line('2', { kind: 'line' }), line('free:x', { kind: 'free', employee_id: '' })], register, TODAY);
    expect([...coveredRecordIds(b)].sort()).toEqual(['1', '2']);
  });
  it('parses record ids out of exclusions and skips anything else', () => {
    expect([...excludedRecordIds([line('x:7:2026-10-01', { kind: 'excluded' }), line('x:9:', { kind: 'excluded' }), line('nope', { kind: 'excluded' })])].sort()).toEqual(['7', '9']);
  });
});

describe('freeLineId', () => {
  it('makes free-line ids the server accepts, different every time', () => {
    const a = freeLineId();
    expect(a).toMatch(/^free:[0-9a-f-]{36}$/);
    expect(freeLineId()).not.toBe(a);
  });
});

describe('weekWindow', () => {
  it('finds the Monday–Sunday week for a weekday, a Monday and a Sunday', () => {
    expect(weekWindow('2026-10-21', 0)).toEqual({ from: '2026-10-19', to: '2026-10-25' }); // Wed
    expect(weekWindow('2026-10-19', 0)).toEqual({ from: '2026-10-19', to: '2026-10-25' }); // Mon
    expect(weekWindow('2026-10-25', 0)).toEqual({ from: '2026-10-19', to: '2026-10-25' }); // Sun
  });
  it('offsets whole weeks and crosses the year end', () => {
    expect(weekWindow('2026-10-21', 1)).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(weekWindow('2026-12-31', 0)).toEqual({ from: '2026-12-28', to: '2027-01-03' }); // Thu
    expect(weekWindow('2026-12-31', 1)).toEqual({ from: '2027-01-04', to: '2027-01-10' });
  });
});

describe('addableInWindow / addableSoon', () => {
  const rows = () => [
    rec('1', { expiry_date: '2026-10-20' }),
    rec('2', { expiry_date: '2026-10-24' }),
    rec('3', { expiry_date: '2026-11-20' }),
    rec('4', { expiry_date: '2026-10-22', status: 'returned' }),
    rec('5', { expiry_date: '2026-10-22', employee_id: 'C999' }),
    rec('6', { expiry_date: '2026-10-22', employee_id: 'C500' }),
  ];
  it('offers in-window on-register actives, oldest first', () => {
    expect(addableInWindow(rows(), register, new Set(), new Set(), '2026-10-19', '2026-10-25').map(r => r.id)).toEqual(['1', '2']);
  });
  it('skips covered and excluded records', () => {
    const out = addableInWindow(rows(), register, new Set(['1']), new Set(['2']), '2026-10-19', '2026-10-25');
    expect(out).toEqual([]);
  });
  it('addableSoon covers [today, today+30]', () => {
    expect(addableSoon(rows(), register, new Set(), new Set(), TODAY).map(r => r.id)).toEqual(['2', '3']);
  });
});
