// components/shared/ApprovalGate.tsx
// Full approval flow: auth check → role check → signature capture → confirm
'use client';
import { useState } from 'react';
import { Lock, ShieldAlert, LogIn, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
}: ApprovalGateProps) {
  const { user, profile, isAtLeast, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const isLoggedIn   = !!user && !loading;
  const isAuthorized = isLoggedIn && isAtLeast(requiredRole);
  const displayName  = profile?.full_name || user?.email?.split('@')[0] || '';

  const accentClass = variant === 'reject'
    ? 'border-rose-500/30 bg-rose-500/10'
    : variant === 'sign'
    ? 'border-[#86BBD8]/30 bg-[#86BBD8]/10'
    : 'border-emerald-500/30 bg-emerald-500/10';

  const handleSign = async (sig: SignatureResult) => {
    setSaving(true);
    try {
      await onConfirm(sig);
      setDone(true);
      setTimeout(onCancel, 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative oz-glass-panel rounded-2xl w-full max-w-md shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${accentClass}`}>
          <div className="flex items-center gap-3">
            {variant === 'reject'
              ? <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
              : variant === 'sign'
              ? <CheckCircle2 className="h-5 w-5 text-[#86BBD8] shrink-0" />
              : <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              {description && <p className="text-xs text-white/50 mt-0.5">{description}</p>}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Not logged in */}
          {!isLoggedIn && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Lock className="h-6 w-6 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Sign in required</p>
                <p className="text-white/50 text-sm mt-1">
                  You must be signed in as a <span className="text-[#86BBD8] font-medium">{ROLE_LABELS[requiredRole]}</span> or above to {actionLabel.toLowerCase().replace('sign & ', '')}.
                </p>
              </div>
              <button type="button" onClick={onCancel}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A4D69]/60 hover:bg-[#2A4D69]/80 border border-[#86BBD8]/35 text-white font-semibold text-sm transition-all">
                <LogIn className="h-4 w-4" /> Sign in to continue
              </button>
            </div>
          )}

          {/* Logged in but wrong role */}
          {isLoggedIn && !isAuthorized && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-rose-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Insufficient permissions</p>
                <p className="text-white/50 text-sm mt-1">
                  Your role (<span className="text-white/70 font-medium">{ROLE_LABELS[profile?.role ?? 'user']}</span>) cannot approve.
                  A <span className="text-[#86BBD8] font-medium">{ROLE_LABELS[requiredRole]}</span> or above is required.
                </p>
              </div>
              <button type="button" onClick={onCancel}
                className="px-5 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-white/70 hover:text-white text-sm font-medium transition-all">
                Close
              </button>
            </div>
          )}

          {/* Authorized — show signature pad */}
          {isLoggedIn && isAuthorized && !done && (
            <SignaturePad
              signerName={displayName}
              actionLabel={saving ? 'Saving…' : actionLabel}
              onSign={handleSign}
              onCancel={onCancel}
            />
          )}

          {/* Done */}
          {done && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-white font-semibold">Done</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
