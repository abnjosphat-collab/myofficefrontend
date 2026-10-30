// app/admin/page.tsx — admin panel: user list, role management, invitations
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell, CATEGORIES } from '@/components/app-shell';
import { Button, Card, Checkbox, DataRegion, DataTable, Dialog, EmptyState, Field, FormDialog, Input, MetricGrid, MetricTile, Notice, PageHeader, SearchField, Segmented, Select, StatusBadge, Tag, Toolbar, UpdatedCaption, deriveDataStatus, isTransientStatus, sortRows, useConfirm, type Column, type IconMeaning, type SortState, type Tone, LoadingPulse, ZoomLink } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { UserProfile, UserRole } from '@/lib/supabase';
// Role labels, order and descriptions come from the single source (lib/roles.ts).
import { ROLE_LABELS, ROLE_ORDER, ROLE_META } from '@/lib/roles';
import { useResetOnOpen } from '@/lib/useResetOnOpen';
import { profileLimit, profileModules } from '@/lib/scope';
import { SECTION_ORDER } from '@/lib/sections';

const ALL = '__all__';
const ROLE_UI: Record<UserRole, { tone: Tone; icon: IconMeaning }> = {
  super_admin: { tone: 'danger', icon: 'shield' }, admin: { tone: 'warning', icon: 'admin-role' }, manager: { tone: 'info', icon: 'user' },
  user: { tone: 'neutral', icon: 'user' }, viewer: { tone: 'neutral', icon: 'eye' },
};
const ROLES = ROLE_ORDER as UserRole[];
// Departments an account can be limited to. The server validates against its
// own list (SEPARATE_DEPARTMENTS in scope.py) and refuses anything else.
const DEPARTMENT_SCOPES = ['Mining'];
// The Mining account's modules: the register and PPE, nothing else.
const MINING_MODULES = ['/employees', '/ppe'];

const initials = (name: string | null, email: string) => (name ? name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : email.slice(0, 2).toUpperCase());
const RoleBadge = ({ role }: { role: UserRole }) => { const u = ROLE_UI[role] ?? ROLE_UI.user; return <StatusBadge tone={u.tone} icon={u.icon}>{ROLE_LABELS[role] ?? role}</StatusBadge>; };
const nameOf = (p: UserProfile) => p.full_name || p.email.split('@')[0];

/** What the signed-in person may change: a super admin anyone; an admin anyone except super admins and themselves. */
const canManage = (caller: UserProfile, target: UserProfile) => caller.role === 'super_admin' || (caller.role === 'admin' && target.role !== 'super_admin' && target.id !== caller.id);

type LimitKind = 'none' | 'section' | 'department';

