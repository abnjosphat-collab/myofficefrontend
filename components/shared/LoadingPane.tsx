'use client';

import { RefreshCw } from '@/components/shared/theme';

interface LoadingPaneProps {
  message?: string;
}

export function LoadingPane({ message = 'Loading…' }: LoadingPaneProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <RefreshCw className="h-6 w-6 animate-spin text-white/30 mb-3" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}
