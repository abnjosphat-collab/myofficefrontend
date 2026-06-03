// app/admin/page.tsx — admin panel: user list + role & permission management
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Search, ChevronDown, ChevronUp,
  Save, RefreshCw, AlertCircle, Check, X,
  Crown, Star, Briefcase, UserCheck, Eye as EyeIcon,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';
import { supabase, UserProfile, UserRole, ROLE_LABELS, ROLE_ORDER } from '@/lib/supabase';
import { MODULE_ACTIONS } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Role meta ────────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { icon: React.ElementType; color: string; badge: string; desc: string }> = {
  super_admin: {
    icon: Crown,
    color: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-200 border border-rose-500/35',
    desc: 'Full system access including role management',
  },
  admin: {
    icon: Star,
    color: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-200 border border-amber-500/35',
    desc: 'Edit access to all modules, cannot manage roles',
  },
  manager: {
    icon: Briefcase,
    color: 'text-[#86BBD8]',
    badge: 'bg-[#86BBD8]/20 text-[#86BBD8] border border-[#86BBD8]/35',
    desc: 'Approval rights for HR & operations',
  },
  user: {
    icon: UserCheck,
    color: 'text-white/70',
    badge: 'bg-white/10 text-white/70 border border-white/20',
    desc: 'Standard user — view + limited edit via permissions',
  },
  viewer: {
    icon: EyeIcon,
    color: 'text-white/40',
    badge: 'bg-white/05 text-white/40 border border-white/10',
    desc: 'Read-only access across the platform',
  },
};

// ─── Module display names ─────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  employees:   'Personnel',
  equipment:   'Assets',
  inventory:   'Inventory',
  documents:   'Documents',
  maintenance: 'Maintenance',
  breakdowns:  'Breakdowns',
  spares:      'Spares',
  timesheets:  'Timesheets',
  overtime:    'Overtime',
  leaves:      'Leaves',
  ppe:         'PPE',
  sheq:        'SHEQ',
  reports:     'Reports',
  noticeboard: 'Notice Board',
};

// ─── Avatar initials helper ───────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

// ─── Avatar colour (deterministic from email) ─────────────────────────────────

const AVATAR_COLOURS = [
  'bg-[#86BBD8] text-[#0d2035]',
  'bg-emerald-500 text-white',
  'bg-violet-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-indigo-500 text-white',
];
function avatarColour(email: string) {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

// ─── User row ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  profile:        UserProfile;
  currentUserId:  string;
  currentRole:    UserRole;
  onSave:         (id: string, role: UserRole, permissions: Record<string, string[]>) => Promise<void>;
}

