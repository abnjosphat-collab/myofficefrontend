// lib/roles.ts — single source for role metadata (labels, per-role icon/description). Import from here instead of repeating it.
//
// ROLE_ORDER/roleAtLeast themselves are NOT redefined here — they live in
// lib/supabase.ts (the more foundational file, alongside the UserRole type
// itself) and are re-exported below. This file previously had its own
// second copy of both, which is exactly the kind of drift risk role-order
// duplication creates — two lists that happen to agree today but have no
// mechanism keeping them that way.
import type { UserRole } from '@/lib/supabase';
export { ROLE_ORDER, roleAtLeast } from '@/lib/supabase';
import { Crown, Star, Briefcase, UserCheck, Eye } from '@/components/ui-system';
import type { ElementType } from 'react';

export type { UserRole };

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
  viewer: 'Viewer',
};

/** Icon and description per role (for the admin panel's richer rows). */
export const ROLE_META: Record<UserRole, { icon: ElementType; desc: string }> = {
  super_admin: { icon: Crown, desc: 'Full system access including role management' },
  admin: { icon: Star, desc: 'Manage accounts and roles below Super Admin; cannot edit their own role' },
  manager: { icon: Briefcase, desc: 'Approval rights for HR & operations' },
  user: { icon: UserCheck, desc: 'Standard user — view + limited edit via permissions' },
  viewer: { icon: Eye, desc: 'Read-only access across the platform' },
};
