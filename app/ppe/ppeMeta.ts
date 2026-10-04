// app/ppe/ppeMeta.ts — the fixed vocabulary of the PPE module: the kinds of equipment, the default months each lasts, and the labels and
// tones for condition and status. Lookups fall back to the raw value so a record holding something unexpected still renders.
import type { Tone } from '@/components/ui-system';

export const PPE_TYPES: Record<string, { name: string; short: string }> = {
  helmet: { name: 'Safety Helmet', short: 'Helmet' }, gloves: { name: 'Safety Gloves', short: 'Gloves' }, glasses: { name: 'Safety Glasses', short: 'Glasses' },
  vest: { name: 'High-Vis Vest', short: 'Vest' }, gumboots: { name: 'Safety Gum Boots', short: 'Gum boots' }, safety_shoes: { name: 'Safety Shoes', short: 'Shoes' },
  harness: { name: 'Safety Harness', short: 'Harness' }, safety_chain_belt: { name: 'Safety Chain & Belt', short: 'Chain & belt' }, respirator: { name: 'Respirator', short: 'Respirator' },
  Cap_lamp_belt: { name: 'Cap Lamp Belt', short: 'Lamp belt' }, worksuit: { name: 'Protective Work Suit', short: 'Work suit' }, rainsuit: { name: 'Rain Suit', short: 'Rain suit' },
  overall: { name: 'Protective Overall', short: 'Overall' }, pneumo_jacket: { name: 'Pneumo Jacket', short: 'Pneumo jacket' },
};
export const typeName = (t: string) => PPE_TYPES[t]?.name ?? t;
export const typeShort = (t: string) => PPE_TYPES[t]?.short ?? t;
export const TYPE_OPTIONS = Object.entries(PPE_TYPES).map(([value, v]) => ({ value, label: v.name }));

/** Company defaults, in months until replacement; 0 means the item does not expire. The saved matrix overrides these. */
export const PPE_MATRIX_DEFAULTS: Record<string, number> = {
  worksuit: 6, gumboots: 6, safety_shoes: 6, helmet: 24, Cap_lamp_belt: 24, pneumo_jacket: 24, harness: 24, safety_chain_belt: 24,
  vest: 3, glasses: 3, respirator: 1, rainsuit: 6, gloves: 0, overall: 6,
};

export const CONDITIONS: { value: string; label: string; tone: Tone }[] = [
  { value: 'excellent', label: 'Excellent', tone: 'success' }, { value: 'good', label: 'Good', tone: 'info' }, { value: 'fair', label: 'Fair', tone: 'warning' },
  { value: 'poor', label: 'Poor', tone: 'warning' }, { value: 'damaged', label: 'Damaged', tone: 'danger' },
];
export const conditionMeta = (c: string) => CONDITIONS.find(x => x.value === c) ?? { value: c, label: c || 'Not recorded', tone: 'neutral' as Tone };

export const STATUSES: { value: string; label: string; tone: Tone }[] = [
  { value: 'active', label: 'Active', tone: 'success' }, { value: 'expired', label: 'Due', tone: 'danger' }, { value: 'returned', label: 'Returned', tone: 'neutral' },
  { value: 'lost', label: 'Lost', tone: 'danger' }, { value: 'damaged', label: 'Damaged', tone: 'warning' }, { value: 'not_required', label: 'Not required', tone: 'neutral' },
];
export const statusMeta = (s: string) => STATUSES.find(x => x.value === s) ?? { value: s, label: s || 'Unknown', tone: 'neutral' as Tone };
