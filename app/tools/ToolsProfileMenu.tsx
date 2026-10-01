'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { ActionHint } from './ToolsUI';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import type { WorkspaceAccount } from './prototype';
import s from './tools.module.css';

const ROLE_LABELS = { admin: 'Administrator', issuer: 'Issuer', viewer: 'Viewer' } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase() || '?';
}

export function ToolsProfileMenu({ account, open, onOpenChange, onSignIn, onSignOut, duration }: {
  account: WorkspaceAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  duration: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    const closeAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== 'account') onOpenChange(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener(TOOLS_POPOVER_EVENT, closeAnother);
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener(TOOLS_POPOVER_EVENT, closeAnother);
      window.removeEventListener('keydown', closeEscape);
    };
  }, [onOpenChange]);
  useEffect(() => { if (!account) onOpenChange(false); }, [account, onOpenChange]);
  const toggle = () => {
    if (!account) { onSignIn(); return; }
    const next = !open;
    if (next) announceToolsPopover('account');
    onOpenChange(next);
  };
  return <div ref={root} className={s.accountShell}>
    <ActionHint label={account ? 'View your account, role or sign out.' : 'Sign in to save records.'}><button className={s.accountButton} aria-label={account ? `Account: ${account.name}` : 'Sign in'} aria-expanded={account ? open : undefined} aria-controls={account ? 'tools-profile' : undefined} onClick={toggle}><Icon name="user" size={16} /></button></ActionHint>
    <AnimatePresence>{account && open && <motion.div id="tools-profile" role="dialog" aria-label="Your profile" className={s.accountPanel} initial={{ opacity: 0, y: -5, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .98 }} transition={{ duration }}>
      <div className={s.notificationHeader}><span><strong>Profile</strong><small>{account.username}</small></span><button className={s.iconButton} aria-label="Close profile" onClick={() => onOpenChange(false)}><Icon name="close" size={15} /></button></div>
      <div className={s.profilePanelBody}>
        <div className={s.profileIdentity}><span className={s.profileAvatar} aria-hidden="true">{initials(account.name)}</span><div><strong>{account.name}</strong><small>{ROLE_LABELS[account.role]}{account.department ? ` · ${account.department}` : ''}</small></div></div>
        <dl className={s.profileDetails}><div><dt>Access</dt><dd>{ROLE_LABELS[account.role]}</dd></div>{account.department && <div><dt>Department</dt><dd>{account.department}</dd></div>}<div><dt>Session</dt><dd>This device · 7 days</dd></div></dl>
        <button type="button" className={`${s.secondary} ${s.profileSignout}`} onClick={() => { onOpenChange(false); onSignOut(); }}><Icon name="out" size={15} />Sign out</button>
      </div>
    </motion.div>}</AnimatePresence>
  </div>;
}
