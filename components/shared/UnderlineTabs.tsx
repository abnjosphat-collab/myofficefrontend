'use client';

// UnderlineTabs — the rounded-top form-modal tab strip repeated across the
// pto, work_stoppage, and vfl report modals: a row of buttons along a bottom
// border, active tab picked up in a tinted accent color. Generic over the
// tab-id union so each modal keeps its own literal type.

import { useTheme } from '@/components/shared/theme';

export interface UnderlineTab<T extends string> {
  id: T;
  label: string;
}

const ACCENT_CLS = {
  brand: 'bg-brand-500/15 text-brand-400',
  rose: 'bg-rose-500/15 text-rose-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
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
  accent?: keyof typeof ACCENT_CLS;
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
            value === tb.id ? ACCENT_CLS[accent] : `${t.textFaint} ${t.hoverText}`
          }`}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}
