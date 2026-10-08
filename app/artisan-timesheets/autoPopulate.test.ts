import { describe, expect, it } from 'vitest';
import { buildMonthDayRows } from './calcTotals';
import { autoPopulateMonthRows, pendingFootnoteText, pendingForDay, pendingMonthTotals, pendingSummaryText } from './autoPopulate';
import type { ShiftAssignment } from '@/app/shifts/types';

describe('autoPopulateMonthRows', () => {
  it('marks approved leave days with day_status from the Leaves module', () => {
    const rows = buildMonthDayRows(2024, 1);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [{
        employee_id: 'C001',
        leave_type: 'sick',
        start_date: '2024-01-03',
        end_date: '2024-01-04',
        status: 'approved',
        reason: 'Flu',
      }],
      overtime: [],
      standbyAssignments: [],
    });
    expect(result[2].day_status).toBe('sick');
    expect(result[2].normal_hrs).toBe(8);
    expect(result[2].comments).toBe('Flu');
    expect(result[3].day_status).toBe('sick');
  });

  it('uses overtime reason in comments', () => {
    const rows = buildMonthDayRows(2024, 1);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [{
        employee_id: 'C001',
        overtime_type: 'regular',
        date: '2024-01-10',
        start_time: '17:00',
        end_time: '19:00',
        status: 'approved',
        reason: 'Pump seal replacement on 12L',
      }],
      standbyAssignments: [],
    });
    const day = result.find(r => r.date === '2024-01-10');
    expect(day?.comments).toBe('Pump seal replacement on 12L');
    expect(day?.ot_15).toBe(2);
    expect(day?.sign_in_time).toBe('17:00');
    expect(day?.sign_out_time).toBe('19:00');
    expect(day?.normal_hrs).toBe(0);
  });

  it('rolls early-morning OT to the previous shift and fills sign times there', () => {
    const rows = buildMonthDayRows(2024, 8);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [{
        employee_id: 'C001',
        overtime_type: 'regular',
        date: '2024-08-02',
        start_time: '05:00',
        end_time: '06:30',
        status: 'approved',
        reason: 'Pre-shift callout',
      }],
      standbyAssignments: [],
    });
    const aug1 = result.find(r => r.date === '2024-08-01');
    const aug2 = result.find(r => r.date === '2024-08-02');
    expect(aug1?.ot_15).toBe(1.5);
    expect(aug1?.sign_in_time).toBe('05:00');
    expect(aug1?.sign_out_time).toBe('06:30');
    expect(aug2?.ot_15).toBe(0);
  });

  it('credits no overtime on a public holiday, but keeps the standby toggle', () => {
    const rows = buildMonthDayRows(2024, 1);
    const standby: ShiftAssignment = {
      id: 1,
      employee_id: 'C001',
      employee_name: 'Test',
      shift_type: 'standby',
      on_days: 0,
      off_days: 0,
      cycle_start_date: '2024-01-01',
      is_active: true,
    };
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [],
      standbyAssignments: [standby],
    }, { overwrite: true });
    const newYear = result.find(r => r.date === '2024-01-01');
    expect(newYear).toMatchObject({ ot_15: 0, ot_20: 0, sb_15: 0, sb_20: 0, normal_hrs: 0 });
    expect(newYear?.on_standby).toBe(true);
    expect(newYear?.comments).toContain("New Year's Day");
  });

  it('treats Munhumutapa Day (15 Sep, from 2026) as a public holiday', () => {
    const rows = buildMonthDayRows(2026, 9);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [],
      standbyAssignments: [],
    }, { overwrite: true });
    const day = result.find(r => r.date === '2026-09-15');
    expect(day?.ot_15).toBe(0);
    expect(day?.ot_20).toBe(0);
    expect(day?.normal_hrs).toBe(0);
    expect(day?.comments).toContain('Munhumutapa Day');
  });

  it('refresh clears legacy on-duty normal hours and night values', () => {
    const rows = buildMonthDayRows(2026, 2);
    rows[0] = { ...rows[0], normal_hrs: 10, night_shift: 5, _auto: true };
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [],
      standbyAssignments: [],
    }, { overwrite: true });
    expect(result[0].normal_hrs).toBe(0);
    expect(result[0].night_shift).toBe(0);
  });

  it('clears a stale leave status but keeps attendance facts on refresh', () => {
    const rows = buildMonthDayRows(2026, 2);
    rows[0] = { ...rows[0], day_status: 'sick', normal_hrs: 8, _auto: true };
    rows[1] = { ...rows[1], day_status: 'absent', _auto: true };
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [],
      standbyAssignments: [],
    }, { overwrite: true });
    expect(result[0].day_status).toBe('');
    expect(result[0].normal_hrs).toBe(0);
    expect(result[1].day_status).toBe('absent');
  });

  it('never overwrites a hand-set standby toggle, on or off', () => {
    const rows = buildMonthDayRows(2024, 1);
    const standby: ShiftAssignment = {
      id: 1,
      employee_id: 'C001',
      employee_name: 'Test',
      shift_type: 'standby',
      on_days: 0,
      off_days: 0,
      cycle_start_date: '2024-01-01',
      is_active: true,
    };
    // The roster says standby on 2024-01-01 (see the holiday test above).
    rows[0] = { ...rows[0], on_standby: false, _standbyManual: true, _auto: true };
    rows[1] = { ...rows[1], on_standby: true, _standbyManual: true, _auto: true };
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [],
      standbyAssignments: [standby],
    }, { overwrite: true });
    expect(result[0].on_standby).toBe(false);
    expect(result[1].on_standby).toBe(true);
  });
});

