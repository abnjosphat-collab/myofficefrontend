'use client';

// UnderlineTabs — the rounded-top form-modal tab strip repeated across the
// pto, work_stoppage, and vfl report modals: a row of buttons along a bottom
// border, active tab picked up in a tinted accent color. Generic over the
// tab-id union so each modal keeps its own literal type.

import { useTheme, accentText } from '@/components/shared/theme';

export interface UnderlineTab<T extends string> {
  id: T;
  label: string;
}

// Background wash stays constant across themes (a 15%-opacity tint reads fine on
// both a white and a dark page); the text color is the piece that washed out in
// light mode — text-brand-400/rose-400/emerald-400 are tuned for dark glass and
// went pale/blunt on white, so that part comes from the light-aware accentText().
const ACCENT_BG = {
  brand: 'bg-brand-500/15',
  rose: 'bg-rose-500/15',
  emerald: 'bg-emerald-500/15',
} as const;

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  accent = 'brand',
}: {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (id: T) => void;
  accent?: keyof typeof ACCENT_BG;
}) {
  const t = useTheme();
  return (
    <div className={`flex gap-1 px-5 pt-4 border-b ${t.border} overflow-x-auto`}>
      {tabs.map(tb => (
        <button
          key={tb.id}
          type="button"
          onClick={() => onChange(tb.id)}
          className={`px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
            value === tb.id ? `${ACCENT_BG[accent]} ${accentText(accent, t.light)}` : `${t.textFaint} ${t.hoverText}`
          }`}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}
