// components/app-shell/AccountMenu.tsx — the signed-in / signed-out slot at the end of the top bar.
// Auth behaviour is unchanged (signOut then reload; the sign-in dialog hosts AuthForm,
// 2FA lives in SecurityPanel).
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, StatusBadge } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/roles';
import { AuthForm } from './auth/AuthForm';
import { SecurityPanel } from './mfa-ui';

function Avatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'md' | 'lg' }) {
  const initials = name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  const box = size === 'lg' ? 'size-10 text-label' : 'size-8 text-caption';
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote avatar of arbitrary origin; sized by the box
    <img src={url} alt="" className={`${box} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} inline-flex shrink-0 items-center justify-center rounded-full bg-action font-sans font-semibold text-action-ink`}>{initials}</span>
  );
}

export function AccountMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const router = useRouter();
  const { user, profile, loading, signOut, isAtLeast } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);

  if (loading) return <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted" role="status" aria-label="Checking sign-in" />;

  if (!user) {
    return (
      <>
        <Button variant="ghost" icon="sign-in" onClick={() => setAuthMode('login')} className="max-sm:hidden">Sign in</Button>
        <Button variant="primary" onClick={() => setAuthMode('signup')}>
          <span className="sm:hidden">Join</span><span className="hidden sm:inline">Get started</span>
        </Button>
        <Dialog open={authMode !== null} onOpenChange={open => { if (!open) setAuthMode(null); }} title={authMode === 'signup' ? 'Create your account' : 'Sign in'} description="Use your MyOffice account." size="sm">
          {authMode && <AuthForm defaultMode={authMode} onClose={() => setAuthMode(null)} />}
        </Dialog>
      </>
    );
  }

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'User';
  const role = profile?.role ?? 'user';

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <IconButton icon="user" label={`Account menu for ${displayName}`} variant="shell" size="shell" />
        </MenuTrigger>
        <MenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={displayName} url={profile?.avatar_url ?? null} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-label font-semibold text-ink">{displayName}</p>
              <p className="truncate font-sans text-caption text-ink-muted">{user.email}</p>
            </div>
          </div>
          <div className="px-2.5 pb-2"><StatusBadge tone="neutral" icon="shield">{ROLE_LABELS[role]}</StatusBadge></div>
          <MenuSeparator />
          {isAtLeast('admin') && <MenuItem icon="admin-role" onSelect={() => router.push('/admin')}>Admin panel</MenuItem>}
          <MenuItem icon="settings" onSelect={onOpenSettings}>Settings</MenuItem>
          <MenuItem icon="lock" onSelect={() => setSecurityOpen(true)}>Security and two-factor sign-in</MenuItem>
          <MenuSeparator />
          <MenuItem icon="sign-out" tone="danger" onSelect={async () => { await signOut(); window.location.reload(); }}>Sign out</MenuItem>
        </MenuContent>
      </Menu>
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen} title="Security" description="Manage two-factor sign-in." size="sm">
        <SecurityPanel onDone={() => setSecurityOpen(false)} />
      </Dialog>
    </>
  );
}
