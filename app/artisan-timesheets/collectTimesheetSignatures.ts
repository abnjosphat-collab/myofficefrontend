export interface SignatureReuseOption {
  label: string;
  dataUrl: string;
}

/** Daily sign-in/out may reuse the compiler's signature — the person preparing the timesheet. */
export function getCompiledBySignatureReuse(compiledBySignature: string): SignatureReuseOption[] {
  if (!compiledBySignature?.startsWith('data:image')) return [];
  return [{ label: 'Compiled by', dataUrl: compiledBySignature }];
}
