// app/tools/ToolsModals.test.tsx — C8: the signed-out Tools screen says which
// system it is and links back to MyOffice, noting the separate sign-in.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolsModals } from './ToolsModals';
import type { ToolsWorkspace } from './useToolsWorkspace';

const signedOut = {
  modal: { kind: 'auth' },
  authenticationRequired: true,
  accounts: [],
  currentAccount: null,
  createAccount: vi.fn(),
  login: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  changePassword: vi.fn(),
} as unknown as ToolsWorkspace;

describe('ToolsModals signed-out screen (C8)', () => {
  it('names the Tools workspace and links back to MyOffice', () => {
    render(<ToolsModals w={signedOut} />);
    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Back to MyOffice (separate sign-in)' });
    expect(link).toHaveAttribute('href', '/');
  });
});