describe('pendingForDay', () => {
  it('returns only the pending leave and shift-day overtime, never approved or rejected', () => {
    const sources = {
      leaves: [
        { employee_id: 'C001', leave_type: 'annual', start_date: '2024-01-03', end_date: '2024-01-04', status: 'pending', reason: 'Trip' },
        { employee_id: 'C001', leave_type: 'sick', start_date: '2024-01-03', end_date: '2024-01-03', status: 'approved', reason: 'Flu' },
        { employee_id: 'C001', leave_type: 'sick', start_date: '2024-01-03', end_date: '2024-01-03', status: 'rejected', reason: 'No' },
      ],
      overtime: [
        { employee_id: 'C001', overtime_type: 'regular', date: '2024-01-04', start_time: '05:00', end_time: '06:30', status: 'pending', reason: 'Callout' },
        { employee_id: 'C001', overtime_type: 'regular', date: '2024-01-03', start_time: '17:00', end_time: '19:00', status: 'approved', reason: 'Pump' },
      ],
      standbyAssignments: [],
    };
    const day = pendingForDay(sources, 'C001', '2024-01-03');
    expect(day.leaves.map(l => l.leave_type)).toEqual(['annual']);
    expect(day.overtime.map(o => o.reason)).toEqual(['Callout']); // rolled from the 4th's early morning
    expect(pendingForDay(sources, 'C001', '2024-01-05')).toEqual({ leaves: [], overtime: [] });
  });
});

describe('pendingMonthTotals', () => {
  it('sums pending overtime in the month and clamps leave days to it', () => {
    const totals = pendingMonthTotals({
      leaves: [
        { employee_id: 'C001', leave_type: 'annual', start_date: '2023-12-30', end_date: '2024-01-02', status: 'pending' },
        { employee_id: 'C001', leave_type: 'sick', start_date: '2024-02-01', end_date: '2024-02-02', status: 'pending' },
      ],
      overtime: [
        { employee_id: 'C001', overtime_type: 'regular', date: '2024-01-10', start_time: '17:00', end_time: '19:30', status: 'pending' },
        { employee_id: 'C001', overtime_type: 'weekend', date: '2024-02-03', start_time: '08:00', end_time: '10:00', status: 'pending' },
      ],
      standbyAssignments: [],
    }, 'C001', 2024, 1);
    expect(totals).toEqual({ otHours: 2.5, leaveDays: 2 });
  });
});

