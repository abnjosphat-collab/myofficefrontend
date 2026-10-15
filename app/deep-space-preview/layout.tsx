// app/deep-space-preview/layout.tsx — own chrome (see the OWN_CHROME list in scripts/docs-ledger.mjs):
// the preview renders its own full-viewport canvas and card with no app shell. It stays behind sign-in like
// the other preview route (/test-homepage); nothing here weakens auth.
export default function DeepSpacePreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
