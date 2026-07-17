// lib/roles.ts — single source for role metadata (labels, badge styles, ordering,
// per-role icon/description). This was duplicated across app/admin/page.tsx,
// components/app-shell/AuthMenu.tsx, components/Header.tsx and
// components/shared/ApprovalGate.tsx. Import from here instead.
import type { UserRole } from '@/lib/supabase';
import { Crown, Star, Briefcase, UserCheck, Eye } from '@/components/shared/theme';
import type { ElementType } from 'react';

export type { UserRole };

/** Lowest → highest privilege. */
export const ROLE_ORDER: UserRole[] = ['viewer', 'user', 'manager', 'admin', 'super_admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
  viewer: 'Viewer',
};

/** Badge (chip) classes per role. Role colors are a SEMANTIC identity (distinct per
 *  role) and intentionally independent of the brand color. */
export const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-rose-500/20 text-rose-500 border border-rose-500/30',
  admin: 'bg-amber-500/20 text-amber-600 border border-amber-500/30',
  manager: 'bg-blue-500/20 text-blue-600 border border-blue-500/30',
  user: 'bg-gray-400/15 text-gray-500 border border-gray-400/20',
  viewer: 'bg-gray-400/10 text-gray-500 border border-gray-400/10',
};

/** Icon + hex + description per role (for the admin panel's richer rows). */
export const ROLE_META: Record<UserRole, { icon: ElementType; hex: string; desc: string }> = {
  super_admin: { icon: Crown, hex: '#f43f5e', desc: 'Full system access including role management' },
  admin: { icon: Star, hex: '#f59e0b', desc: 'Edit access to all modules, cannot manage roles' },
  manager: { icon: Briefcase, hex: '#3b82f6', desc: 'Approval rights for HR & operations' },
  user: { icon: UserCheck, hex: '#94a3b8', desc: 'Standard user — view + limited edit via permissions' },
  viewer: { icon: Eye, hex: '#64748b', desc: 'Read-only access across the platform' },
};

/** True if `role` is at or above `min` in ROLE_ORDER. */
export function roleAtLeast(role: UserRole, min: UserRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}
