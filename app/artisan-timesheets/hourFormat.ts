/** Round hour values to two decimal places for display and storage. */
export function roundHours2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
