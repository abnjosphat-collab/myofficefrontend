// lib/mfa.ts — thin wrappers around Supabase Auth's TOTP MFA (authenticator app).
// Supabase does all the crypto; the UI (Security dialog + login challenge) stays thin.
//
// PREREQUISITE: MFA must be switched on in the Supabase dashboard
// (Authentication → Multi-Factor Authentication → enable TOTP). That's a dashboard
// toggle, not code — enrollment calls fail until it's on.
//
// Flow reference:
//   enroll()  → returns a QR (SVG data-URI) + secret the user scans/keys into their app
//   verifyEnrollment(factorId, code) → confirms the first 6-digit code, activating the factor
//   challengeAndVerify(factorId, code) → the per-login step (aal1 → aal2)
//   unenroll(factorId) → disable 2FA
import { supabase } from '@/lib/supabase';

export interface EnrollResult {
  factorId: string;
  qrCode: string; // SVG data-URI to render
  secret: string; // manual-entry key
  uri: string;    // otpauth:// URI
}

export type Factor = {
  id: string;
  status: 'verified' | 'unverified';
  friendlyName?: string;
  createdAt?: string;
};

/** Begin TOTP enrollment. Returns the QR + secret to display. The factor is
 *  'unverified' until verifyEnrollment() succeeds. */
export async function enroll(friendlyName = 'Authenticator app'): Promise<EnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Confirm the first code from the authenticator app, activating the factor. */
export async function verifyEnrollment(factorId: string, code: string): Promise<void> {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code: code.trim(),
  });
  if (error) throw error;
}

/** The per-login step: challenge + verify a code to lift the session aal1 → aal2. */
export async function challengeAndVerify(factorId: string, code: string): Promise<void> {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code: code.trim(),
  });
  if (error) throw error;
}

/** Remove a factor (disable 2FA). */
export async function unenroll(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

/** List the current user's TOTP factors. */
export async function listFactors(): Promise<Factor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    status: f.status as Factor['status'],
    friendlyName: f.friendly_name ?? undefined,
    createdAt: f.created_at ?? undefined,
  }));
}

/** The single verified factor, if any (the app enrolls at most one). */
export async function getVerifiedFactor(): Promise<Factor | null> {
  const factors = await listFactors();
  return factors.find((f) => f.status === 'verified') ?? null;
}

/** True when the current session must still clear a 2FA challenge (aal1 → aal2). */
export async function needsChallenge(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
}
