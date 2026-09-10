'use client';

import React, { useMemo, useState } from 'react';
import { CenterModal, PenLine } from '@/components/shared/theme';
import { SignaturePad, type SignatureResult, type SignatureReuseOption } from '@/components/shared/SignaturePad';
import { useAuth } from '@/lib/auth-context';

interface SignatureFieldModalProps {
  label: string;
  signerName: string;
  value: string;
  onChange: (dataUrl: string, sig?: SignatureResult) => void;
  compact?: boolean;
  reuseSignatures?: SignatureReuseOption[];
}

export function SignatureFieldModal({
  label,
  signerName,
  value,
  onChange,
  compact,
  reuseSignatures = [],
}: SignatureFieldModalProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const reuseOptions = useMemo(
    () => reuseSignatures.filter(opt => opt.dataUrl !== value),
    [reuseSignatures, value],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-xs transition-colors hover:border-brand-400 hover:bg-brand-500/5 ${compact ? 'min-h-[28px]' : 'min-h-[36px] w-full justify-center'}`}
        title={value ? 'Change signature' : 'Add signature'}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`object-contain bg-white border border-slate-200 rounded ${compact ? 'h-6 max-w-[72px]' : 'h-8 max-w-[120px]'}`} />
        ) : (
          <>
            <PenLine className="h-3.5 w-3.5 opacity-70" />
            <span>Sign</span>
          </>
        )}
      </button>

      {open && (
        <CenterModal open onClose={() => setOpen(false)} title={label} accent="blue" width="max-w-md">
          <div className="p-4">
            <SignaturePad
              signerName={signerName || profile?.full_name || user?.email?.split('@')[0] || 'Signer'}
              userEmail={user?.email}
              actionLabel="Confirm Signature"
              allowSaved
              defaultSaveForNextTime
              reuseSignatures={reuseOptions}
              onCancel={() => setOpen(false)}
              onSign={async sig => {
                onChange(sig.dataUrl, sig);
                setOpen(false);
              }}
            />
          </div>
        </CenterModal>
      )}
    </>
  );
}
