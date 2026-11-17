/** A write may have committed, but no authoritative response was received. */
export class UnconfirmedMutationError extends Error {
  readonly outcome = 'unconfirmed';
  name = 'UnconfirmedMutationError';
}

/** A transport failure after a write is not proof that the write was refused. */
export function isUnconfirmedMutation(error: unknown): boolean {
  if (error instanceof UnconfirmedMutationError) return true;
  const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
  if (status) return status >= 500 || status === 408;
  return error instanceof TypeError || error instanceof SyntaxError ||
    (error instanceof Error && (['AbortError', 'TimeoutError'].includes(error.name) ||
      /failed to fetch|networkerror|network request failed|load failed|taking too long/i.test(error.message)));
}
