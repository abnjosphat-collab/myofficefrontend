// app/tools/ToolsAuth.tsx — sign in or sign up to the Tools workspace, the signed-in profile, and (for administrators) the
// account access list: each account's role, department and which gate-pass steps it may sign.
'use client';

import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Icon, Input, MetricGrid, MetricTile, Notice, Segmented, Select } from '@/components/ui-system';
import type { ApprovalRole } from './complianceTypes';
import type { AccountRole, WorkspaceAccount } from './prototype';

const APPROVAL_ROLES: Array<{ value: ApprovalRole; label: string }> = [{ value: 'hos', label: 'HOS' }, { value: 'hod', label: 'HOD' }, { value: 'security', label: 'Security' }, { value: 'finance', label: 'Finance' }, { value: 'general_manager', label: 'General manager' }];

const ROLE_OPTIONS = [{ value: 'viewer', label: 'Viewer · reads their department' }, { value: 'issuer', label: 'Issuer · records movements' }, { value: 'admin', label: 'Admin · manages the system' }];
const sameRoles = (left: ApprovalRole[], right: ApprovalRole[]) => left.length === right.length && left.every(role => right.includes(role));

/** One account: who it is, what it may do, which department it sees and which gate-pass steps it may sign. Apply is live only once something differs. */
function AccountAccessRow({ account, departments, onUpdate }: { account: WorkspaceAccount; departments: string[]; onUpdate: (id: string, role: AccountRole, department?: string, approvalRoles?: ApprovalRole[]) => void | Promise<void> }) {
  const savedDepartment = account.department || departments[0] || 'Engineering';
  const [role, setRole] = useState<AccountRole>(account.role);
  const [department, setDepartment] = useState(savedDepartment);
  const [approvalRoles, setApprovalRoles] = useState<ApprovalRole[]>(account.approvalRoles || []);
  const [saving, setSaving] = useState(false);
  const changed = role !== account.role || (role !== 'admin' && department !== savedDepartment) || !sameRoles(approvalRoles, account.approvalRoles || []);
  async function apply() { setSaving(true); try { await onUpdate(account.id, role, role === 'admin' ? undefined : department, approvalRoles); } finally { setSaving(false); } }
  return (
    <li className={`flex flex-col gap-4 rounded-card border bg-[var(--mo-surface-raised)] p-4 ${changed ? 'border-[var(--mo-action)]' : 'border-[var(--mo-line-subtle)]'}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--mo-action-soft)] text-ink"><Icon name="user" size="md" /></span>
        <span className="min-w-0"><strong className="block truncate font-sans text-body-sm font-semibold text-ink">{account.name}</strong><small className="font-sans text-caption text-ink-muted">{account.username}</small></span>
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
      <div className="flex flex-wrap justify-end gap-2">
        {account.role === 'issuer' && !changed && <Button type="button" variant="ghost" onClick={() => { setRole('viewer'); void onUpdate(account.id, 'viewer', savedDepartment, approvalRoles); }}>Revoke issuing</Button>}
        <Button variant={changed ? 'primary' : 'secondary'} disabled={!changed || saving} onClick={() => void apply()}>{saving ? 'Applying…' : changed ? 'Apply changes' : 'Up to date'}</Button>
      </div>
    </li>
  );
}

export function ToolsAccountAccess({ accounts, departments, onUpdateRole }: { accounts: WorkspaceAccount[]; departments: string[]; onUpdateRole: (id: string, role: AccountRole, department?: string, approvalRoles?: ApprovalRole[]) => void | Promise<void> }) {
  const count = (role: AccountRole) => accounts.filter(account => account.role === role).length;
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
        {accounts.map(account => <AccountAccessRow key={account.id} account={account} departments={departments} onUpdate={onUpdateRole} />)}
      </ul>
    </section>
  );
}

export function ToolsAuth({ accounts, currentAccount, onCreate, onLogin, onLogout, onCancel, allowCancel = true }: { accounts: WorkspaceAccount[]; currentAccount: WorkspaceAccount | null; onCreate: (account: WorkspaceAccount) => void | Promise<void>; onLogin: (username: string, password: string) => Promise<true | string>; onLogout: () => void; onCancel: () => void; allowCancel?: boolean }) {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (mode === 'login') { const result = await onLogin(username, password); if (result !== true) setError(result); return; }
    if (accounts.some(account => account.username.toLowerCase() === username.trim().toLowerCase())) { setError('That username is already in use.'); return; }
    await onCreate({ id: crypto.randomUUID(), name: name.trim(), username: username.trim().toLowerCase(), password, role: 'viewer', canIssue: false });
  }
  if (currentAccount) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-[var(--mo-action-soft)] text-ink"><Icon name="user" size="md" /></span>
          <div><strong className="block font-sans text-body-sm font-semibold text-ink">{currentAccount.name}</strong><small className="font-sans text-caption text-ink-muted">{currentAccount.username}</small></div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-body-sm">
          <dt className="text-ink-muted">Access</dt><dd className="text-ink">{currentAccount.role === 'admin' ? 'Administrator' : currentAccount.role === 'issuer' ? 'Issuer' : 'Viewer'}</dd>
          {currentAccount.department && <><dt className="text-ink-muted">Department</dt><dd className="text-ink">{currentAccount.department}</dd></>}
        </dl>
        <p className="font-sans text-caption text-ink-muted">This device keeps you signed in for up to seven days. Administrators manage permissions from Account access.</p>
        <div className="flex justify-end gap-2 border-t border-[var(--mo-line-subtle)] pt-4"><Button type="button" onClick={onCancel}>Close</Button><Button type="button" onClick={onLogout}>Sign out</Button></div>
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Segmented label="Account" value={mode} onValueChange={next => { setMode(next); setError(''); }} options={[{ value: 'login', label: 'Sign in' }, { value: 'create', label: 'Sign up' }]} />
      {mode === 'create' && <Field label="Your name"><Input aria-label="Your name" required minLength={2} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></Field>}
      <Field label="Username or email"><Input aria-label="Username or email" required minLength={3} value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></Field>
      <Field label="Password"><Input aria-label="Password" required minLength={6} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
      {mode === 'create' && <p className="font-sans text-caption text-ink-muted">New accounts start as Viewers. An administrator assigns the department and any issuing rights.</p>}
      {error && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{error}</p>}
      <p className="font-sans text-caption text-ink-muted">Your password is verified by the backend and is never stored in this browser.</p>
      <div className="flex justify-end gap-2 border-t border-[var(--mo-line-subtle)] pt-4">
        {allowCancel && <Button type="button" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">{mode === 'login' ? 'Sign in' : 'Sign up'}</Button>
      </div>
    </form>
  );
}
