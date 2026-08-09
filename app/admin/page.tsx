// app/admin/page.tsx — admin panel: user list + role & permission management
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Users, Search, ChevronDown, ChevronUp,
  Save, RefreshCw, AlertCircle, Check, UserPlus, Power, Key, MapPin,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, EmptyState,
  CenterModal, FormField, PrimaryButton, useConfirm,
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
  onSave: (id: string, role: UserRole) => Promise<void>;
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
    await onSave(profile.id, editRole);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
  const RoleIcon = Meta.icon;

  return (
    <div className={`border-b ${t.border} last:border-0 transition-colors ${expanded ? t.chipBg : ''}`}>
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColour(profile.email)}`}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : getInitials(profile.full_name, profile.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold truncate ${t.textPrimary}`}>{profile.full_name || profile.email.split('@')[0]}</span>
            {profile.id === currentUserId && <span className={`text-[10px] ${t.chipBg} ${t.textFaint} px-1.5 py-0.5 rounded-full`}>you</span>}
          </div>
          <div className={`text-xs truncate ${t.textFaint}`}>{profile.email}</div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {!profile.is_active && <StatusBadge color="#f43f5e" label="Deactivated" />}
          <StatusBadge color={Meta.hex} label={ROLE_LABELS[profile.role]} />
        </div>
        {canEdit && (
          <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse' : 'Edit role'}
            className={`h-7 w-7 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} flex items-center justify-center transition-all shrink-0`}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expanded && canEdit && (
        <div className="px-5 pb-5 pt-1">
          <div className="mb-4">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Role</p>
            <div className="flex flex-wrap gap-2">
              {(ROLE_ORDER as UserRole[]).filter(r => r !== 'super_admin' || currentRole === 'super_admin').map(r => {
                const M = ROLE_META[r];
                const RI = M.icon;
                const active = editRole === r;
                return (
                  <button key={r} type="button" onClick={() => setEditRole(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={active ? { background: `${M.hex}22`, color: M.hex, borderColor: `${M.hex}55` } : { background: t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)', borderColor: t.light ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)' }}>
                    <RI className="h-3 w-3" />{ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            <p className={`text-xs mt-1.5 ${t.textFaint}`}>{ROLE_META[editRole].desc}</p>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleToggleActive} disabled={togglingActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${profile.is_active ? `${t.chipBg} ${t.textMuted} border-transparent ${t.hoverBg}` : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25'}`}>
                {togglingActive ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                {profile.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button type="button" onClick={handleResetPassword} disabled={resettingPw}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-transparent transition-all ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}>
                {resettingPw ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                Reset password
              </button>
            </div>
            <button type="button" onClick={handleSave} disabled={!isDirty || saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-emerald-500/15 text-emerald-500' : isDirty ? 'bg-brand-500/20 hover:bg-brand-500/30 text-brand-500' : `${t.chipBg} ${t.textFaint} cursor-not-allowed`}`}>
              {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</> : saved ? <><Check className="h-3.5 w-3.5" />Saved</> : <><Save className="h-3.5 w-3.5" />Save changes</>}
            </button>
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [error, setError] = useState('');

  useEffect(() => { if (!loading && profile && !isAtLeast('admin')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    setError('');
    try {
      setUsers(await api.get<UserProfile[]>('/api/admin/users'));
    } catch (e) {
      setError((e as Error).message);
    }
    setFetching(false);
  }, []);

  useEffect(() => { if (!loading && profile && isAtLeast('admin')) fetchUsers(); }, [loading, profile, isAtLeast, fetchUsers]);

  const handleSave = async (id: string, role: UserRole) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch { /* surfaced via row state elsewhere */ }
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
      fetchUsers();
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

  if (loading || !profile) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <div className={`h-8 w-8 border-2 ${t.border} border-t-blue-500 rounded-full animate-spin`} />
      </main>
    );
  }

  if (!isAtLeast('admin')) return null;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Shield}
        accent="violet"
        crumbs={['Core Management', 'Admin Panel']}
        title="Admin Panel"
        description="User roles — permissions are determined entirely by role"
        statsOpen
        actions={
          <div className="flex items-center gap-2">
            {isAtLeast('admin') && (
              <button type="button" onClick={() => setInviteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
                <UserPlus className="h-3.5 w-3.5" /> Invite user
              </button>
            )}
            <button type="button" onClick={fetchUsers}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link href="/admin/lists"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText}`}>
              <MapPin className="h-3.5 w-3.5" /> Manage Shared Lists
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(ROLE_ORDER as UserRole[]).map(r => (
            <StatTile key={r} icon={ROLE_META[r].icon} color={ROLE_META[r].hex} label={ROLE_LABELS[r]} value={roleCounts[r] ?? 0} />
          ))}
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            <span className={`text-sm font-semibold ${t.textPrimary}`}>{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button type="button" onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${roleFilter === 'all' ? 'bg-brand-500/20 text-brand-500' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                All
              </button>
              {(ROLE_ORDER as UserRole[]).map(r => {
                const active = roleFilter === r;
                const hex = ROLE_META[r].hex;
                return (
                  <button key={r} type="button" onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${active ? '' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}
                    style={active ? { background: `${hex}22`, color: hex } : undefined}>
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-40" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mx-5 my-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {fetching ? (
          <div className={`flex items-center justify-center py-16 gap-3 ${t.textFaint} text-sm`}><RefreshCw className="h-5 w-5 animate-spin" /> Loading users…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div>{filtered.map(u => (
            <UserRow key={u.id} profile={u} currentUserId={profile.id} currentRole={profile.role}
              onSave={handleSave} onSetActive={handleSetActive} onResetPassword={handleResetPassword} />
          ))}</div>
        )}
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Role guide</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(ROLE_ORDER as UserRole[]).map(r => {
            const M = ROLE_META[r];
            const RI = M.icon;
            return (
              <div key={r} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: `${M.hex}12`, borderColor: `${M.hex}35` }}>
                <RI className="h-4 w-4 shrink-0 mt-0.5" style={{ color: M.hex }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: M.hex }}>{ROLE_LABELS[r]}</p>
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
            <input type="email" autoFocus value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className={`w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`} />
          </FormField>
          <FormField label="Role">
            <div className="flex flex-wrap gap-2">
              {(ROLE_ORDER as UserRole[]).filter(r => r !== 'super_admin' || profile.role === 'super_admin').map(r => {
                const M = ROLE_META[r];
                const RI = M.icon;
                const active = inviteRole === r;
                return (
                  <button key={r} type="button" onClick={() => setInviteRole(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={active ? { background: `${M.hex}22`, color: M.hex, borderColor: `${M.hex}55` } : { background: t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)', borderColor: t.light ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)' }}>
                    <RI className="h-3 w-3" />{ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            {(inviteRole === 'admin' || inviteRole === 'super_admin') && profile.role !== 'super_admin' && (
              <p className="text-xs mt-1.5 text-amber-500">Only a super_admin can invite at this role.</p>
            )}
          </FormField>
        </div>
        <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
          <button type="button" onClick={() => setInviteOpen(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>
            Cancel
          </button>
          <PrimaryButton onClick={handleInvite} size="md" fullWidth accent="violet" submitting={inviting} icon={UserPlus}>
            Send invite
          </PrimaryButton>
        </div>
      </CenterModal>
    </main>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
