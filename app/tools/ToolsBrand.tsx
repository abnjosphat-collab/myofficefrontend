// app/tools/ToolsBrand.tsx — the mark at the top of the Tools sidebar: the Dallaglio symbol beside the product name, one home link.
// MyOffice's own sidebar keeps ShellBrand; only the Tools workspace carries the Dallaglio symbol.
'use client';

import Link from 'next/link';
import { DallaglioMark } from '@/components/shared/DallaglioLogo';

export function ToolsBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="MyOffice home" className="focus-ring touch-target -ml-1 flex items-center gap-2 rounded-control px-1 py-1">
      <span className="inline-flex size-8 shrink-0 items-center justify-center"><DallaglioMark size={28} /></span>
      {!compact && <span className="hidden font-display sm:inline text-title font-semibold tracking-tight text-ink">MyOffice</span>}
    </Link>
  );
}
