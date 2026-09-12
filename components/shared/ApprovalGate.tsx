// components/shared/ApprovalGate.tsx
// Full approval flow: auth check → role check → signature capture → confirm
'use client';
import { useState } from 'react';
import { Lock, ShieldAlert, LogIn, CheckCircle2, XCircle, Loader2, useTheme, accentText } from '@/components/shared/theme';
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
  /** Optional accent — 'approve' (emerald) | 'reject' (rose) */
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
  variant = 'approve',
  preferSavedSignature = false,
}: ApprovalGateProps) {
  const { user, profile, isAtLeast, loading } = useAuth();
  const t = useTheme();
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const isLoggedIn   = !!user && !loading;
  const isAuthorized = isLoggedIn && isAtLeast(requiredRole);
  const displayName  = profile?.full_name || user?.email?.split('@')[0] || '';

  const accentClass = variant === 'reject'
    ? 'border-rose-500/30 bg-rose-500/10'
    : variant === 'sign'
    ? 'border-brand-500/30 bg-brand-500/10'
    : 'border-emerald-500/30 bg-emerald-500/10';

  const handleSign = async (sig: SignatureResult) => {
    setSaving(true);
    try {
      await onConfirm(sig);
      setDone(true);
      setTimeout(onCancel, 450);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <button type="button" aria-label="Dismiss approval dialog" onClick={onCancel} className={`absolute inset-0 ${t.scrim} backdrop-blur-sm cursor-default`} />
      <div className={`relative ${t.glass} ${t.shadow} rounded-2xl w-full max-w-md z-10 overflow-hidden border ${t.border}`}>
        <div className={`px-6 py-4 border-b ${t.border} ${accentClass}`}>
          <div className="flex items-center gap-3">
            {variant === 'reject'
              ? <XCircle className={`h-5 w-5 shrink-0 ${accentText('rose', t.light)}`} />
              : variant === 'sign'
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
              : <CheckCircle2 className={`h-5 w-5 shrink-0 ${accentText('emerald', t.light)}`} />}
            <div>
              <h3 className={`text-base font-bold ${t.textPrimary}`}>{title}</h3>
              {description && <p className={`text-xs mt-0.5 ${t.textMuted}`}>{description}</p>}
            </div>
          </div>
        </div>

        <div className="p-6">
          {!isLoggedIn && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Lock className={`h-6 w-6 ${accentText('amber', t.light)}`} />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${t.textPrimary}`}>Sign in required</p>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  You must be signed in as a <span className="text-brand-500 font-medium">{ROLE_LABELS[requiredRole]}</span> or above to {actionLabel.toLowerCase().replace('sign & ', '')}.
                </p>
              </div>
              <button type="button" onClick={onCancel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110">
                <LogIn className="h-4 w-4" /> Sign in to continue
              </button>
            </div>
          )}

          {isLoggedIn && !isAuthorized && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                <ShieldAlert className={`h-6 w-6 ${accentText('rose', t.light)}`} />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${t.textPrimary}`}>Insufficient permissions</p>
                <p className={`text-sm mt-1 ${t.textMuted}`}>
                  Your role (<span className={`font-medium ${t.textSecondary}`}>{ROLE_LABELS[profile?.role ?? 'user']}</span>) cannot approve.
                  A <span className="text-brand-500 font-medium">{ROLE_LABELS[requiredRole]}</span> or above is required.
                </p>
              </div>
              <button type="button" onClick={onCancel}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${t.chipBg} ${t.textMuted} ${t.hoverText} border ${t.border}`}>
                Close
              </button>
            </div>
          )}

          {isLoggedIn && isAuthorized && !done && saving && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className={`h-8 w-8 animate-spin ${accentText('brand', t.light)}`} />
              <p className={`text-sm font-medium ${t.textPrimary}`}>Applying approval…</p>
              <p className={`text-xs ${t.textMuted}`}>This may take a moment for large selections.</p>
            </div>
          )}

          {isLoggedIn && isAuthorized && !done && !saving && (
            <SignaturePad
              signerName={displayName}
              userEmail={user?.email}
              actionLabel={actionLabel}
              onSign={handleSign}
              onCancel={onCancel}
              preferSaved={preferSavedSignature}
            />
          )}

          {done && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className={`h-7 w-7 ${accentText('emerald', t.light)}`} />
              </div>
              <p className={`font-semibold ${t.textPrimary}`}>Done</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
