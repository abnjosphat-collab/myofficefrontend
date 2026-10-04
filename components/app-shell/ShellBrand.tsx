// components/app-shell/ShellBrand.tsx — the MyOffice mark + wordmark, one home link.
'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui-system';

export function ShellBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="MyOffice home" className="focus-ring touch-target -ml-1 flex items-center gap-2 rounded-control px-1 py-1">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-action text-action-ink">
        <Icon name="building" size="md" weight="emphasis" />
      </span>
      {!compact && <span className="hidden font-display sm:inline text-title font-semibold tracking-tight text-ink">MyOffice</span>}
    </Link>
  );
}
