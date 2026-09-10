'use client';

import React from 'react';
import { useTheme, TYPE_WEIGHT, ACCENT_HEX } from '@/components/shared/theme';

type Metric = {
  label: string;
  value: number | string;
  color: string;
  active?: boolean;
  onClick?: () => void;
};

export function PreviewMetricRow({ metrics }: { metrics: Metric[] }) {
  const t = useTheme();
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`}>
      {metrics.map(m => (
        <button
          key={m.label}
          type="button"
          disabled={!m.onClick}
          onClick={m.onClick}
          className={`rounded-xl border p-4 text-left transition-all ${
            m.active
              ? 'ring-1 ring-brand-400/40 border-brand-400/30'
              : `${t.border} ${t.light ? 'bg-white hover:border-black/20' : 'bg-white/[0.03] hover:bg-white/[0.05]'}`
          } ${m.onClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <p className={`text-xs ${t.textFaint}`}>{m.label}</p>
          <p className={`mt-1 text-2xl ${TYPE_WEIGHT.bold} tabular-nums`} style={{ color: m.color }}>
            {m.value}
          </p>
        </button>
      ))}
    </div>
  );
}

export const METRIC_COLORS = {
  total: ACCENT_HEX.blue,
  artisans: '#f97316',
  nec: ACCENT_HEX.indigo,
  salaried: ACCENT_HEX.cyan,
  permanent: ACCENT_HEX.amber,
};
