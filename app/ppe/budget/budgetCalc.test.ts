// app/ppe/budget/budgetCalc.test.ts — the worked examples from the Batch 3 prompt, plus the failure modes:
// unknown types listed not dropped, gaps, sizes, buffer rounding, lines without a price.
import { describe, expect, it } from 'vitest';
import {
  calculateBudget,
  monthIndexOf,
  type BudgetCalendar,
  type BudgetInput,
  type BudgetPerson,
  type BudgetRecord,
  type BudgetSettings,
} from './budgetCalc';

const MONTHS = [20, 20, 21, 22, 20, 22, 22, 20, 21, 21, 22, 22];
const WEEKS = [4, 4, 5, 4, 5, 4, 4, 5, 4, 4, 5, 4];

function calendar(year = 2027): BudgetCalendar {
  return {
    year,
    months: MONTHS.map((working_days, i) => ({ month: i + 1, working_days, weeks: WEEKS[i], holidays: [] })),
    total_working_days: MONTHS.reduce((a, b) => a + b, 0),
    total_weeks: WEEKS.reduce((a, b) => a + b, 0),
  };
}

function person(id: string, over: Partial<BudgetPerson> = {}): BudgetPerson {
  return { id, name: `Person ${id}`, department: 'Engineering', section: 'Mechanical', title: 'Fitter', active: true, ...over };
}

function record(employee_id: string, ppe_type: string, issue_date: string, over: Partial<BudgetRecord> = {}): BudgetRecord {
  return { employee_id, employee_name: `Person ${employee_id}`, ppe_type, size: '', issue_date, status: 'active', ...over };
}

function everyoneLine(key: string, item: string, rule: BudgetSettings['lines'][number]['rule'], qty: number, price: number | null = 10): BudgetSettings['lines'][number] {
  return { key, item, rule, qty_per_person: qty, who: { kind: 'everyone', sections: [], text: '' }, unit_price: price, buffer_pct: 0 };
}

function settings(over: Partial<BudgetSettings> = {}): BudgetSettings {
  return {
    lines: [],
    confirmed: { count: 0, start_month: 1, boilermakers: 0 },
    provisional: { count: 0, start_month: 1, boilermakers: 0 },
    starter_kit: [],
    add_gaps_in_january: false,
    show_provisional: true,
    ...over,
  };
}

function input(over: Partial<BudgetInput> = {}): BudgetInput {
  return { people: [], records: [], matrix: {}, calendar: calendar(), settings: settings(), dataDate: '2026-10-30', ...over };
}

const lineByKey = (result: ReturnType<typeof calculateBudget>, key: string) =>
  result.lines.find(l => l.key === key)!;

// ─── worked examples ─────────────────────────────────────────────────────────

describe('consumables', () => {
  it('76 + 10 people × 21 working days of dust masks in a sample month', () => {
    const people = Array.from({ length: 76 }, (_, i) => person(`C${i + 1}`));
    const result = calculateBudget(input({
      people,
      settings: settings({
        lines: [everyoneLine('dust_masks', 'Dust masks', 'per_working_day', 1, 2)],
        confirmed: { count: 5, start_month: 1, boilermakers: 0 },
        provisional: { count: 5, start_month: 1, boilermakers: 0 },
      }),
    }));
    const line = lineByKey(result, 'dust_masks');
    // March: 21 working days, 76 staff + 10 starters all started in January.
    expect(line.months[2].qty).toBe(86 * 21);
    expect(line.months[2].cost).toBe(86 * 21 * 2);
    expect(line.months[2].qtyBase).toBe(81 * 21);
  });

  it('starters count only from their start month', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      settings: settings({
        lines: [everyoneLine('dust_masks', 'Dust masks', 'per_working_day', 1, 1)],
        confirmed: { count: 2, start_month: 3, boilermakers: 0 },
      }),
    }));
    const line = lineByKey(result, 'dust_masks');
    expect(line.months[0].qty).toBe(1 * MONTHS[0]);
    expect(line.months[2].qty).toBe(3 * MONTHS[2]);
  });

  it('boilermaker-only dark goggles with 2 boilermaker starters', () => {
    const people = [person('C1', { title: 'Boilermaker Class 1' }), person('C2', { title: 'Fitter' })];
    const result = calculateBudget(input({
      people,
      settings: settings({
        lines: [{
          key: 'dark_goggles', item: 'Dark goggles', rule: 'per_month', qty_per_person: 1,
          who: { kind: 'job_title', sections: [], text: 'Boilermaker' }, unit_price: 5, buffer_pct: 0,
        }],
        confirmed: { count: 2, start_month: 1, boilermakers: 2 },
        provisional: { count: 1, start_month: 1, boilermakers: 0 },
      }),
    }));
    const line = lineByKey(result, 'dark_goggles');
    // 1 boilermaker on staff + 2 boilermaker starters; the non-boilermaker starter counts as everyone only.
    expect(line.months[0].qty).toBe(3);
    expect(line.months[0].qtyBase).toBe(3);
  });

  it('buffer rounds the month total up', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      settings: settings({ lines: [{ ...everyoneLine('chin', 'Chin straps', 'per_month', 1, 4), buffer_pct: 10 }] }),
    }));
    const line = lineByKey(result, 'chin');
    // 1 person × 1/month = 1, +10% = 1.1 → 2.
    expect(line.months[0].qty).toBe(2);
    expect(line.months[0].cost).toBe(8);
  });

  it('lines without a price show quantities only and are flagged', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      settings: settings({ lines: [everyoneLine('dust_masks', 'Dust masks', 'per_working_day', 1, null)] }),
    }));
    const line = lineByKey(result, 'dust_masks');
    expect(line.noPrice).toBe(true);
    expect(line.months[0].qty).toBe(MONTHS[0]);
    expect(line.months[0].cost).toBe(0);
    expect(line.yearCost).toBe(0);
  });
});

