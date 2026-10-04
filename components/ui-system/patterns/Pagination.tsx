'use client';

import { cn } from '../foundations/cn';
import { IconButton } from '../primitives/Button';
import { pageCount, pageRangeLabel } from './tableLogic';

/** Range label plus previous/next. Keeps the label in a polite live region for screen readers. */
export function Pagination({ page, pageSize, total, onPageChange, className }: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pages = pageCount(total, pageSize);
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-3 font-sans text-body-sm text-ink-muted', className)}>
      <span role="status" aria-live="polite" className="tabular">{pageRangeLabel(page, total, pageSize)}</span>
      <div className="flex items-center gap-1">
        <IconButton icon="chevron-left" label="Previous page" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
        <span className="px-2 tabular">Page {Math.min(page, pages)} of {pages}</span>
        <IconButton icon="chevron-right" label="Next page" variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)} />
      </div>
    </nav>
  );
}
