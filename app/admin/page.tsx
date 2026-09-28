// app/admin/page.tsx — admin panel: user list + role & permission management
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Users, Save, RefreshCw, AlertCircle, Check, UserPlus, Power, Key, MapPin, Lock,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, EmptyState,
  CenterModal, FormField, Button, DisclosureButton, useConfirm, TYPE_WEIGHT,
} from '@/components/shared/theme';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { UserProfile, UserRole } from '@/lib/supabase';
// Role labels/order/meta come from the single source (lib/roles.ts).
import { ROLE_LABELS, ROLE_ORDER, ROLE_META } from '@/lib/roles';
import { api } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLOURS = ['bg-[#86BBD8] text-[#0d2035]', 'bg-emerald-500 text-white', 'bg-violet-500 text-white', 'bg-amber-500 text-white', 'bg-rose-500 text-white', 'bg-indigo-500 text-white'];
function avatarColour(email: string) {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

// ─── User row ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  profile: UserProfile; currentUserId: string; currentRole: UserRole;
  onSave: (id: string, role: UserRole) => Promise<boolean>;
  onSetActive: (id: string, active: boolean) => Promise<void>;
  onResetPassword: (id: string) => Promise<void>;
}

function UserRow({ profile, currentUserId, currentRole, onSave, onSetActive, onResetPassword }: UserRowProps) {
  const t = useTheme();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>(profile.role);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const canEdit = currentRole === 'super_admin' || (currentRole === 'admin' && profile.role !== 'super_admin' && profile.id !== currentUserId);
  const isDirty = editRole !== profile.role;

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(profile.id, editRole);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleToggleActive = async () => {
    const nextActive = !profile.is_active;
    if (!nextActive) {
      const ok = await confirm({
        title: 'Deactivate this user?',
        message: `${profile.full_name || profile.email} will be signed out and unable to sign back in until reactivated. This doesn't delete their account or history.`,
        destructive: true,
      });
      if (!ok) return;
    }
    setTogglingActive(true);
    await onSetActive(profile.id, nextActive);
    setTogglingActive(false);
  };

  const handleResetPassword = async () => {
    const ok = await confirm({
      title: 'Send password reset email?',
      message: `${profile.email} will receive a link to set a new password.`,
    });
    if (!ok) return;
    setResettingPw(true);
    await onResetPassword(profile.id);
    setResettingPw(false);
  };

  const Meta = ROLE_META[profile.role];

  return (
    <div className={`border-b ${t.border} last:border-0 transition-colors ${expanded ? t.chipBg : ''}`}>
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm ${TYPE_WEIGHT.bold} shrink-0 ${t.design === 'dallaglio' ? `${t.glassSoft} ${t.textMuted} border ${t.border}` : avatarColour(profile.email)}`}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : getInitials(profile.full_name, profile.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${TYPE_WEIGHT.semibold} truncate ${t.textPrimary}`}>{profile.full_name || profile.email.split('@')[0]}</span>
            {profile.id === currentUserId && <span className={`text-[10px] ${t.chipBg} ${t.textFaint} px-1.5 py-0.5 rounded-full`}>you</span>}
          </div>
          <div className={`text-xs truncate ${t.textFaint}`}>{profile.email}</div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {!profile.is_active && <StatusBadge color="#f43f5e" label="Deactivated" />}
          <StatusBadge color={t.design === 'dallaglio' ? 'var(--d-accent)' : Meta.hex} label={ROLE_LABELS[profile.role]} />
        </div>
        {canEdit && (
          <DisclosureButton open={expanded} onClick={() => setExpanded(!expanded)} label={`${profile.full_name || profile.email} account controls`} />
        )}
      </div>

      {expanded && canEdit && (
        <div className="px-5 pb-5 pt-1">
          <div className="mb-4">
            <p className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider mb-2 ${t.textFaint}`}>Role</p>
            <div className="flex flex-wrap gap-2">
              {(ROLE_ORDER as UserRole[]).filter(r => r !== 'super_admin' || currentRole === 'super_admin').map(r => {
                const M = ROLE_META[r];
                const RI = M.icon;
                const active = editRole === r;
                return (
                  <Button key={r} variant={active ? 'subtle' : 'secondary'} size="xs" pressed={active} onClick={() => { setEditRole(r); setSaved(false); }} icon={RI}
                    className={t.design === 'classic' ? 'rounded-xl' : ''}>
                    {ROLE_LABELS[r]}
                  </Button>
                );
              })}
            </div>
            <p className={`text-xs mt-1.5 ${t.textFaint}`}>{ROLE_META[editRole].desc}</p>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant={profile.is_active ? 'secondary' : 'subtle'} size="xs" onClick={handleToggleActive} disabled={togglingActive} submitting={togglingActive} icon={Power}>
                {profile.is_active ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button variant="secondary" size="xs" onClick={handleResetPassword} disabled={resettingPw} submitting={resettingPw} icon={Key}>
                Reset password
              </Button>
            </div>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!isDirty || saving} submitting={saving} icon={saved ? Check : Save}>
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminContent() {
  const t = useTheme();
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => { if (!loading && profile && !isAtLeast('admin')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  const fetchUsers = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (quiet) setRefreshing(true); else setFetching(true);
    setError('');
    try {
      const rows = await api.get<unknown>('/api/admin/users');
      if (!Array.isArray(rows)) throw new Error('User accounts returned an unexpected response.');
      if (id === requestId.current) setUsers(rows as UserProfile[]);
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load user accounts.');
    }
    if (id === requestId.current) { setFetching(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (!loading && profile && isAtLeast('admin')) fetchUsers(); }, [loading, profile, isAtLeast, fetchUsers]);

  const handleSave = async (id: string, role: UserRole) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      return true;
    } catch (e) {
      toast.error(`Could not save role: ${(e as Error).message}`);
      return false;
    }
  };

  const handleSetActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/api/admin/users/${id}/active`, { active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: active } : u));
      toast.success(active ? 'User reactivated' : 'User deactivated');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await api.post(`/api/admin/users/${id}/reset-password`);
      toast.success('Password reset email sent');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('user');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    setInviting(true);
    try {
      await api.post('/api/admin/users/invite', { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      void fetchUsers(true);
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setInviting(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLE_ORDER.reduce<Record<string, number>>((acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc; }, {});
  const initialUnavailable = Boolean(error) && users.length === 0;

  // loading resolves to false whether or not a session was found — "still
  // checking" and "checked, nobody's signed in" are genuinely different
  // states and need different UI, otherwise a signed-out visitor sees this
  // spinner forever (same gate-pattern bug as accounting.tsx/tasks-events.tsx,
  // found live on this page too, 2026-08-29 UI audit).
  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <div className={`h-8 w-8 border-2 ${t.border} border-t-blue-500 rounded-full animate-spin`} />
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <EmptyState icon={Lock} title="Sign in required" message="Sign in with an admin account (top right) to view the Admin Panel." />
      </main>
    );
  }

  if (!isAtLeast('admin')) return null;

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Shield}
        accent="violet"
        crumbs={['Core Management', 'Admin Panel']}
        title="Admin Panel"
        description="User roles — permissions are determined entirely by role"
        statsOpen
        actions={
          <div className="flex items-center gap-2">
            <Button icon={UserPlus} disabled={initialUnavailable} onClick={() => setInviteOpen(true)}>Invite user</Button>
            <Button variant="secondary" icon={RefreshCw} onClick={() => fetchUsers(true)} disabled={fetching || refreshing} submitting={fetching || refreshing}>Refresh</Button>
            <Button variant="secondary" icon={MapPin} href="/admin/lists">Manage shared lists</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(ROLE_ORDER as UserRole[]).map(r => (
            <StatTile key={r} icon={ROLE_META[r].icon} color={t.design === 'dallaglio' ? 'var(--d-accent)' : ROLE_META[r].hex} label={ROLE_LABELS[r]} value={fetching || initialUnavailable ? '—' : roleCounts[r] ?? 0} />
          ))}
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            <span className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{initialUnavailable ? 'Users unavailable' : `${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}`}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant={roleFilter === 'all' ? 'subtle' : 'secondary'} size="xs" pressed={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                All
              </Button>
              {(ROLE_ORDER as UserRole[]).map(r => {
                const active = roleFilter === r;
                return (
                  <Button key={r} variant={active ? 'subtle' : 'secondary'} size="xs" pressed={active} onClick={() => setRoleFilter(r)}>
                    {ROLE_LABELS[r]}
                  </Button>
                );
              })}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-40" />
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-2 mx-5 my-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{users.length ? `Accounts may be out of date. ${error}` : error}</span><Button variant="secondary" size="xs" onClick={() => fetchUsers(Boolean(users.length))}>Try again</Button>
          </div>
        )}

        {fetching ? (
          <div className={`flex items-center justify-center py-16 gap-3 ${t.textFaint} text-sm`}><RefreshCw className="h-5 w-5 animate-spin" /> Loading users…</div>
        ) : initialUnavailable ? (
          <EmptyState icon={Users} title="Users unavailable" message="Refresh to try loading accounts again." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={users.length ? 'No matching users' : 'No users found'} />
        ) : (
          <div>{filtered.map(u => (
            <UserRow key={u.id} profile={u} currentUserId={profile.id} currentRole={profile.role}
              onSave={handleSave} onSetActive={handleSetActive} onResetPassword={handleResetPassword} />
          ))}</div>
        )}
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <p className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider mb-3 ${t.textFaint}`}>Role guide</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(ROLE_ORDER as UserRole[]).map(r => {
            const M = ROLE_META[r];
            const RI = M.icon;
            return (
              <div key={r} className={`flex items-start gap-2.5 p-3 rounded-xl border ${t.design === 'dallaglio' ? `${t.glassSoft} ${t.border}` : ''}`} style={t.design === 'dallaglio' ? undefined : { background: `${M.hex}12`, borderColor: `${M.hex}35` }}>
                <RI className={`h-4 w-4 shrink-0 mt-0.5 ${t.design === 'dallaglio' ? t.textMuted : ''}`} style={t.design === 'dallaglio' ? undefined : { color: M.hex }} />
                <div>
                  <p className={`text-xs ${TYPE_WEIGHT.semibold} ${t.design === 'dallaglio' ? t.textPrimary : ''}`} style={t.design === 'dallaglio' ? undefined : { color: M.hex }}>{ROLE_LABELS[r]}</p>
                  <p className={`text-[11px] mt-0.5 ${t.textMuted}`}>{M.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CenterModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user" accent="violet">
        <div className="px-5 py-4 space-y-4">
          <FormField label="Email" required>
            <input type="email" aria-label="Email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className={`w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`} />
          </FormField>
          <FormField label="Role">
            <div className="flex flex-wrap gap-2">
              {(ROLE_ORDER as UserRole[]).filter(r => profile.role === 'super_admin' || (r !== 'super_admin' && r !== 'admin')).map(r => {
                const M = ROLE_META[r];
                const RI = M.icon;
                const active = inviteRole === r;
                return (
                  <Button key={r} variant={active ? 'subtle' : 'secondary'} size="xs" pressed={active} onClick={() => setInviteRole(r)} icon={RI}>
                    {ROLE_LABELS[r]}
                  </Button>
                );
              })}
            </div>
          </FormField>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
          <Button variant="secondary" onClick={() => setInviteOpen(false)} size="md" fullWidth>Cancel</Button>
          <Button onClick={handleInvite} size="md" fullWidth accent="violet" submitting={inviting} icon={UserPlus}>
            Send invite
          </Button>
        </div>
      </CenterModal>
    </main>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