describe('card items from the matrix', () => {
  it('a worksuit issued 2026-08-10 on a 6-month interval is due Feb and Aug 2027', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'worksuit', '2026-08-10')],
      matrix: { worksuit: 6 },
      settings: settings(),
    }));
    const line = result.lines.find(l => l.item === 'worksuit')!;
    expect(line.kind).toBe('card');
    expect(line.months[1].qty).toBe(1);
    expect(line.months[7].qty).toBe(1);
    expect(line.yearQty).toBe(2);
    expect(line.months[0].qty).toBe(0);
  });

  it('a helmet issued 2025-11 on a 24-month interval is due Nov 2027', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'helmet', '2025-11-15')],
      matrix: { helmet: 24 },
      settings: settings(),
    }));
    const line = result.lines.find(l => l.item === 'helmet')!;
    expect(line.months[10].qty).toBe(1);
    expect(line.yearQty).toBe(1);
  });

  it('interval 0 is never projected', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'gloves', '2026-05-01')],
      matrix: { gloves: 0 },
      settings: settings(),
    }));
    const line = result.lines.find(l => l.item === 'gloves')!;
    expect(line.yearQty).toBe(0);
  });

  it('returned, not-required and archived records do not project', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [
        record('C1', 'worksuit', '2026-08-10', { status: 'returned' }),
        record('C1', 'helmet', '2026-08-10', { status: 'not_required' }),
      ],
      matrix: { worksuit: 6, helmet: 24 },
      settings: settings(),
    }));
    expect(result.lines.find(l => l.item === 'worksuit')!.yearQty).toBe(0);
    expect(result.lines.find(l => l.item === 'helmet')!.yearQty).toBe(0);
  });

  it('a lost item falls in January', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'worksuit', '2026-11-01', { status: 'lost' })],
      matrix: { worksuit: 6 },
      settings: settings(),
    }));
    const line = result.lines.find(l => l.item === 'worksuit')!;
    expect(line.months[0].qty).toBe(1);
  });

  it('loose type matching joins Boots and boots, and the size rides along', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'Boots', '2026-01-15', { size: '9' }), record('C1', 'boots', '2026-06-01', { size: '10' })],
      matrix: { safety_shoes: 6, boots: 6 },
      settings: settings(),
    }));
    const line = result.lines.find(l => l.item === 'boots')!;
    // Latest record (June) wins: Dec 2026 + 6 months → Jun and Dec 2027.
    expect(line.months[5].qty).toBe(1);
    expect(line.months[11].qty).toBe(1);
    expect(line.sizes).toEqual([{ person: 'C1', personName: 'Person C1', size: '10', qty: 2 }]);
  });

  it("types the matrix doesn't know are listed, never dropped or projected", () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'Boots', '2026-01-15'), record('C1', 'Boots', '2026-03-01')],
      matrix: { worksuit: 6 },
      settings: settings(),
    }));
    expect(result.unknownTypes).toEqual([{ type: 'Boots', count: 2 }]);
    expect(result.lines.some(l => l.item === 'Boots')).toBe(false);
    expect(result.assumptions.join(' ')).toContain('Boots');
  });
});

