// app/maintenance/SignOffField.tsx — the signature slot of a work-order sign-off. A sign-off is a drawn, uploaded or saved signature;
// sign-offs made before that were a typed name, which is still shown (as text) until the person signs again.
'use client';

import { SignatureField } from '@/components/shared/SignatureField';

export function SignOffField({ label, signerName, value, onChange }: { label: string; signerName: string; value: string; onChange: (value: string) => void }) {
  const legacy = value && !value.startsWith('data:image');
  return (
    <div className="flex flex-col gap-1">
      <SignatureField label={label} signerName={signerName} value={legacy ? '' : value} onChange={onChange} />
      {legacy && <p className="font-sans text-caption text-ink-muted">Earlier sign-off: typed name “{value}”. Sign to replace it.</p>}
    </div>
  );
}
