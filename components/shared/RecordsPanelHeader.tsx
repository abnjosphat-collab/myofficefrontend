'use client';

import { type ElementType, type ReactNode } from 'react';
import { Search, LayoutGrid, List, ChevronUp, ChevronDown, Calendar } from 'lucide-react';

interface SortOption {
  value: string;
  label: string;
}

interface RecordsPanelHeaderProps {
  icon?: ElementType;
  title?: string;
  /** Filtered count */
  count?: number;
  /** Total unfiltered count — shown as "N of M" when provided */
  total?: number;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  sortValue: string;
  sortOptions: SortOption[];
  onSort: (v: string) => void;
  /** Current view mode — omit to hide the grid/table toggle */
  viewMode?: 'grid' | 'table';
  onViewMode?: (v: 'grid' | 'table') => void;
  show: boolean;
  onToggle: () => void;
  /** Extra elements inserted before the sort select */
  actions?: ReactNode;
}

export function RecordsPanelHeader({
  icon: Icon = Calendar,
  title = 'Records',
  count,
  total,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  sortValue,
  sortOptions,
  onSort,
  viewMode,
  onViewMode,
  show,
  onToggle,
  actions,
}: RecordsPanelHeaderProps) {
  const countLabel = count !== undefined && total !== undefined
    ? `${count} of ${total}`
    : count !== undefined
    ? String(count)
    : undefined;

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.07]">
      {/* Title + count */}
      <div className="flex items-center gap-2 shrink-0">
        <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</span>
        {countLabel && <span className="text-[11px] text-white/35">{countLabel}</span>}
      </div>

      {/* Search */}
      <div className="flex-1 relative min-w-0 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={`Search ${title}`}
          className="pl-7 pr-3 h-7 w-full text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/40 focus:outline-none transition-all"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {actions}

        <select
          aria-label={`Sort ${title}`}
          value={sortValue}
          onChange={e => onSort(e.target.value)}
          className="h-7 pl-2 pr-6 text-xs rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/70 focus:outline-none appearance-none"
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {onViewMode && (
          <>
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => onViewMode('grid')}
              className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]'
                  : 'bg-white/[0.05] border-white/12 text-white/40 hover:bg-white/[0.12] hover:text-white/70'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              onClick={() => onViewMode('table')}
              className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all ${
                viewMode === 'table'
                  ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]'
                  : 'bg-white/[0.05] border-white/12 text-white/40 hover:bg-white/[0.12] hover:text-white/70'
              }`}
            >
              <List className="h-3 w-3" />
            </button>
          </>
        )}

        <button
          type="button"
          aria-label={show ? 'Collapse records' : 'Expand records'}
          onClick={onToggle}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all"
        >
          {show ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
