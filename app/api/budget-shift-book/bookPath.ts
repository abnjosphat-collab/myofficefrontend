const DEFAULT_PATH = 'C:\\Users\\Administrator\\Music\\Copy of August 2026 NEC Timesheet.xlsx';

export function bookPath(): string {
  return process.env.BUDGET_SHIFT_BOOK_PATH || DEFAULT_PATH;
}

