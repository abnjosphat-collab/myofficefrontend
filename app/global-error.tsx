// The last-resort boundary: it replaces the whole layout (including <html>), so it
// carries its own document shell and stylesheet import.
'use client';

import './globals.css';
import { ErrorShell } from './error-shared';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorShell
          heading="Something went wrong"
          detail="MyOffice hit an unexpected problem and could not be shown."
          digest={error.digest}
          onRetry={reset}
          homeHref="/"
        />
      </body>
    </html>
  );
}
