// app/tools/ToolsAuth.tsx — sign in or sign up to the Tools workspace, the signed-in profile, and (for administrators) the
// account access list: each account's role, department and which gate-pass steps it may sign.
'use client';

import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Icon, Input, MetricGrid, MetricTile, Notice, Select, StatusBadge } from '@/components/ui-system';
import type { ApprovalRole } from './complianceTypes';
import type { AccountRole, WorkspaceAccount } from './prototype';

const APPROVAL_ROLES: Array<{ value: ApprovalRole; label: string }> = [{ value: 'hos', label: 'HOS' }, { value: 'hod', label: 'HOD' }, { value: 'security', label: 'Security' }, { value: 'finance', label: 'Finance' }, { value: 'general_manager', label: 'General manager' }];

const ROLE_OPTIONS = [{ value: 'viewer', label: 'Viewer · reads their department' }, { value: 'issuer', label: 'Issuer · records movements' }, { value: 'admin', label: 'Admin · manages the system' }];
const sameRoles = (left: ApprovalRole[], right: ApprovalRole[]) => left.length === right.length && left.every(role => right.includes(role));

/** One account: who it is, what it may do, which department it sees and which gate-pass steps it may sign. Apply is live only once something differs. */
function AccountAccessRow({ account, departments, resetRequested, onUpdate, onSetPassword }: { account: WorkspaceAccount; departments: string[]; resetRequested: boolean; onUpdate: (id: string, role: AccountRole, department?: string, approvalRoles?: ApprovalRole[]) => void | Promise<void>; onSetPassword: (id: string, password: string) => Promise<boolean> }) {
  const savedDepartment = account.department || departments[0] || 'Engineering';
  const [role, setRole] = useState<AccountRole>(account.role);
  const [department, setDepartment] = useState(savedDepartment);
  const [approvalRoles, setApprovalRoles] = useState<ApprovalRole[]>(account.approvalRoles || []);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  async function applyPassword() {
    if (newPassword.length < 6) { setResetError('Use at least 6 characters.'); return; }
    setResetBusy(true);
    try { if (await onSetPassword(account.id, newPassword)) { setResetting(false); setNewPassword(''); setResetError(''); } }
    finally { setResetBusy(false); }
  }
  const changed = role !== account.role || (role !== 'admin' && department !== savedDepartment) || !sameRoles(approvalRoles, account.approvalRoles || []);
  async function apply() { setSaving(true); try { await onUpdate(account.id, role, role === 'admin' ? undefined : department, approvalRoles); } finally { setSaving(false); } }
  return (
    <li className={`flex flex-col gap-4 rounded-card border bg-surface-raised p-4 ${changed ? 'border-action' : 'border-line-subtle'}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-action-soft text-ink"><Icon name="user" size="md" /></span>
        <span className="min-w-0"><strong className="block truncate font-sans text-body-sm font-semibold text-ink">{account.name}</strong><small className="font-sans text-caption text-ink-muted">{account.username}</small></span>
        {resetRequested && <StatusBadge tone="warning">Reset requested</StatusBadge>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Access"><Select aria-label={`Role for ${account.name}`} value={role} onValueChange={value => setRole(value as AccountRole)} options={ROLE_OPTIONS} /></Field>
        <Field label="Department">
          {role === 'admin'
            ? <span className="flex h-10 items-center font-sans text-body-sm text-ink-muted">All departments</span>
            : <Select aria-label={`Department for ${account.name}`} value={department} onValueChange={setDepartment} options={departments.map(value => ({ value, label: value }))} />}
        </Field>
      </div>
      <div role="group" aria-label={`Gate-pass signing roles for ${account.name}`} className="flex flex-col gap-2">
        <span className="font-sans text-label font-medium text-ink">Gate-pass signing</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {APPROVAL_ROLES.map(item => (
            <Checkbox key={item.value} label={item.label} aria-label={`${item.label} approval role for ${account.name}`} checked={approvalRoles.includes(item.value)}
              onChange={event => setApprovalRoles(current => event.target.checked ? [...current, item.value] : current.filter(value => value !== item.value))} />
          ))}
        </div>
      </div>
      {resetting && (
        <div className="flex flex-col gap-2 rounded-card border border-line-subtle p-3">
          <Field label={`New password for ${account.name}`} error={resetError}>
            <Input aria-label={`New password for ${account.name}`} type="password" autoComplete="new-password" placeholder="At least 6 characters" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
          </Field>
          <p className="font-sans text-caption text-ink-muted">They sign in with this password next time. Share it with them directly.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setResetting(false); setNewPassword(''); setResetError(''); }}>Cancel</Button>
            <Button type="button" variant="primary" disabled={resetBusy} onClick={() => void applyPassword()}>{resetBusy ? 'Setting…' : 'Set password'}</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {account.role === 'issuer' && !changed && <Button type="button" variant="ghost" onClick={() => { setRole('viewer'); void onUpdate(account.id, 'viewer', savedDepartment, approvalRoles); }}>Revoke issuing</Button>}
        {!resetting && <Button type="button" variant="ghost" onClick={() => setResetting(true)}>Set password</Button>}
        <Button variant={changed ? 'primary' : 'secondary'} disabled={!changed || saving} onClick={() => void apply()}>{saving ? 'Applying…' : changed ? 'Apply changes' : 'Up to date'}</Button>
      </div>
    </li>
  );
}

export function ToolsAccountAccess({ accounts, departments, requestUsernames, onUpdateRole, onSetPassword }: { accounts: WorkspaceAccount[]; departments: string[]; requestUsernames: string[]; onUpdateRole: (id: string, role: AccountRole, department?: string, approvalRoles?: ApprovalRole[]) => void | Promise<void>; onSetPassword: (id: string, password: string) => Promise<boolean> }) {
  const count = (role: AccountRole) => accounts.filter(account => account.role === role).length;
  const requested = new Set(requestUsernames.map(name => name.toLowerCase()));
  return (
    <section className="flex flex-col gap-4" aria-label="Account access">
      <MetricGrid compact>
        <MetricTile compact label={accounts.length === 1 ? 'Account' : 'Accounts'} value={accounts.length} />
        <MetricTile compact label={count('admin') === 1 ? 'Admin' : 'Admins'} value={count('admin')} />
        <MetricTile compact label={count('issuer') === 1 ? 'Issuer' : 'Issuers'} value={count('issuer')} />
        <MetricTile compact label={count('viewer') === 1 ? 'Viewer' : 'Viewers'} value={count('viewer')} />
      </MetricGrid>
      <Notice title="Decide who can see and change the register, which department they work in, and who may sign gate passes.">
        People outside the admin group only see their own department. A gate-pass signing role does not allow editing the register: it only lets that person sign that one step, after confirming their password or PIN.
      </Notice>
      <ul aria-label="Accounts" className="flex flex-col gap-3">
        {accounts.map(account => <AccountAccessRow key={account.id} account={account} departments={departments} resetRequested={requested.has(account.username.toLowerCase())} onUpdate={onUpdateRole} onSetPassword={onSetPassword} />)}
      </ul>
    </section>
  );
}

export function ToolsAuth({ accounts, currentAccount, onCreate, onLogin, onLogout, onCancel, onRequestReset, onChangePassword, allowCancel = true }: { accounts: WorkspaceAccount[]; currentAccount: WorkspaceAccount | null; onCreate: (account: WorkspaceAccount) => void | Promise<void>; onLogin: (username: string, password: string) => Promise<true | string>; onLogout: () => void; onCancel: () => void; onRequestReset: (username: string) => Promise<boolean>; onChangePassword: (currentPassword: string, newPassword: string) => Promise<true | string>; allowCancel?: boolean }) {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; username?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resetAsked, setResetAsked] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [brandNew, setBrandNew] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeBusy, setChangeBusy] = useState(false);
  async function askForReset() {
    if (username.trim().length < 3) { setFieldErrors(problems => ({ ...problems, username: 'Enter your username or email first.' })); return; }
    setResetBusy(true);
    try { if (await onRequestReset(username.trim())) setResetAsked(true); }
    finally { setResetBusy(false); }
  }
  async function applyChange() {
    if (!currentPassword) { setChangeError('Enter your current password.'); return; }
    if (brandNew.length < 6) { setChangeError('Use at least 6 characters.'); return; }
    setChangeBusy(true);
    try {
      const result = await onChangePassword(currentPassword, brandNew);
      if (result === true) { setChanging(false); setCurrentPassword(''); setBrandNew(''); setChangeError(''); }
      else setChangeError(result);
    } finally { setChangeBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's orange bubble.
    const problems: { name?: string; username?: string; password?: string } = {};
    if (mode === 'create' && name.trim().length < 2) problems.name = 'Enter your name.';
    if (username.trim().length < 3) problems.username = 'Enter your username or email.';
    if (!password) problems.password = 'Enter your password.';
    else if (password.length < 6) problems.password = 'Use at least 6 characters.';
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setBusy(true);
    try {
    if (mode === 'login') { const result = await onLogin(username, password); if (result !== true) setError(result); return; }
    if (accounts.some(account => account.username.toLowerCase() === username.trim().toLowerCase())) { setError('That username is already in use.'); return; }
    await onCreate({ id: crypto.randomUUID(), name: name.trim(), username: username.trim().toLowerCase(), password, role: 'viewer', canIssue: false });
    } finally { setBusy(false); }
  }
  if (currentAccount) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-action-soft text-ink"><Icon name="user" size="md" /></span>
          <div><strong className="block font-sans text-body-sm font-semibold text-ink">{currentAccount.name}</strong><small className="font-sans text-caption text-ink-muted">{currentAccount.username}</small></div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-body-sm">
          <dt className="text-ink-muted">Access</dt><dd className="text-ink">{currentAccount.role === 'admin' ? 'Administrator' : currentAccount.role === 'issuer' ? 'Issuer' : 'Viewer'}</dd>
          {currentAccount.department && <><dt className="text-ink-muted">Department</dt><dd className="text-ink">{currentAccount.department}</dd></>}
        </dl>
        <p className="font-sans text-caption text-ink-muted">This device keeps you signed in for up to seven days. Administrators manage permissions from Account access.</p>
        {changing ? (
          <div className="flex flex-col gap-3 rounded-card border border-line-subtle p-3">
            <Field label="Current password">
              <Input aria-label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            </Field>
            <Field label="New password">
              <Input aria-label="New password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={brandNew} onChange={event => setBrandNew(event.target.value)} />
            </Field>
            {changeError && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{changeError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setChanging(false); setCurrentPassword(''); setBrandNew(''); setChangeError(''); }}>Cancel</Button>
              <Button type="button" variant="primary" disabled={changeBusy} onClick={() => void applyChange()}>{changeBusy ? 'Changing…' : 'Change password'}</Button>
            </div>
          </div>
        ) : (
          <div><Button type="button" variant="secondary" onClick={() => setChanging(true)}>Change password</Button></div>
        )}
        <div className="flex justify-end gap-2 border-t border-line-subtle pt-4"><Button type="button" onClick={onCancel}>Close</Button><Button type="button" onClick={onLogout}>Sign out</Button></div>
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {mode === 'create' && <Field label="Your name" error={fieldErrors.name}><Input aria-label="Your name" placeholder="Your full name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></Field>}
      <Field label="Username or email" error={fieldErrors.username}><Input aria-label="Username or email" placeholder="Your username or email" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></Field>
      <Field label="Password" error={fieldErrors.password}><Input aria-label="Password" type="password" placeholder={mode === 'login' ? 'Enter your password' : 'Choose a password (6 or more characters)'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
      {mode === 'create' && <p className="font-sans text-caption text-ink-muted">New accounts start as Viewers. An administrator assigns the department and any issuing rights.</p>}
      {error && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{error}</p>}
      <p className="font-sans text-caption text-ink-muted">Your password is verified by the backend and is never stored in this browser.</p>
      {mode === 'login' && (resetAsked
        ? <p role="status" className="-mt-2 text-right font-sans text-caption text-ink-muted">Request sent — your administrator will set a new password and tell you.</p>
        : <p className="-mt-2 text-right font-sans text-caption"><button type="button" disabled={resetBusy} onClick={() => void askForReset()} className="focus-ring rounded-sm text-ink-muted underline underline-offset-2 hover:text-ink">{resetBusy ? 'Sending the request…' : 'Forgot your password?'}</button></p>
      )}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="flex justify-center gap-3">
          <Button type={mode === 'login' ? 'submit' : 'button'} variant={mode === 'login' ? 'primary' : 'secondary'} pending={busy && mode === 'login'} onClick={mode === 'login' ? undefined : () => { setMode('login'); setError(''); setFieldErrors({}); }}>{busy && mode === 'login' ? 'Signing in…' : 'Sign in'}</Button>
          <Button type={mode === 'create' ? 'submit' : 'button'} variant={mode === 'create' ? 'primary' : 'secondary'} pending={busy && mode === 'create'} onClick={mode === 'create' ? undefined : () => { setMode('create'); setError(''); setFieldErrors({}); }}>{busy && mode === 'create' ? 'Creating your account…' : 'Create account'}</Button>
        </div>
        {allowCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
