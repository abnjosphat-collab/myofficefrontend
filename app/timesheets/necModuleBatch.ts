// Scoped batch: NEC September 2026 (13 Aug–12 Sep). User authorized including unsigned
// leave/overtime in grid reconciliation for this period only (signing bug workaround).
import { toLocalISODate } from '@/lib/dates';
import type { Period } from './types';

export const NEC_UNSIGNED_MODULE_BATCH = {
  startDate: '2026-08-13',
  endDate: '2026-09-12',
} as const;

export function periodUsesUnsignedModuleRecords(period: Period): boolean {
  return (
    toLocalISODate(period.start) === NEC_UNSIGNED_MODULE_BATCH.startDate
    && toLocalISODate(period.end) === NEC_UNSIGNED_MODULE_BATCH.endDate
  );
}
