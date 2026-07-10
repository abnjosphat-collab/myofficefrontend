// app/admin/page.tsx — admin panel: user list + role & permission management
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Search, ChevronDown, ChevronUp,
  Save, RefreshCw, AlertCircle, Check, X,
  Crown, Star, Briefcase, UserCheck, Eye as EyeIcon,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, StatTile, StatusBadge, SearchInput, EmptyState } from '@/components/shared/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase, UserProfile, UserRole, ROLE_LABELS, ROLE_ORDER } from '@/lib/supabase';
import { MODULE_ACTIONS } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// ─── Role meta ────────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { icon: React.ElementType; hex: string; desc: string }> = {
  super_admin: { icon: Crown, hex: '#fb7185', desc: 'Full system access including role management' },
  admin: { icon: Star, hex: '#f59e0b', desc: 'Edit access to all modules, cannot manage roles' },
  manager: { icon: Briefcase, hex: '#86BBD8', desc: 'Approval rights for HR & operations' },
  user: { icon: UserCheck, hex: '#94a3b8', desc: 'Standard user — view + limited edit via permissions' },
  viewer: { icon: EyeIcon, hex: '#64748b', desc: 'Read-only access across the platform' },
};

const MODULE_LABELS: Record<string, string> = {
  employees: 'Personnel', equipment: 'Assets', inventory: 'Inventory', documents: 'Documents',
  maintenance: 'Maintenance', breakdowns: 'Breakdowns', spares: 'Spares', timesheets: 'Timesheets',
  overtime: 'Overtime', leaves: 'Leaves', ppe: 'PPE', sheq: 'SHEQ', reports: 'Reports', noticeboard: 'Notice Board',
};

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
  onSave: (id: string, role: UserRole, permissions: Record<string, string[]>) => Promise<void>;
}

function UserRow({ profile, currentUserId, currentRole, onSave }: UserRowProps) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>(profile.role);
  const [editPerms, setEditPerms] = useState<Record<string, string[]>>(profile.permissions ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canEdit = currentRole === 'super_admin' || (currentRole === 'admin' && profile.role !== 'super_admin' && profile.id !== currentUserId);
  const isDirty = editRole !== profile.role || JSON.stringify(editPerms) !== JSON.stringify(profile.permissions ?? {});

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
      return { ...prev, [module]: has ? existing.filter(a => a !== action) : [...existing, action] };
    });
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
        <div className="hidden sm:block shrink-0"><StatusBadge color={Meta.hex} label={ROLE_LABELS[profile.role]} /></div>
        {canEdit && (
          <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse' : 'Edit permissions'}
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

          {(editRole === 'user' || editRole === 'viewer' || editRole === 'manager') && (
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>
                Module permissions <span className={`ml-2 normal-case font-normal ${t.textFaint}`}>(admins get full access automatically)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(MODULE_ACTIONS).map(([mod, actions]) => {
                  const modPerms = editPerms[mod] ?? [];
                  return (
                    <div key={mod} className={`${t.chipBg} rounded-xl p-3 border ${t.border}`}>
                      <p className={`text-xs font-semibold mb-2 ${t.textMuted}`}>{MODULE_LABELS[mod] ?? mod}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map(action => {
                          const active = modPerms.includes(action);
                          return (
                            <button key={action} type="button" onClick={() => togglePerm(mod, action)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${active ? 'bg-blue-500/15 border-blue-500/40 text-blue-500' : `${t.chipBg} ${t.border} ${t.textFaint} ${t.hoverText}`}`}>
                              {active ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}{action}
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

          <div className="flex justify-end">
            <button type="button" onClick={handleSave} disabled={!isDirty || saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-emerald-500/15 text-emerald-500' : isDirty ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-500' : `${t.chipBg} ${t.textFaint} cursor-not-allowed`}`}>
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
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setUsers((data ?? []) as UserProfile[]);
    setFetching(false);
  }, []);

  useEffect(() => { if (!loading && profile && isAtLeast('admin')) fetchUsers(); }, [loading, profile, isAtLeast, fetchUsers]);

  const handleSave = async (id: string, role: UserRole, permissions: Record<string, string[]>) => {
    const { error } = await supabase.from('user_profiles').update({ role, permissions, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) setUsers(prev => prev.map(u => u.id === id ? { ...u, role, permissions } : u));
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
        description="User roles & module permissions"
        statsOpen
        actions={
          <button type="button" onClick={fetchUsers}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText}`}>
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
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
            <Users className="h-4 w-4 text-blue-500" />
            <span className={`text-sm font-semibold ${t.textPrimary}`}>{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button type="button" onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${roleFilter === 'all' ? 'bg-blue-500/20 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
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
          <div>{filtered.map(u => <UserRow key={u.id} profile={u} currentUserId={profile.id} currentRole={profile.role} onSave={handleSave} />)}</div>
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
    </main>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
