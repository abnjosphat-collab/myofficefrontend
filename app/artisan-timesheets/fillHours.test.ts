import { describe, expect, it } from 'vitest';
import { buildMonthDayRows } from './calcTotals';
import { fillColumnDown, fillHoursDown } from './fillHours';

describe('fillHoursDown', () => {
  it('copies all hour fields to following rows only', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[0] = { ...rows[0], normal_hrs: 8, ot_15: 2, comments: 'Day 1' };
    const filled = fillHoursDown(rows, 0, 2);
    expect(filled[1].normal_hrs).toBe(8);
    expect(filled[1].ot_15).toBe(2);
    expect(filled[1].comments).toBe('');
  });
});

describe('fillColumnDown', () => {
  it('copies only the selected column', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[0].normal_hrs = 10;
    rows[0].ot_15 = 3;
    const filled = fillColumnDown(rows, 'normal_hrs', 0, 2);
    expect(filled[1].normal_hrs).toBe(10);
    expect(filled[1].ot_15).toBe(0);
  });

  it('copies day_status and clears normal hrs on targets', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[0].day_status = 'sick';
    rows[1].normal_hrs = 8;
    const filled = fillColumnDown(rows, 'day_status', 0, 1);
    expect(filled[1].day_status).toBe('sick');
    expect(filled[1].normal_hrs).toBe(8);
  });

  it('copies standby and signatures downward', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[0].on_standby = true;
    rows[0].sign_in_signature = 'data:image/png;base64,abc';
    rows[0].sign_out_signature = 'data:image/png;base64,def';
    const filled = fillColumnDown(rows, 'on_standby', 0, 2);
    expect(filled[1].on_standby).toBe(true);
    expect(filled[2].on_standby).toBe(true);
    const sigFill = fillColumnDown(rows, 'sign_in_signature', 0, 1);
    expect(sigFill[1].sign_in_signature).toBe('data:image/png;base64,abc');
  });
});
