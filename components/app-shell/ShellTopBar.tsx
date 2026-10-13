// components/app-shell/ShellTopBar.tsx — the one top bar: brand, then notifications, settings and the account.
// Search lives at the top of the sidebar; Feedback floats at the bottom-right. No theme / icon-style / design switches.
'use client';

import Link from 'next/link';
import { IconButton, TopBar } from '@/components/ui-system';
import { AccountMenu } from './AccountMenu';
import { ShellNotifications } from './ShellNotifications';

export function ShellTopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <TopBar
      start={<Link href="/" className="focus-ring rounded-control px-1 py-0.5 font-sans text-title font-medium tracking-tight text-ink">MyOffice</Link>}
      end={(
        <>
          <ShellNotifications />
          <IconButton icon="settings" label="Settings" variant="shell" size="shell" onClick={onOpenSettings} />
          <AccountMenu onOpenSettings={onOpenSettings} />
        </>
      )}
    />
  );
}
