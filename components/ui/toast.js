// components/ui/toast.js
'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from '@/components/shared/theme';
import { cn } from '@/lib/utils';

const toastVariants = {
  default: 'bg-white border-gray-200',
  destructive: 'bg-red-50 border-red-200 text-red-900',
  success: 'bg-green-50 border-green-200 text-green-900',
};

const toastIcons = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle,
};

export function Toast({ title, description, variant = 'default', onClose }) {
  const Icon = toastIcons[variant] || toastIcons.default;

  return (
    <div
      className={cn(
        'border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300',
        toastVariants[variant]
      )}
    >
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm mt-1">{description}</div>}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-md p-1 hover:bg-gray-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}