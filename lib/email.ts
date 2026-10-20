// lib/email.ts — one email-likeness check shared by sign-in and the employee form.

const EMAIL_LIKE = /^\S+@\S+\.\S+$/;

/** True when the value looks like an email address (the rule the sign-in form always used). */
export function isEmailLike(raw?: string | null): boolean {
  return EMAIL_LIKE.test((raw || '').trim());
}
