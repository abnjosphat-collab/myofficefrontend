'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from '@/components/shared/theme';
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

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('w-full', className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left transition-colors hover:bg-[#F0F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A4D69]',
            open && 'rounded-b-none border-b-0',
            headerClassName
          )}
        >
          <div className="flex items-center gap-3">
            <div>
              <span className="text-sm font-semibold text-[#2A4D69]">{title}</span>
              {description && (
                <p className="text-xs text-[#6B7B8E] mt-0.5">{description}</p>
              )}
            </div>
            {badge}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[#6B7B8E] shrink-0 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
        <div className="rounded-b-lg border border-t-0 bg-white p-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
