// app/maintenance/phrases.ts — the words and phrases an artisan types over and over in a work report, and the completions to offer for
// whatever has been typed so far. Pure, so the rule is tested.
export const MAINT_VOCAB: string[] = [
  'adjusted', 'bearing', 'bearings', 'belt', 'belts', 'broken', 'calibrated', 'checked', 'cleaned', 'compressor', 'conveyor', 'corrective', 'coupling', 'cracked', 'damaged', 'drained',
  'electrical', 'filter', 'flushed', 'gasket', 'gaskets', 'gearbox', 'greased', 'hydraulic', 'inspected', 'installed', 'lubricated', 'maintenance', 'mechanical', 'motor', 'overhauled',
  'pneumatic', 'preventive', 'pump', 'realigned', 'rectified', 'refitted', 'removed', 'repaired', 'replaced', 'seal', 'seals', 'serviced', 'shaft', 'tightened', 'tested', 'valve',
  'vibration', 'welded',
  'preventive maintenance completed', 'corrective maintenance done', 'no further action required', 'machine running normally', 'awaiting spare parts', 'spare parts ordered',
  'bearing worn out', 'belt worn out', 'belt slipping', 'oil level low', 'oil leak detected', 'oil changed', 'found and rectified', 'found fault in', 'maintenance complete',
  'works normally after repair', 'safety hazard identified', 'lockout tagout applied',
];

/**
 * Up to `max` ways to carry on from what has been typed: after a space or new line, the phrases that start with the whole text so far;
 * otherwise the words and phrases that start with the last word. Each is the text with the completion applied.
 */
export function suggestCompletions(text: string, vocab: string[] = MAINT_VOCAB, max = 3): { label: string; next: string }[] {
  if (!text) return [];
  if (/[\s]$/.test(text)) {
    const head = text.trimEnd().toLowerCase();
    if (!head) return [];
    return vocab.filter(v => v.includes(' ') && v.toLowerCase().startsWith(`${head} `)).slice(0, max).map(v => ({ label: v, next: `${text.trimEnd()} ${v.slice(head.length + 1)} ` }));
  }
  const last = text.split(/[\s]+/).pop() || '';
  if (last.length < 2) return [];
  const lower = last.toLowerCase();
  return vocab.filter(v => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower).slice(0, max).map(v => ({ label: v, next: `${text.slice(0, text.length - last.length)}${v} ` }));
}
