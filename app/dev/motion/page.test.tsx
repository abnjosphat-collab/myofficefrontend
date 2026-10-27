// The motion gallery is signed-in admin only (via lib/roles.ts) and never in
// the nav; anyone else is sent home.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const authState: { profile: { role: string } | null; loading: boolean } = { profile: null, loading: true };
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => authState,
}));
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));
vi.mock('@/components/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import MotionGalleryPage from './page';

describe('Motion gallery gate', () => {
  it('shows every section to an admin', () => {
    authState.profile = { role: 'admin' };
    authState.loading = false;
    render(<MotionGalleryPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Motion gallery' })).toBeInTheDocument();
    for (const name of ['Springs', 'Animated icons', 'Icon swap', 'Numbers', 'Presence and lists', 'Data loading', 'Selection indicators', 'Overlays', 'Press', 'Effect matrix']) {
      expect(screen.getByRole('heading', { name }), name).toBeInTheDocument();
    }
    expect(screen.getByRole('checkbox', { name: 'Simulate reduced motion' })).toBeInTheDocument();
  });

  it('sends non-admins home with a lock message', () => {
    replace.mockClear();
    authState.profile = { role: 'viewer' };
    authState.loading = false;
    render(<MotionGalleryPage />);
    expect(screen.getByText('Admin access needed')).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('heading', { name: 'Springs' })).not.toBeInTheDocument();
  });

  it('treats super admins as admins (role order, not equality)', () => {
    authState.profile = { role: 'super_admin' };
    authState.loading = false;
    render(<MotionGalleryPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Motion gallery' })).toBeInTheDocument();
  });
});
