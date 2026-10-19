// components/shared/DallaglioLogo.tsx — the Dallaglio logo (public/brand), as the full lockup (symbol, name and tagline) or the
// symbol alone. Both files are the supplied artwork on a transparent ground, so they sit on any surface. The images are
// decorative-sized fixed assets, so a plain <img> with explicit dimensions is used (the project does not use next/image).
import { cn } from '@/components/ui-system';

/** The "D" symbol on its own, for small spots such as the sidebar. Natural size 83 x 78. */
export function DallaglioMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/dallaglio-mark.png" alt="Dallaglio" width={Math.round(size * 83 / 78)} height={size} className={cn('shrink-0 select-none', className)} draggable={false} />
  );
}

/** The full lockup, for sign-in screens. Natural size 230 x 143; shown at half that so it stays sharp on high-density screens. */
export function DallaglioLogo({ className, width = 115 }: { className?: string; width?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/dallaglio-logo.png" alt="Dallaglio: mines are not found, they are built" width={width} height={Math.round(width * 143 / 230)} className={cn('select-none', className)} draggable={false} />
  );
}
