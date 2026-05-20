'use client';

// Clickable filter chip row — used for status/type/category filtering across all pages

interface FilterChipOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
}

export function FilterChips({ options, value, onChange, label, className = '' }: FilterChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {label && (
        <span className="text-[10px] text-white/30 uppercase tracking-wider self-center mr-1">
          {label}
        </span>
      )}
      {options.map(o => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              active
                ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white font-semibold'
                : 'bg-white/[0.05] border-white/12 text-white/60 hover:bg-white/[0.12] hover:text-white/90'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
