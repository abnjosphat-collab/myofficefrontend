'use client';

import { Plus } from '@/components/shared/theme';
import type { ElementType } from 'react';

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-8 w-8 text-white/15 mb-3" />
      <p className="text-white/40 text-sm mb-1">{title}</p>
      {message && <p className="text-white/25 text-xs mb-3">{message}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2A4D69]/50 border border-[#86BBD8]/20 text-white/70 hover:text-white hover:bg-[#2A4D69]/80 transition-all"
        >
          <Plus className="h-3 w-3" /> {action.label}
        </button>
      )}
    </div>
  );
}
