'use client';

import { ErrorShell } from '@/app/error-shared';

export default function ToolsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorShell
      heading="Something went wrong in Tools"
      detail="This Tools page hit an unexpected problem and could not be shown."
      digest={error.digest}
      onRetry={reset}
      homeHref="/tools"
    />
  );
}
