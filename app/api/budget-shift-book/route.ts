// app/api/budget-shift-book/route.ts — serves the monthly NEC timesheet book
// that lives on this machine, so the Overtime Budget tab needs no upload.
// Path override: BUDGET_SHIFT_BOOK_PATH. Anywhere else (production, or a
// machine without the file) this answers 404 and the tab falls back to an
// upload control.
import * as fs from 'node:fs';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PATH = 'C:\\Users\\Administrator\\Music\\Copy of August 2026 NEC Timesheet.xlsx';

export function bookPath(): string {
  return process.env.BUDGET_SHIFT_BOOK_PATH || DEFAULT_PATH;
}

export async function GET() {
  const path = bookPath();
  try {
    const buf = fs.readFileSync(path);
    const { parseShiftBook, bookShiftAverages } = await import('@/app/overtime/parseShiftBook');
    const parsed = await parseShiftBook(buf as unknown as ArrayBuffer);
    const avg = bookShiftAverages(parsed);
    return NextResponse.json({
      fileName: path.split('\\').pop() ?? path,
      monthsUsed: parsed.monthsUsed,
      averages: [...avg.entries()].map(([code, value]) => ({ code, value })),
    });
  } catch {
    return NextResponse.json(
      { error: `Shift book not readable at ${path}. Upload it in the Overtime Budget tab instead.` },
      { status: 404 },
    );
  }
}
