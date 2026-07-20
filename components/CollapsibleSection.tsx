'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, useTheme } from '@/components/shared/theme';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  badge?: ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  badge,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Theme tokens instead of the old hardcoded #2A4D69 / #6B7B8E / #F0F5F9 blue-greys,
  // which ignored dark mode and the brand entirely.
  const t = useTheme();

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('w-full', className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            `flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${t.glass} ${t.border} ${t.hoverBgSoft} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400`,
            open && 'rounded-b-none border-b-0',
            headerClassName
          )}
        >
          <div className="flex items-center gap-3">
            <div>
              <span className={`text-sm font-semibold ${t.textPrimary}`}>{title}</span>
              {description && (
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>{description}</p>
              )}
            </div>
            {badge}
          </div>
          <ChevronDown
            className={cn(
              `h-4 w-4 shrink-0 transition-transform duration-200 ${t.textFaint}`,
              open && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
        <div className={`rounded-b-lg border border-t-0 p-4 ${t.glass} ${t.border}`}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
