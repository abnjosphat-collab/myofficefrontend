// components/shared/ApprovalGate.tsx
// Full approval flow: auth check → role check → signature capture → confirm. The shell is the design system's Dialog, so it
// has a dialog role, traps focus, closes on Escape and the close button, and cannot be dismissed while the approval is applying.
'use client';
import { useState } from 'react';
import { Button, Dialog, Icon, Spinner } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { SignaturePad, type SignatureResult } from './SignaturePad';
import type { UserRole } from '@/lib/auth-context';

export type { SignatureResult };

interface ApprovalGateProps {
  /** Title shown at the top of the modal */
  title: string;
  /** Short description of what is being approved */
  description?: string;
  /** Label on the confirm button inside the signature pad */
  actionLabel?: string;
  /** Minimum role required to approve. Defaults to 'manager' */
  requiredRole?: UserRole;
  /** Called with the signature after auth + signature pass */
  onConfirm: (sig: SignatureResult) => Promise<void> | void;
  /** Called when the user dismisses the modal without approving */
  onCancel: () => void;
  /** 'approve' | 'reject' | 'sign': the wording of the sign-in message follows it */
  variant?: 'approve' | 'reject' | 'sign';
  /** Open straight into "Use saved signature" instead of "Draw now" — only
   *  takes effect if the signer actually has one on file. See SignaturePad. */
  preferSavedSignature?: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin', admin: 'Admin',
  manager: 'Manager', user: 'User', viewer: 'Viewer',
};

export function ApprovalGate({
  title, description, actionLabel = 'Sign & Approve',
  requiredRole = 'manager',
  onConfirm, onCancel,
  preferSavedSignature = false,
}: ApprovalGateProps) {
  const { user, profile, isAtLeast, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!user && !loading;
  const isAuthorized = isLoggedIn && isAtLeast(requiredRole);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || '';

  const handleSign = async (sig: SignatureResult) => {
    setSaving(true); setError(null);
    try {
      await onConfirm(sig);
      setDone(true);
      setTimeout(onCancel, 450);
    } catch (e) {
      // The caller has already said why; keep the gate open so the signature is not lost.
      setError((e as Error).message || 'The approval was not applied.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o && !saving) onCancel(); }} title={title} description={description} size="sm">
      {!isLoggedIn && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning"><Icon name="lock" size="xl" /></span>
          <div>
            <p className="font-sans text-body font-semibold text-ink">Sign in required</p>
            <p className="mt-1 font-sans text-body-sm text-ink-muted">You must be signed in as a {ROLE_LABELS[requiredRole]} or above to {actionLabel.toLowerCase().replace('sign & ', '').replace('sign and ', '')}.</p>
          </div>
          <Button variant="primary" icon="sign-in" onClick={onCancel}>Sign in to continue</Button>
        </div>
      )}

      {isLoggedIn && !isAuthorized && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger"><Icon name="shield" size="xl" /></span>
          <div>
            <p className="font-sans text-body font-semibold text-ink">Insufficient permissions</p>
            <p className="mt-1 font-sans text-body-sm text-ink-muted">Your role ({ROLE_LABELS[profile?.role ?? 'user']}) cannot approve. A {ROLE_LABELS[requiredRole]} or above is required.</p>
          </div>
          <Button onClick={onCancel}>Close</Button>
        </div>
      )}

      {isLoggedIn && isAuthorized && !done && saving && (
        <div className="flex flex-col items-center gap-3 py-8" role="status">
          <Spinner className="size-8 text-action" />
          <p className="font-sans text-body font-medium text-ink">Applying the approval…</p>
          <p className="font-sans text-body-sm text-ink-muted">This may take a moment for a large selection.</p>
        </div>
      )}

      {/* Stays mounted while the approval applies (hidden), so a refused approval leaves the signature as drawn. */}
      {isLoggedIn && isAuthorized && !done && (
        <div className={saving ? 'hidden' : 'flex flex-col gap-3'}>
          {error && <p role="alert" className="rounded-control border border-danger-line bg-danger-soft px-3 py-2 font-sans text-body-sm text-danger">{error}</p>}
          <SignaturePad signerName={displayName} userEmail={user?.email} actionLabel={actionLabel} onSign={handleSign} onCancel={onCancel} preferSaved={preferSavedSignature} />
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-3 py-6" role="status">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success"><Icon name="success" size="xl" weight="emphasis" /></span>
          <p className="font-sans text-body font-semibold text-ink">Done</p>
        </div>
      )}
    </Dialog>
  );
}