function UserRow({ profile, currentUserId, currentRole, onSave }: UserRowProps) {
  const [expanded,    setExpanded]    = useState(false);
  const [editRole,    setEditRole]    = useState<UserRole>(profile.role);
  const [editPerms,   setEditPerms]   = useState<Record<string, string[]>>(profile.permissions ?? {});
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const canEdit = currentRole === 'super_admin'
    || (currentRole === 'admin' && profile.role !== 'super_admin' && profile.id !== currentUserId);

  const isDirty = editRole !== profile.role
    || JSON.stringify(editPerms) !== JSON.stringify(profile.permissions ?? {});

  const handleSave = async () => {
    setSaving(true);
    await onSave(profile.id, editRole, editPerms);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePerm = (module: string, action: string) => {
    setEditPerms(prev => {
      const existing = prev[module] ?? [];
      const has = existing.includes(action);
      return {
        ...prev,
        [module]: has ? existing.filter(a => a !== action) : [...existing, action],
      };
    });
  };

  const Meta = ROLE_META[profile.role];
  const RoleIcon = Meta.icon;

  return (
    <div className={`border-b border-white/[0.06] last:border-0 transition-colors ${expanded ? 'bg-white/[0.03]' : ''}`}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Avatar */}
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColour(profile.email)}`}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            : getInitials(profile.full_name, profile.email)
          }
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">
              {profile.full_name || profile.email.split('@')[0]}
            </span>
            {profile.id === currentUserId && (
              <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">you</span>
            )}
          </div>
          <div className="text-xs text-white/40 truncate">{profile.email}</div>
        </div>

        {/* Role badge */}
        <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold shrink-0 ${Meta.badge}`}>
          <RoleIcon className="h-3 w-3" />
          {ROLE_LABELS[profile.role]}
        </div>

        {/* Expand / edit */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-white/60 hover:text-white flex items-center justify-center transition-all shrink-0"
            aria-label={expanded ? 'Collapse' : 'Edit permissions'}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Edit panel */}
      {expanded && canEdit && (
        <div className="px-5 pb-5 pt-1">
          {/* Role picker */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Role</p>
            <div className="flex flex-wrap gap-2">
              {(ROLE_ORDER as UserRole[])
                // super_admin can only be assigned by super_admin
                .filter(r => r !== 'super_admin' || currentRole === 'super_admin')
                .map(r => {
                  const M = ROLE_META[r];
                  const RI = M.icon;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        editRole === r ? M.badge : 'bg-white/[0.05] text-white/40 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <RI className="h-3 w-3" />
                      {ROLE_LABELS[r]}
                    </button>
                  );
                })
              }
            </div>
            <p className="text-xs text-white/30 mt-1.5">{ROLE_META[editRole].desc}</p>
          </div>

          {/* Per-module permissions (only meaningful for user/viewer roles) */}
          {(editRole === 'user' || editRole === 'viewer' || editRole === 'manager') && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Module permissions
                <span className="ml-2 text-white/30 normal-case font-normal">(admins get full access automatically)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(MODULE_ACTIONS).map(([mod, actions]) => {
                  const modPerms = editPerms[mod] ?? [];
                  return (
                    <div key={mod} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs font-semibold text-white/70 mb-2">{MODULE_LABELS[mod] ?? mod}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map(action => {
                          const active = modPerms.includes(action);
                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() => togglePerm(mod, action)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${
                                active
                                  ? 'bg-[#86BBD8]/20 border-[#86BBD8]/40 text-[#86BBD8]'
                                  : 'bg-white/[0.04] border-white/10 text-white/35 hover:text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {active ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                              {action}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                saved
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : isDirty
                  ? 'bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white'
                  : 'bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving…</>
              ) : saved ? (
                <><Check className="h-3.5 w-3.5" />Saved</>
              ) : (
                <><Save className="h-3.5 w-3.5" />Save changes</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();

  const [users,       setUsers]       = useState<UserProfile[]>([]);
  const [fetching,    setFetching]    = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState<UserRole | 'all'>('all');
  const [error,       setError]       = useState('');

  // Guard: redirect non-admins
  useEffect(() => {
    if (!loading && profile && !isAtLeast('admin')) {
      router.replace('/');
    }
  }, [loading, profile, isAtLeast, router]);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    setError('');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setUsers((data ?? []) as UserProfile[]);
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!loading && profile && isAtLeast('admin')) fetchUsers();
  }, [loading, profile, isAtLeast, fetchUsers]);

  const handleSave = async (id: string, role: UserRole, permissions: Record<string, string[]>) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, permissions, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role, permissions } : u));
    }
  };

  // Derived
  const filtered = users.filter(u => {
    const matchSearch = !search
      || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLE_ORDER.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  // Loading / access states
  if (loading || !profile) {
    return (
      <PageShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-white/20 border-t-[#86BBD8] rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!isAtLeast('admin')) return null;

  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className="relative text-white">
          <div className="container mx-auto px-4 pt-6 pb-3">
            <div className="oz-glass-dark rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#86BBD8]/15">
                    <Shield className="h-5 w-5 text-[#86BBD8]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold font-heading">Admin Panel</h1>
                    <p className="text-xs text-white/50">User roles & module permissions</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchUsers}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white/70 hover:text-white text-xs font-medium transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Role stats row */}
              <div className="border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-white/[0.08]">
                {(ROLE_ORDER as UserRole[]).map(r => {
                  const M = ROLE_META[r];
                  const RI = M.icon;
                  return (
                    <div key={r} className="flex flex-col items-center py-3 gap-1">
                      <RI className={`h-4 w-4 ${M.color}`} />
                      <span className="text-xl font-bold text-white">{roleCounts[r] ?? 0}</span>
                      <span className="text-[10px] text-white/40 font-medium">{ROLE_LABELS[r]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Users panel ── */}
        <section className="container mx-auto px-4 pb-8">
          <div className="oz-glass-panel rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#86BBD8]" />
                <span className="text-sm font-semibold text-white">
                  {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Role filter chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      roleFilter === 'all'
                        ? 'bg-[#86BBD8]/30 border-[#86BBD8]/45 text-white'
                        : 'bg-white/[0.05] border-white/12 text-white/55 hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  {(ROLE_ORDER as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        roleFilter === r
                          ? ROLE_META[r].badge
                          : 'bg-white/[0.05] border-white/12 text-white/55 hover:bg-white/10'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/12 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50 w-40"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 mx-5 my-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* User list */}
            {fetching ? (
              <div className="flex items-center justify-center py-16 gap-3 text-white/40 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading users…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/30">
                <Users className="h-8 w-8" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div>
                {filtered.map(u => (
                  <UserRow
                    key={u.id}
                    profile={u}
                    currentUserId={profile.id}
                    currentRole={profile.role}
                    onSave={handleSave}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Role guide */}
          <div className="mt-4 oz-glass-dark rounded-2xl p-5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Role guide</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(ROLE_ORDER as UserRole[]).map(r => {
                const M = ROLE_META[r];
                const RI = M.icon;
                return (
                  <div key={r} className={`flex items-start gap-2.5 p-3 rounded-xl border ${M.badge}`}>
                    <RI className={`h-4 w-4 shrink-0 mt-0.5 ${M.color}`} />
                    <div>
                      <p className="text-xs font-semibold">{ROLE_LABELS[r]}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{M.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
    </PageShell>
  );
}
