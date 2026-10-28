// components/app-shell/auth/AuthLayout.test.tsx — C8: the way back to Tools says
// it uses its own sign-in, and only renders when asked for.
import { afterEach, describe, expect, it } from 'vitest';
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

describe('DeepSpaceStage theme (B5)', () => {
  afterEach(() => { localStorage.removeItem('myoffice.signin.theme'); localStorage.removeItem('myoffice_appearance_v1'); });
  const toggle = () => screen.getByRole('button', { name: /Switch to (light|dark)/ }).getAttribute('aria-label');

  it('follows the stored app darkness when no sign-in choice exists', () => {
    localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' }));
    const { unmount } = render(<AuthPage><p>sign in</p></AuthPage>);
    expect(toggle()).toBe('Switch to light');
    unmount();
    localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'sage', darkness: 'light' }));
    render(<AuthPage><p>sign in</p></AuthPage>);
    expect(toggle()).toBe('Switch to dark');
  });

  it('an explicit sign-in choice wins over the stored app darkness', () => {
    localStorage.setItem('myoffice_appearance_v1', JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' }));
    localStorage.setItem('myoffice.signin.theme', 'light');
    const { unmount } = render(<AuthPage><p>sign in</p></AuthPage>);
    expect(toggle()).toBe('Switch to dark');
    unmount();
    localStorage.setItem('myoffice.signin.theme', 'dark');
    localStorage.removeItem('myoffice_appearance_v1');
    render(<AuthPage><p>sign in</p></AuthPage>);
    expect(toggle()).toBe('Switch to light');
  });
});
