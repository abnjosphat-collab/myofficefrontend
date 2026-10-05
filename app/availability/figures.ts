// app/availability/figures.ts — how the availability page reads figures the server may not have. The server sends null for the
// availability, MTBF and MTTR of equipment with no availability record; that is "No data", never 0 and never a default.
import type { Equipment } from './types';

export const NO_DATA = 'No data';

/** True when the figure is a real number (null, undefined and NaN are not). */
export const hasFigure = (n: number | null | undefined): n is number => n != null && Number.isFinite(Number(n));

/** A measured figure as text, or "No data" when the server has none. */
export const figureText = (n: number | null | undefined, format: (v: number) => string): string => (hasFigure(n) ? format(Number(n)) : NO_DATA);

/** Mean availability of the units that have a measured figure; null when none do (so it reads "No data", not 0%). */
export function averageAvailability(units: readonly Pick<Equipment, 'availability'>[]): { average: number | null; measured: number } {
  const figures = units.map(u => u.availability).filter(hasFigure).map(Number);
  return { average: figures.length ? figures.reduce((sum, v) => sum + v, 0) / figures.length : null, measured: figures.length };
}
