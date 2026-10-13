// app/tools/ToolsProfileMenu.tsx — who is signed in to Tools, their access, and sign out. With nobody signed in it is the
// sign-in button.
'use client';

import { Button, IconButton, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui-system';
import type { WorkspaceAccount } from './prototype';

const ROLE_LABELS = { admin: 'Administrator', issuer: 'Issuer', viewer: 'Viewer' } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase() || '?';
}

export function ToolsProfileMenu({ account, onSignIn, onSignOut }: { account: WorkspaceAccount | null; onSignIn: () => void; onSignOut: () => void }) {
  if (!account) return <IconButton icon="user" variant="ghost" label="Sign in" onClick={onSignIn} />;
  return (
    <Popover>
      <PopoverTrigger asChild><IconButton icon="user" variant="ghost" label={`Account: ${account.name}`} /></PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4" aria-label="Your profile">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--mo-action-soft)] font-sans text-body-sm font-semibold text-ink">{initials(account.name)}</span>
          <div className="min-w-0">
            <strong className="block truncate font-sans text-body-sm font-semibold text-ink">{account.name}</strong>
            <small className="block truncate font-sans text-caption text-ink-muted">{account.username}</small>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-body-sm">
          <dt className="text-ink-muted">Access</dt><dd className="text-ink">{ROLE_LABELS[account.role]}</dd>
          {account.department && <><dt className="text-ink-muted">Department</dt><dd className="text-ink">{account.department}</dd></>}
          <dt className="text-ink-muted">Session</dt><dd className="text-ink">This device · 7 days</dd>
        </dl>
        <PopoverClose asChild><Button className="mt-4 w-full" icon="sign-out" onClick={onSignOut}>Sign out</Button></PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