describe('starters, kit, gaps and the provisional toggle', () => {
  it('the starter kit lands in the start month only, then replaces on interval', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [record('C1', 'worksuit', '2026-08-10')],
      matrix: { worksuit: 6 },
      settings: settings({
        confirmed: { count: 1, start_month: 3, boilermakers: 0 },
        starter_kit: ['worksuit'],
      }),
    }));
    const line = result.lines.find(l => l.item === 'worksuit')!;
    // Staff due Feb + Aug; the starter's kit in March, then Sep (Mar + 6).
    expect(line.months[2].qty).toBe(1);
    expect(line.months[8].qty).toBe(1);
    expect(line.yearQty).toBe(4);
  });

  it('the default kit is the matrix types at least half of staff hold', () => {
    const people = [person('C1'), person('C2'), person('C3')];
    const result = calculateBudget(input({
      people,
      records: [record('C1', 'worksuit', '2026-08-10'), record('C2', 'worksuit', '2026-08-10'), record('C1', 'helmet', '2026-08-10')],
      matrix: { worksuit: 6, helmet: 24 },
      settings: settings({ confirmed: { count: 1, start_month: 1, boilermakers: 0 }, starter_kit: null }),
    }));
    // Worksuit 2 of 3, helmet 1 of 3: only the worksuit clears half.
    expect(result.starterKit).toEqual(['worksuit']);
  });

  it('the provisional toggle changes the headline totals but not the base', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      settings: settings({
        lines: [everyoneLine('dust_masks', 'Dust masks', 'per_working_day', 1, 1)],
        provisional: { count: 5, start_month: 1, boilermakers: 0 },
      }),
    }));
    const line = lineByKey(result, 'dust_masks');
    expect(line.months[0].qty).toBe(6 * MONTHS[0]);
    expect(line.months[0].qtyBase).toBe(1 * MONTHS[0]);
    expect(result.monthlyQty[0]).toBe(6 * MONTHS[0]);
    expect(result.monthlyQtyBase[0]).toBe(1 * MONTHS[0]);
  });

  it('gaps list people missing what most of their title holds', () => {
    const people = [person('C1', { title: 'Fitter' }), person('C2', { title: 'Fitter' }), person('C3', { title: 'Fitter' })];
    const result = calculateBudget(input({
      people,
      records: [record('C1', 'worksuit', '2026-08-10'), record('C2', 'worksuit', '2026-08-10')],
      matrix: { worksuit: 6 },
      settings: settings(),
    }));
    expect(result.gaps).toEqual([{ person: 'C3', personName: 'Person C3', title: 'Fitter', type: 'worksuit' }]);
  });

  it('adding gaps in January buys them once', () => {
    const people = [person('C1', { title: 'Fitter' }), person('C2', { title: 'Fitter' }), person('C3', { title: 'Fitter' })];
    const result = calculateBudget(input({
      people,
      records: [record('C1', 'worksuit', '2026-08-10'), record('C2', 'worksuit', '2026-08-10')],
      matrix: { worksuit: 6 },
      settings: settings({
        lines: [{ ...everyoneLine('worksuit', 'worksuit', 'matrix', 1, 20), rule: 'matrix' }],
        add_gaps_in_january: true,
      }),
    }));
    const line = result.lines.find(l => l.item === 'worksuit')!;
    // C1 and C2 due Feb + Aug; C3's gap bought in January.
    expect(line.months[0].qty).toBe(1);
    expect(line.months[0].cost).toBe(20);
  });
});

describe('basics', () => {
  it('monthIndexOf reads YYYY-MM-DD and rejects the rest', () => {
    expect(monthIndexOf('2027-03-15')).toBe(2);
    expect(monthIndexOf('2027-13-01')).toBe(-1);
    expect(monthIndexOf('not a date')).toBe(-1);
  });

  it('premature-failure hint counts the last 12 months per type', () => {
    const result = calculateBudget(input({
      people: [person('C1')],
      records: [
        record('C1', 'worksuit', '2026-03-01', { premature_failure: true }),
        record('C1', 'worksuit', '2026-06-01'),
        record('C1', 'worksuit', '2024-01-01', { premature_failure: true }),
      ],
      matrix: { worksuit: 6 },
      settings: settings(),
    }));
    expect(result.prematureRate['worksuit']).toEqual({ rate: 0.5, premature: 1, total: 2 });
  });
});
