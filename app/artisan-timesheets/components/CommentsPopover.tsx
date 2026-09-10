'use client';

import React, { useState } from 'react';
import { CenterModal, PrimaryButton, MessageSquare, useTheme } from '@/components/shared/theme';

interface CommentsPopoverProps {
  value: string;
  onChange: (value: string) => void;
  dateLabel: string;
}

export function CommentsPopover({ value, onChange, dateLabel }: CommentsPopoverProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openModal = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`w-full min-w-[200px] max-w-[320px] rounded px-1.5 py-1 text-left text-xs border border-transparent hover:border-brand-400/40 hover:bg-brand-500/5 ${t.inputBg}`}
        title={value ? 'Click to edit — scroll horizontally to read in full' : 'Add comments'}
      >
        {value ? (
          <span className="block overflow-x-auto whitespace-nowrap scrollbar-thin max-w-full">
            {value}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 opacity-50">
            <MessageSquare className="h-3 w-3" /> Notes…
          </span>
        )}
      </button>

      {open && (
        <CenterModal open onClose={() => setOpen(false)} title={`Comments — ${dateLabel}`} accent="violet" width="max-w-lg">
          <div className="p-4 space-y-3">
            <textarea
              rows={6}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Shift notes, callout details, leave reason, etc."
              className={`w-full rounded-xl px-3 py-2 text-sm resize-y min-h-[120px] outline-none border ${t.border} ${t.inputBg}`}
              aria-label="Day comments"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm rounded-lg">Cancel</button>
              <PrimaryButton size="md" onClick={() => { onChange(draft); setOpen(false); }}>Save</PrimaryButton>
            </div>
          </div>
        </CenterModal>
      )}
    </>
  );
}