function ManageDialog({ user, caller, onClose, onChanged }: { user: UserProfile | null; caller: UserProfile; onClose: () => void; onChanged: () => Promise<void> }) {
  const confirm = useConfirm();
  const [role, setRole] = useState<UserRole>('user');
  const [limitKind, setLimitKind] = useState<LimitKind>('none');
  const [section, setSection] = useState('');
  const [dept, setDept] = useState(DEPARTMENT_SCOPES[0]);
  const [modulesMode, setModulesMode] = useState<'full' | 'limited'>('full');
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<'save' | 'scope' | 'modules' | 'active' | 'reset' | 'mfa' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useResetOnOpen(user?.id ?? null, () => {
    if (!user) return;
    setRole(user.role);
    const limit = profileLimit(user);
    setLimitKind(!limit ? 'none' : limit.kind);
    setSection(limit?.kind === 'section' ? limit.value : '');
    setDept(limit?.kind === 'department' ? limit.value : DEPARTMENT_SCOPES[0]);
    const mods = profileModules(user);
    setModulesMode(mods ? 'limited' : 'full');
    setTicked(mods ? [...new Set(mods)] : []);
    setError(null);
  });

  const run = async (kind: 'save' | 'scope' | 'modules' | 'active' | 'reset' | 'mfa', action: () => Promise<void>, done: string) => {
    setBusy(kind); setError(null);
    try { await action(); toast.success(done); await onChanged(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };
  const toggleActive = async () => {
    if (!user) return;
    const next = !user.is_active;
    if (!next && !await confirm({ title: 'Deactivate this user?', message: `${nameOf(user)} will be signed out and unable to sign back in until reactivated. This does not delete their account or history.`, confirmLabel: 'Deactivate', destructive: true })) return;
    await run('active', () => api.patch(`/api/admin/users/${user.id}/active`, { active: next }).then(() => undefined), next ? 'User reactivated.' : 'User deactivated.');
  };
  const resetPassword = async () => {
    if (!user) return;
    if (!await confirm({ title: 'Send password reset email?', message: `${user.email} will receive a link to set a new password.`, confirmLabel: 'Send email' })) return;
    await run('reset', () => api.post(`/api/admin/users/${user.id}/reset-password`).then(() => undefined), 'Password reset email sent.');
  };
  const resetMfa = async () => {
    if (!user) return;
    if (!await confirm({ title: 'Turn off two-factor sign-in?', message: `${nameOf(user)} will be able to sign in with just their password until they enable 2FA again. Use this when they have lost their authenticator.`, confirmLabel: 'Turn off 2FA', destructive: true })) return;
    await run('mfa', () => api.delete(`/api/admin/users/${user.id}/factors`).then(() => undefined), 'Two-factor sign-in turned off.');
  };

  const currentLimit = user ? profileLimit(user) : null;
  const currentModules = user ? profileModules(user) : null;
  const currentKind: LimitKind = !currentLimit ? 'none' : currentLimit.kind;
  const limitDirty = limitKind !== currentKind
    || (limitKind === 'section' && section.trim() !== (currentLimit?.kind === 'section' ? currentLimit.value : ''))
    || (limitKind === 'department' && dept !== (currentLimit?.kind === 'department' ? currentLimit.value : DEPARTMENT_SCOPES[0]));
  const tickedSet = useMemo(() => new Set(ticked), [ticked]);
  const currentSet = useMemo(() => new Set(currentModules ?? []), [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const modulesDirty = (modulesMode === 'limited') !== (currentModules !== null)
    || (modulesMode === 'limited' && (tickedSet.size !== currentSet.size || [...tickedSet].some(m => !currentSet.has(m))));

  const saveLimit = async () => {
    if (!user) return;
    const body = limitKind === 'section' ? { scope: section.trim() || null } : limitKind === 'department' ? { department: dept } : { scope: null, department: null };
    const label = limitKind === 'section' ? (section.trim() || 'no limit') : limitKind === 'department' ? `${dept} register` : 'no limit';
    await run('scope', () => api.patch(`/api/admin/users/${user.id}/scope`, body).then(() => undefined), `Account limited to ${label}.`);
  };
  const saveModules = async () => {
    if (!user) return;
    const body = modulesMode === 'full' ? { modules: null } : { modules: [...tickedSet] };
    await run('modules', () => api.patch(`/api/admin/users/${user.id}/scope`, body).then(() => undefined), modulesMode === 'full' ? 'Full module access restored.' : `Account limited to ${tickedSet.size} ${tickedSet.size === 1 ? 'module' : 'modules'}.`);
  };
  const applyMiningPreset = () => {
    setLimitKind('department'); setDept('Mining'); setModulesMode('limited'); setTicked(MINING_MODULES);
  };
  const toggleTick = (href: string, on: boolean) => setTicked(prev => (on ? [...new Set([...prev, href])] : prev.filter(h => h !== href)));

  return (
    <Dialog
      open={!!user}
      onOpenChange={open => { if (!open && !busy) onClose(); }}
      dismissible={!busy}
      title={user ? `Manage ${nameOf(user)}` : 'Manage account'}
      description={user?.email}
      footer={user && (
        <>
          <Button onClick={onClose} disabled={!!busy}>Close</Button>
          <Button variant="primary" icon="save" disabled={role === user.role || !!busy} pending={busy === 'save'} onClick={() => run('save', () => api.patch(`/api/admin/users/${user.id}`, { role }).then(() => undefined), 'Role saved.')}>Save role</Button>
        </>
      )}
    >
      {user && (
        <div className="flex flex-col gap-5">
          {error && <Notice tone="danger" title="That did not work">{error}</Notice>}
          <div>
            <p className="mb-1.5 font-sans text-label font-medium text-ink">Role</p>
            <Segmented label="Role" value={role} onValueChange={setRole} options={ROLES.filter(r => r !== 'super_admin' || caller.role === 'super_admin').map(r => ({ value: r, label: ROLE_LABELS[r] }))} />
            <p className="mt-2 font-sans text-caption text-ink-muted">{ROLE_META[role].desc}</p>
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-label font-medium text-ink">Register limit</p>
              <Button size="sm" variant="ghost" icon="plus" disabled={!!busy} onClick={applyMiningPreset}>Mining account preset</Button>
            </div>
            <Segmented label="Register limit" value={limitKind} onValueChange={setLimitKind} options={[{ value: 'none', label: 'No limit' }, { value: 'section', label: 'Section' }, { value: 'department', label: 'Department' }]} />
            {limitKind === 'section' && (
              <div className="mt-2 flex gap-2">
                <Input aria-label="Section limit" list="manage-scope-sections" value={section} onChange={e => setSection(e.target.value)} placeholder="No limit" autoComplete="off" />
                <datalist id="manage-scope-sections" aria-label="Sections in use">{SECTION_ORDER.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
              </div>
            )}
            {limitKind === 'department' && (
              <div className="mt-2">
                <Select aria-label="Department limit" value={dept} onValueChange={setDept} options={DEPARTMENT_SCOPES.map(d => ({ value: d, label: `${d} register` }))} />
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Button pending={busy === 'scope'} disabled={!!busy || !limitDirty} onClick={saveLimit}>Save limit</Button>
              {currentLimit && limitKind !== 'none' && <Button disabled={!!busy} onClick={() => { setLimitKind('none'); }}>Lift limit</Button>}
            </div>
            <p className="mt-2 font-sans text-caption text-ink-muted">A section limit keeps full module access with filtered data; a department limit (Mining) puts the account on that register. The Mining preset also limits modules below.</p>
          </div>
          <div>
            <p className="mb-1.5 font-sans text-label font-medium text-ink">Modules</p>
            <Segmented label="Module access" value={modulesMode} onValueChange={setModulesMode} options={[{ value: 'full', label: 'Full access' }, { value: 'limited', label: 'Limited' }]} />
            {modulesMode === 'limited' && (
              <div className="mt-2 flex flex-col gap-3">
                {CATEGORIES.map(cat => (
                  <div key={cat.id}>
                    <p className="mb-1 font-sans text-caption font-medium text-ink-muted">{cat.title}</p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {cat.modules.map(m => (
                        <Checkbox key={m.href} label={m.title} checked={tickedSet.has(m.href)} onChange={e => toggleTick(m.href, e.target.checked)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Button pending={busy === 'modules'} disabled={!!busy || !modulesDirty} onClick={saveModules}>Save modules</Button>
            </div>
            <p className="mt-2 font-sans text-caption text-ink-muted">Limited accounts only see the ticked modules — everywhere: sidebar, search, home and quick actions. The server refuses the rest. Empty means no modules at all; Full access removes the limit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon="inactive" pending={busy === 'active'} disabled={!!busy} onClick={toggleActive}>{user.is_active ? 'Deactivate' : 'Reactivate'}</Button>
            <Button icon="key" pending={busy === 'reset'} disabled={!!busy} onClick={resetPassword}>Reset password</Button>
            <Button icon="lock" pending={busy === 'mfa'} disabled={!!busy} onClick={resetMfa}>Turn off 2FA</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function InviteDialog({ open, onOpenChange, caller, onInvited }: { open: boolean; onOpenChange: (open: boolean) => void; caller: UserProfile; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setEmail(''); setRole('user'); setTouched(false); } }
  const allowed = ROLES.filter(r => caller.role === 'super_admin' || (r !== 'super_admin' && r !== 'admin'));
  const submit = async () => {
    setTouched(true);
    if (!email.trim()) return false;
    await api.post('/api/admin/users/invite', { email: email.trim(), role });
    toast.success(`Invite sent to ${email.trim()}.`);
    onInvited();
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Invite user" description="They receive an email to set a password and sign in." submitLabel="Send invite" onSubmit={submit} size="sm" zoomId="admin:new-invite">
      <Field label="Email" required error={touched && !email.trim() ? 'Enter an email address.' : undefined}><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" /></Field>
      <div>
        <p className="mb-1.5 font-sans text-label font-medium text-ink">Role</p>
        <Segmented label="Invited role" value={role} onValueChange={setRole} options={allowed.map(r => ({ value: r, label: ROLE_LABELS[r] }))} />
        <p className="mt-2 font-sans text-caption text-ink-muted">{ROLE_META[role].desc}</p>
      </div>
    </FormDialog>
  );
}

function Directory({ caller }: { caller: UserProfile }) {
  const { items: users, loading, loaded, error, errorStatus, refetch, updatedAt } = useApiList<UserProfile>('/api/admin/users');
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState<string>(ALL);
  const [sort, setSort] = useState<SortState>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const managing = useMemo(() => users.find(u => u.id === managingId) ?? null, [users, managingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => (!q || (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) && (roleF === ALL || u.role === roleF));
  }, [users, search, roleF]);
  const rows = useMemo(() => sortRows(filtered, sort, (u, id) => (id === 'role' ? String(ROLES.indexOf(u.role)) : id === 'limit' ? (profileLimit(u)?.value ?? '') : id === 'modules' ? String(profileModules(u)?.length ?? -1) : id === 'name' ? nameOf(u).toLowerCase() : String(u[id as keyof UserProfile] ?? '').toLowerCase())), [filtered, sort]);
  const listCalm = JSON.stringify([search, roleF, sort]);
  const counts = (r: UserRole) => users.filter(u => u.role === r).length;

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || roleF !== ALL;

  const COLUMNS: Column<UserProfile>[] = [
    {
      id: 'name', header: 'User', sortable: true, sticky: true,
      cell: u => (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-soft font-sans text-caption font-semibold text-action">{initials(u.full_name, u.email)}</span>
          <span className="min-w-0"><span className="block truncate font-medium">{nameOf(u)}{u.id === caller.id && <span className="ml-2 font-normal text-ink-muted">(you)</span>}</span><span className="block truncate text-caption text-ink-muted">{u.email}</span></span>
        </span>
      ),
    },
    { id: 'role', header: 'Role', sortable: true, cell: u => <RoleBadge role={u.role} /> },
    {
      id: 'limit', header: 'Limit', sortable: true, hideBelow: 'lg',
      cell: u => {
        const l = profileLimit(u);
        if (!l) return <span className="font-sans text-caption text-ink-muted">All</span>;
        return l.kind === 'department' ? <span title="Department register"><Tag>{l.value} (dept)</Tag></span> : <Tag>{l.value}</Tag>;
      },
    },
    {
      id: 'modules', header: 'Modules', sortable: true, hideBelow: 'lg',
      cell: u => { const m = profileModules(u); return m ? <span title={m.join(', ')}><Tag>{m.length} {m.length === 1 ? 'module' : 'modules'}</Tag></span> : <span className="font-sans text-caption text-ink-muted">All</span>; },
    },
    { id: 'is_active', header: 'Status', sortable: true, hideBelow: 'md', cell: u => (u.is_active ? <StatusBadge tone="success" icon="active">Active</StatusBadge> : <StatusBadge tone="danger" icon="inactive">Deactivated</StatusBadge>) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Admin panel' }]}
        title="Admin panel"
        description="User roles, register limits and module access."
        actions={(
          <>
            <Button asChild variant="ghost"><Link href="/admin/lists">Manage shared lists</Link></Button>
            <ZoomLink zoomId="admin:new-invite" className="inline-block"><Button variant="primary" icon="plus" disabled={unavailable} onClick={() => setInviteOpen(true)}>Invite user</Button></ZoomLink>
          </>
        )}
      />

      <MetricGrid compact>
        {ROLES.map(r => <MetricTile compact key={r} label={ROLE_LABELS[r]} icon={ROLE_UI[r].icon} value={counts(r)} loading={pending} unavailable={unavailable} selected={roleF === r} onClick={() => setRoleF(roleF === r ? ALL : r)} />)}
      </MetricGrid>

      <Toolbar
        filtered={hasFilters}
        onClear={() => { setSearch(''); setRoleF(ALL); }}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name or email" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-44" aria-label="Filter by role" value={roleF} onValueChange={setRoleF} options={[{ value: ALL, label: 'All roles' }, ...ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="user accounts"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No matching users" description="Try a different search or role." action={<Button onClick={() => { setSearch(''); setRoleF(ALL); }}>Clear filters</Button>} />
          : <EmptyState icon="user" title="No users found" description="Invite the first user to get started." action={<ZoomLink zoomId="admin:new-invite" className="inline-block"><Button variant="primary" icon="plus" onClick={() => setInviteOpen(true)}>Invite user</Button></ZoomLink>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'user' : 'users'}{filtered.length !== users.length ? ` of ${users.length}` : ''}<UpdatedCaption at={updatedAt} /></p>
        <DataTable
          caption="User accounts"
          stillKey={listCalm}
          rows={rows}
          columns={COLUMNS}
          getRowId={u => u.id}
          sort={sort}
          onSortChange={setSort}
          rowActions={u => (canManage(caller, u)
            ? <Button size="sm" onClick={() => setManagingId(u.id)} aria-label={`Manage ${nameOf(u)}`}>Manage</Button>
            : <span className="font-sans text-caption text-ink-muted">View only</span>)}
        />
      </DataRegion>

      <section aria-labelledby="role-guide">
        <h2 id="role-guide" className="mb-3 font-display text-section font-semibold text-ink">Role guide</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(r => <Card key={r}><div className="flex flex-col items-start gap-1.5"><RoleBadge role={r} /><p className="font-sans text-body-sm text-ink-muted">{ROLE_META[r].desc}</p></div></Card>)}
        </div>
      </section>

      <ManageDialog user={managing} caller={caller} onClose={() => setManagingId(null)} onChanged={refetch} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} caller={caller} onInvited={() => refetch()} />
    </div>
  );
}

function AdminContent() {
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && profile && !isAtLeast('admin')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  // "Still checking" and "checked, nobody is signed in" are different states: a signed-out visitor must not see a spinner forever.
  if (loading) return <LoadingPulse label="Checking your access" />;
  if (!profile) return <EmptyState icon="lock" title="Sign in required" description="Sign in with an admin account (top right) to view the admin panel." />;
  if (!isAtLeast('admin')) return null;
  return <Directory caller={profile} />;
}

export default function AdminPage() {
  return <AppShell migrated><AdminContent /></AppShell>;
}
