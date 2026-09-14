/** Mine numbers on timesheet ↔ module joins (matches backend `normalize_code` for C/PP). */
export function normalizeTimesheetEmployeeCode(raw: string): string {
  const c = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!c) return '';
  if (c.startsWith('C') && /^\d+$/.test(c.slice(1))) {
    return `C${String(parseInt(c.slice(1), 10)).padStart(4, '0')}`;
  }
  if (c.startsWith('PP') && /^\d+$/.test(c.slice(2))) {
    return `PP${String(parseInt(c.slice(2), 10)).padStart(3, '0')}`;
  }
  return c;
}

export function timesheetEmployeeCodesMatch(a: string, b: string): boolean {
  return normalizeTimesheetEmployeeCode(a) === normalizeTimesheetEmployeeCode(b);
}
