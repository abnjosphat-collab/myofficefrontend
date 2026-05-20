'use client';

interface GlassProgressProps {
  value: number;
  max?: number;
  /** Tailwind bg colour class for the fill. Defaults to dynamic based on value. */
  colorClass?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const heightMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

function autoColor(pct: number) {
  if (pct >= 95) return 'bg-emerald-400';
  if (pct >= 80) return 'bg-amber-400';
  return 'bg-red-400';
}

export function GlassProgress({
  value,
  max = 100,
  colorClass,
  size = 'sm',
  showLabel = false,
  className = '',
}: GlassProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = colorClass ?? autoColor(pct);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 rounded-full bg-white/[0.08] overflow-hidden ${heightMap[size]}`}>
        <div
          className={`${heightMap[size]} rounded-full transition-all ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-white/50 w-10 text-right shrink-0">{pct.toFixed(0)}%</span>
      )}
    </div>
  );
}
