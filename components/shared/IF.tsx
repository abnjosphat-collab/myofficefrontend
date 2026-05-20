'use client';

// Label + value display field used in detail modals across all pages

interface IFProps {
  label: string;
  value?: string | number | null;
}

export function IF({ label, value }: IFProps) {
  return (
    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-white/80 text-sm">{value ?? '—'}</div>
    </div>
  );
}
