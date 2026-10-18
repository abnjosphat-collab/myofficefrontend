// Midnight-date regression: nine report forms defaulted their date with
// `new Date().toISOString().slice(0, 10)` — the UTC date, which reads as yesterday
// between 00:00 and 02:00 ZW time. They must use todayLocal() from lib/dates.ts.
// Pinned at 2026-10-17T23:30:00Z (01:30 on 2026-10-18 in Africa/Johannesburg,
// UTC+2), the exact window where the UTC and local dates differ.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocal } from '@/lib/dates';
import { exportFilename } from '@/lib/exportUtils';
import { nowLocal } from '@/components/shared/utils';
import { emptyForm as nearMissForm } from './near_miss/page';
import { emptyForm as noticeboardForm } from './noticeboard/page';
import { emptyForm as pacheduForm } from './pachedu/page';
import { emptyForm as ptoForm } from './pto/page';
import { emptyForm as requisitionForm } from './requisitions/page';
import { emptyForm as safetyComplaintForm } from './safety_complaints/page';
import { emptyForm as sheqInspectionForm } from './sheq_inspection/page';
import { emptyForm as vflForm } from './vfl/page';
import { emptyForm as workStoppageForm } from './work_stoppage/page';

beforeAll(() => { process.env.TZ = 'Africa/Johannesburg'; });
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T23:30:00Z'));
});
afterEach(() => { vi.useRealTimers(); });

const FORMS: Record<string, () => { date: string }> = {
  near_miss: nearMissForm,
  noticeboard: noticeboardForm,
  pachedu: pacheduForm,
  pto: ptoForm,
  requisitions: requisitionForm,
  safety_complaints: safetyComplaintForm,
  sheq_inspection: sheqInspectionForm,
  vfl: vflForm,
  work_stoppage: workStoppageForm,
};

describe('midnight-date defaults (ZW 00:00–02:00 window)', () => {
  it('the UTC and local dates differ at the pinned instant, so the test can catch the bug', () => {
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-17');
    expect(todayLocal()).toBe('2026-10-18');
  });

  it.each(Object.entries(FORMS))('%s defaults its date to todayLocal(), not the UTC date', (_name, emptyForm) => {
    expect(emptyForm().date).toBe(todayLocal());
    expect(emptyForm().date).toBe('2026-10-18');
  });

  it('near_miss pairs the local date with the local time', () => {
    expect(nearMissForm().date).toBe('2026-10-18');
    expect(nearMissForm().time).toBe('01:30');
  });

  it('export filename stamps use the local date', () => {
    expect(exportFilename('Training_Register')).toBe('Training_Register_2026-10-18');
  });

  it('nowLocal() renders the local datetime, not UTC', () => {
    expect(nowLocal()).toBe('2026-10-18T01:30');
  });
});
