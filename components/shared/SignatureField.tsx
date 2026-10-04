// components/shared/SignatureField.tsx — a signature slot: a button that shows the signature (or "Sign") and opens the signature
// pad in a dialog. The pad can reuse the compiler's signature for the daily sign-in and sign-out. Used for each day and for the four
// approvals at the foot of the timesheet.
'use client';

import { useMemo, useState } from 'react';
import { Button, Dialog, Icon, cn } from '@/components/ui-system';
import { SignaturePad, type SignatureReuseOption } from '@/components/shared/SignaturePad';
import { useAuth } from '@/lib/auth-context';

/** A signature is a PNG data URL kept in the timesheet, so it is shown as it is rather than through the image optimiser. */
function Ink({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}

export function SignatureField({ label, signerName, value, onChange, compact, reuseSignatures = [] }: {
  label: string; signerName: string; value: string; onChange: (dataUrl: string) => void; compact?: boolean; reuseSignatures?: SignatureReuseOption[];
}) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const reuse = useMemo(() => reuseSignatures.filter(o => o.dataUrl !== value), [reuseSignatures, value]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={value ? `${label}, signed. Change it` : `${label}, not signed. Add it`}
        className={cn('focus-ring inline-flex items-center justify-center gap-1 rounded-control border border-dashed border-line-strong px-2 font-sans text-caption text-ink-muted hover:bg-surface-subtle hover:text-ink', compact ? 'min-h-8' : 'min-h-10 w-full')}>
        {value ? <Ink src={value} className={cn('rounded-xs border border-line bg-white object-contain', compact ? 'h-6 max-w-[4.5rem]' : 'h-8 max-w-[7.5rem]')} /> : <><Icon name="edit" size="xs" /><span>Sign</span></>}
      </button>
      <Dialog open={open} onOpenChange={setOpen} size="md" title={label} description="Draw it, upload a scan, or use the saved signature." footer={value ? <Button variant="ghost" icon="delete" onClick={() => { onChange(''); setOpen(false); }}>Remove the signature</Button> : undefined}>
        {open && (
          <SignaturePad
            signerName={signerName || profile?.full_name || user?.email?.split('@')[0] || 'Signer'} userEmail={user?.email} actionLabel="Confirm signature" allowSaved defaultSaveForNextTime
            reuseSignatures={reuse} onCancel={() => setOpen(false)} onSign={async sig => { onChange(sig.dataUrl); setOpen(false); }}
          />
        )}
      </Dialog>
    </>
  );
}
