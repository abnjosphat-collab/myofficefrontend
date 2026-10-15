// app/login-preview/layout.tsx — own chrome (see the OWN_CHROME list in scripts/docs-ledger.mjs): the preview draws its own full-viewport scene
// and card with no app shell. Like the other preview routes it stays behind sign-in; nothing here weakens auth.
export default function LoginPreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
