// components/shared/SectionBadge.tsx — which engineering section a record belongs to (Mechanical, Electrical,
// General). A section is a category, not a state, so it is neutral with its icon; colour stays reserved for
// status (lib/status.ts). Unknown or legacy values still render, as written.
import { StatusBadge, type IconMeaning } from '@/components/ui-system';

const ICON: Record<string, IconMeaning> = { mechanical: 'mechanical', electrical: 'electrical', general: 'general' };

export function SectionBadge({ section, label }: { section?: string | null; label?: string }) {
  const value = (section ?? '').trim();
  if (!value) return <span className="text-ink-muted">Not set</span>;
  return <StatusBadge tone="neutral" icon={ICON[value.toLowerCase()]}>{label ?? value}</StatusBadge>;
}