describe('pendingSummaryText / pendingFootnoteText', () => {
  it('summarises a day and the month for display', () => {
    expect(pendingSummaryText({
      leaves: [{ employee_id: 'C001', leave_type: 'annual', start_date: '2024-01-03', end_date: '2024-01-03', status: 'pending' }],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2024-01-03', status: 'pending', hours: 2.5 }],
    })).toBe('Annual + 2.50h overtime');
    expect(pendingSummaryText({ leaves: [], overtime: [] })).toBe('');
    expect(pendingFootnoteText({ otHours: 2.5, leaveDays: 1 })).toBe('Excludes 2.50h overtime and 1 leave day awaiting approval — counted once approved.');
    expect(pendingFootnoteText({ otHours: 0, leaveDays: 0 })).toBe('');
  });
});

describe('credited overtime statuses', () => {
  it('counts a paid night shift like approved: Eliyah Frank, September 2', () => {
    const rows = buildMonthDayRows(2026, 9);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [{
        employee_id: 'C001',
        overtime_type: 'regular',
        date: '2026-09-02',
        start_time: '17:00',
        end_time: '01:23',
        status: 'paid',
        reason: 'Night callout',
      }],
      standbyAssignments: [],
    });
    const sep2 = result.find(r => r.date === '2026-09-02');
    expect(sep2?.ot_15).toBe(8.38);
    expect(sep2?.sign_in_time).toBe('17:00');
    expect(sep2?.sign_out_time).toBe('01:23');
  });

  it('times a midnight-split shift as one span across both rows', () => {
    const rows = buildMonthDayRows(2026, 9);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [
        { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-02', start_time: '17:00', end_time: '23:59', status: 'approved' },
        { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-03', start_time: '00:00', end_time: '01:23', status: 'approved' },
      ],
      standbyAssignments: [],
    });
    const sep2 = result.find(r => r.date === '2026-09-02');
    expect(sep2?.ot_15).toBe(8.36);
    expect(sep2?.sign_in_time).toBe('17:00');
    expect(sep2?.sign_out_time).toBe('01:23');
    expect(result.find(r => r.date === '2026-09-03')?.ot_15).toBe(0);
  });

  it('never credits pending or rejected overtime', () => {
    const rows = buildMonthDayRows(2026, 9);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [
        { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-04', start_time: '17:00', end_time: '19:00', status: 'pending' },
        { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-05', start_time: '17:00', end_time: '19:00', status: 'rejected' },
      ],
      standbyAssignments: [],
    });
    expect(result.find(r => r.date === '2026-09-04')).toMatchObject({ ot_15: 0, ot_20: 0, sign_in_time: '', sign_out_time: '' });
    expect(result.find(r => r.date === '2026-09-05')).toMatchObject({ ot_15: 0, ot_20: 0 });
  });
});

describe('refresh keeps hand-entered sign times', () => {
  it('updates the hours from new overtime but leaves typed times alone', () => {
    const first = autoPopulateMonthRows(buildMonthDayRows(2026, 9), 'C001', {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-09-05', start_time: '17:00', end_time: '19:00', status: 'approved' }],
      standbyAssignments: [],
    });
    // The artisan corrects the times by hand; any edit flips the row off auto.
    const edited = first.map(r => (r.date === '2026-09-05' ? { ...r, sign_in_time: '16:30', sign_out_time: '19:30', _auto: false } : r));
    const refreshed = autoPopulateMonthRows(edited, 'C001', {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-09-05', start_time: '17:00', end_time: '20:00', status: 'approved' }],
      standbyAssignments: [],
    }, { overwrite: true });
    const sep5 = refreshed.find(r => r.date === '2026-09-05');
    expect(sep5?.sign_in_time).toBe('16:30');
    expect(sep5?.sign_out_time).toBe('19:30');
    expect(sep5?.ot_15).toBe(3);
  });

  it('still updates times on rows the system filled and nobody touched', () => {
    const first = autoPopulateMonthRows(buildMonthDayRows(2026, 9), 'C001', {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-09-06', start_time: '17:00', end_time: '19:00', status: 'approved' }],
      standbyAssignments: [],
    });
    const refreshed = autoPopulateMonthRows(first, 'C001', {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-09-06', start_time: '18:00', end_time: '20:00', status: 'approved' }],
      standbyAssignments: [],
    }, { overwrite: true });
    expect(refreshed.find(r => r.date === '2026-09-06')).toMatchObject({ sign_in_time: '18:00', sign_out_time: '20:00', ot_15: 2 });
  });
});

