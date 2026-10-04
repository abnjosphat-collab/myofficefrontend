/**
 * A labelled count bar list: one row per category with the count always printed, so the bar is never the only
 * carrier of the value. Put it in a ChartPanel (which supplies the text alternative).
 */
export function Distribution({ rows, empty = 'No data' }: { rows: ReadonlyArray<{ name: string; value: number }>; empty?: string }) {
  if (!rows.length) return <p className="py-4 font-sans text-body-sm text-ink-muted">{empty}</p>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(r => (
        <li key={r.name} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate font-sans text-body-sm text-ink min-[400px]:w-28" title={r.name}>{r.name}</span>
          <div aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-action" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="w-8 shrink-0 text-right font-sans text-body-sm tabular text-ink">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
