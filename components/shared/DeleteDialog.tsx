'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { SECONDARY_BTN, DANGER_BTN } from './tokens';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  /** async fn that performs the delete — throw to show error, return to succeed */
  onDelete: () => Promise<void>;
  title?: string;
  description: string;
  confirmLabel?: string;
}

export function DeleteDialog({
  open,
  onClose,
  onDelete,
  title = 'Delete Record',
  description,
  confirmLabel = 'Delete',
}: DeleteDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <DialogTitle className="text-base font-bold text-white font-heading flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" /> {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/50 mt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${SECONDARY_BTN}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 ${DANGER_BTN}`}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
