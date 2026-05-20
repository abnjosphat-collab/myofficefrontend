'use client';

import { initials } from './utils';

interface AvatarInitialsProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function AvatarInitials({ name, size = 'md', className = '' }: AvatarInitialsProps) {
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-[#2A4D69]/60 border border-[#86BBD8]/20 flex items-center justify-center font-bold text-white shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  );
}
