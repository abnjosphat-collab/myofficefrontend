'use client';

import { ChevronsUp, ChevronsDown } from 'lucide-react';
import type { PageCollapseState } from './usePageCollapse';

interface MasterCollapseButtonProps {
  collapse: PageCollapseState;
  className?: string;
}

/**
 * A single button that expands or collapses all page sections at once.
 * Place it in your page header alongside the refresh/new buttons.
 *
 * Usage:
 *   const s = usePageCollapse({ hero: false, records: false });
 *   <MasterCollapseButton collapse={s} />
 */
export function MasterCollapseButton({ collapse, className = '' }: MasterCollapseButtonProps) {
  const { anyExpanded, expandAll, collapseAll } = collapse;
  return (
    <button
      type="button"
      title={anyExpanded ? 'Collapse all sections' : 'Expand all sections'}
      onClick={anyExpanded ? collapseAll : expandAll}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 ${
        anyExpanded
          ? 'bg-rose-500/20 border-rose-500/35'
          : 'bg-[#2A4D69]/55 border-[#86BBD8]/35'
      } ${className}`}
    >
      {anyExpanded
        ? <><ChevronsUp className="h-3.5 w-3.5" />Collapse All</>
        : <><ChevronsDown className="h-3.5 w-3.5" />Expand All</>}
    </button>
  );
}