describe('loose matching', () => {
  it('matches a leave typed with a stray space and datetime-suffixed dates', () => {
    const rows = buildMonthDayRows(2024, 1);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [{
        employee_id: ' c001 ',
        leave_type: 'sick',
        start_date: '2024-01-03T00:00:00',
        end_date: '2024-01-03T00:00:00',
        status: 'approved',
        reason: 'Flu',
      }],
      overtime: [],
      standbyAssignments: [],
    });
    expect(result.find(r => r.date === '2024-01-03')).toMatchObject({ day_status: 'sick', normal_hrs: 8 });
  });
});

describe('no overtime on a public holiday', () => {
  it('voids overtime recorded on the holiday and notes it instead of counting', () => {
    const rows = buildMonthDayRows(2024, 1);
    const result = autoPopulateMonthRows(rows, 'C001', {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2024-01-01', start_time: '17:00', end_time: '19:00', status: 'approved', reason: 'Callout' }],
      standbyAssignments: [],
    }, { overwrite: true });
    const newYear = result.find(r => r.date === '2024-01-01');
    expect(newYear).toMatchObject({ ot_15: 0, ot_20: 0, sign_in_time: '', sign_out_time: '' });
    expect(newYear?.comments).toContain("New Year's Day");
    expect(newYear?.comments).toContain('not counted');
  });

  it('leaves holiday overtime out of the awaiting-approval footnote', () => {
    const totals = pendingMonthTotals({
      leaves: [],
      overtime: [
        { employee_id: 'C001', overtime_type: 'regular', date: '2024-01-01', start_time: '17:00', end_time: '19:00', status: 'pending' },
      ],
      standbyAssignments: [],
    }, 'C001', 2024, 1);
    expect(totals).toEqual({ otHours: 0, leaveDays: 0 });
  });
});

describe('nobody works on leave', () => {
  const leaveSources = {
    leaves: [{
      employee_id: 'C001',
      leave_type: 'annual',
      start_date: '2024-01-10',
      end_date: '2024-01-10',
      status: 'approved',
      reason: 'Trip',
    }],
    overtime: [{
      employee_id: 'C001',
      overtime_type: 'regular',
      date: '2024-01-10',
      start_time: '17:00',
      end_time: '19:00',
      status: 'approved',
      reason: 'Callout',
    }],
    standbyAssignments: [],
  };

  it('clears standby, sign times and signatures from a leave day, however they were set', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[9] = {
      ...rows[9], on_standby: true, _standbyManual: true,
      sign_in_time: '17:00', sign_out_time: '19:00',
      sign_in_signature: 'data:image/png;base64,A', sign_out_signature: 'data:image/png;base64,B',
      ot_15: 2, _auto: true,
    };
    const result = autoPopulateMonthRows(rows, 'C001', { ...leaveSources, overtime: [] }, { overwrite: true });
    expect(result[9]).toMatchObject({
      day_status: 'leave', normal_hrs: 8, ot_15: 0, ot_20: 0, on_standby: false,
      sign_in_time: '', sign_out_time: '', sign_in_signature: '', sign_out_signature: '',
    });
  });

  it('notes overtime recorded on leave as not counted instead of crediting it', () => {
    const rows = buildMonthDayRows(2024, 1);
    const result = autoPopulateMonthRows(rows, 'C001', leaveSources);
    const day = result.find(r => r.date === '2024-01-10');
    expect(day).toMatchObject({ day_status: 'leave', normal_hrs: 8, ot_15: 0, ot_20: 0 });
    expect(day?.comments).toContain('not counted');
  });
});
