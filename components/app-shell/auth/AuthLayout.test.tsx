// components/app-shell/auth/AuthLayout.test.tsx — C8: the way back to Tools says
// it uses its own sign-in, and only renders when asked for.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthPage } from './AuthLayout';

describe('AuthPage back link (C8)', () => {
  it('links back to Tools with the separate-sign-in note', () => {
    render(<AuthPage back><p>sign in</p></AuthPage>);
    const link = screen.getByRole('link', { name: /Return to Tools & Equipment/ });
    expect(link).toHaveAttribute('href', '/tools');
    expect(link).toHaveTextContent('uses its own sign-in');
  });

  it('shows no way back without the back flag', () => {
    render(<AuthPage><p>sign in</p></AuthPage>);
    expect(screen.queryByRole('link', { name: /Tools & Equipment/ })).toBeNull();
  });
});
