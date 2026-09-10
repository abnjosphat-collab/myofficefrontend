import { describe, expect, it } from 'vitest';
import { buildMonthDayRows } from './calcTotals';
import { autoPopulateMonthRows } from './autoPopulate';
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
    expect(day?.normal_hrs).toBe(10);
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

  it('adds holiday ot_20 and sb_20 when on standby', () => {
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
    expect(newYear?.ot_20).toBe(8);
    expect(newYear?.on_standby).toBe(true);
    expect(newYear?.sb_20).toBe(8);
  });
});
