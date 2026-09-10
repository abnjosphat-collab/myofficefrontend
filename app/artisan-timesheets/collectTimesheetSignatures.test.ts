import { describe, expect, it } from 'vitest';
import { getCompiledBySignatureReuse } from './collectTimesheetSignatures';

describe('getCompiledBySignatureReuse', () => {
  it('returns only the compiled-by signature for daily sign-in/out reuse', () => {
    const sig = 'data:image/png;base64,abc';
    expect(getCompiledBySignatureReuse(sig)).toEqual([{ label: 'Compiled by', dataUrl: sig }]);
    expect(getCompiledBySignatureReuse('')).toEqual([]);
  });
});
