'use client';

import { ErrorShell } from './error-shared';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorShell
      heading="Something went wrong on this page"
      detail="This page hit an unexpected problem and could not be shown."
      digest={error.digest}
      onRetry={reset}
      homeHref="/"
    />
  );
}
