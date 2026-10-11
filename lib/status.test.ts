import { describe, expect, it } from 'vitest';
import { absenceTone, conditionTone, priorityTone, statusTone } from './status';
import { statusMeta as workOrderStatus, priorityMeta as workOrderPriority } from '@/app/maintenance/meta';
import { statusMeta as breakdownStatus } from '@/app/breakdowns/breakdownMeta';
import { STATUS as serviceStatus } from '@/app/services/meta';
import { statusMeta as overtimeStatus } from '@/app/overtime/overtimeMeta';
import { statusMeta as ppeStatus, conditionMeta } from '@/app/ppe/ppeMeta';
import { PRIORITY_TONE as taskPriority } from '@/app/tasks-events/meta';
import { PRIORITY as sparePriority, STOCK as spareStock } from '@/app/spares/stock';
import { typeOf as leaveType } from '@/app/leaves/leaveTypes';
import { statusMeta as dayCode } from '@/app/timesheets/timesheetMeta';

describe('status vocabulary', () => {
  it('reads any spelling of a status', () => {
    expect(statusTone('In Progress')).toBe('info');
    expect(statusTone('in-progress')).toBe('info');
    expect(statusTone('in_progress')).toBe('info');
    expect(statusTone('  Overdue ')).toBe('danger');
  });

  it('falls back for a value it does not know', () => {
    expect(statusTone('something new')).toBe('neutral');
    expect(statusTone(undefined, 'info')).toBe('info');
    expect(priorityTone(null)).toBe('neutral');
  });

  it('puts priority, criticality and risk on one scale', () => {
    expect(['Low', 'Medium', 'High', 'Critical'].map(p => priorityTone(p))).toEqual(['neutral', 'info', 'warning', 'danger']);
    expect(priorityTone('urgent')).toBe('danger');
  });

  it('treats poor and damaged items as needing action', () => {
    expect(conditionTone('poor')).toBe('danger');
    expect(conditionTone('damaged')).toBe('danger');
  });

  // The point of the vocabulary: the same word looks the same in every module.
  it('gives a shared status the same tone in every module', () => {
    expect(new Set([workOrderStatus('in-progress').tone, breakdownStatus('in_progress').tone, serviceStatus.in_progress.tone])).toEqual(new Set(['info']));
    expect(new Set([workOrderStatus('cancelled').tone, overtimeStatus('cancelled').tone, breakdownStatus('cancelled').tone])).toEqual(new Set(['neutral']));
    expect(new Set([overtimeStatus('pending').tone, workOrderStatus('pending').tone])).toEqual(new Set(['warning']));
    expect(ppeStatus('damaged').tone).toBe(conditionMeta('damaged').tone);
    expect([taskPriority.Medium, workOrderPriority('medium').tone]).toEqual(['info', 'info']);
    expect([taskPriority.High, workOrderPriority('high').tone]).toEqual(['warning', 'warning']);
  });

  it('covers equipment, people, stock and certification states', () => {
    expect(statusTone('breakdown')).toBe('danger');
    expect(statusTone('suspended')).toBe('warning');
    expect(statusTone('Valid')).toBe('success');
    expect([statusTone('in-stock'), statusTone('low_stock'), statusTone('out of stock')]).toEqual(['success', 'warning', 'danger']);
  });

  it('keeps the spares stock and priority scales on the shared tones', () => {
    expect([spareStock.in.tone, spareStock.low.tone, spareStock.out.tone]).toEqual([statusTone('in_stock'), statusTone('low_stock'), statusTone('out_of_stock')]);
    expect([sparePriority.critical.tone, sparePriority.high.tone, sparePriority.medium.tone, sparePriority.low.tone]).toEqual(['danger', 'warning', 'info', 'neutral']);
  });
});

describe('absence vocabulary', () => {
  it('colours time away by what it means for the roster, not by leave type', () => {
    expect(['annual', 'study', 'maternity', 'lieu', 'compassionate'].map(k => absenceTone(k))).toEqual(['info', 'info', 'info', 'info', 'info']);
    expect([absenceTone('sick'), absenceTone('emergency'), absenceTone('absent')]).toEqual(['warning', 'warning', 'danger']);
  });

  it('shows the same kind of absence in the same colour on Leaves and on the timesheet', () => {
    for (const [leave, code] of [['sick', 'sick'], ['study', 'study'], ['maternity', 'maternity'], ['lieu', 'lieu'], ['compassionate', 'special_leave'], ['annual', 'leave']] as const) {
      expect(leaveType(leave).tone, `${leave} / ${code}`).toBe(dayCode(code).tone);
    }
  });
});
