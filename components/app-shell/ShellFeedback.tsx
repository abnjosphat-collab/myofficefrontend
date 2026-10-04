// components/app-shell/ShellFeedback.tsx — Feedback stays visible in the top bar (icon-only below sm,
// labelled from sm up). Same persistence as before: saveFeedback(page, rating, text) in lib/usage.
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Field, Icon, Popover, PopoverContent, PopoverTrigger, Textarea, cn } from '@/components/ui-system';
import { saveFeedback } from '@/lib/usage';

export function ShellFeedback() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [needsInput, setNeedsInput] = useState(false);

  const reset = () => { setRating(0); setText(''); setSent(false); setNeedsInput(false); };
  const onOpenChange = (next: boolean) => { setOpen(next); if (!next) reset(); };

  const send = () => {
    // Needs at least a rating or a comment (unchanged rule).
    if (!text.trim() && rating === 0) { setNeedsInput(true); return; }
    saveFeedback(pathname, rating, text);
    setSent(true);
    setTimeout(() => onOpenChange(false), 1600);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="shell" size="shell" icon="chat" aria-label="Feedback" className="max-sm:w-[34px] max-sm:px-0">
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {sent ? (
          <div role="status" className="flex items-start gap-2.5 py-1">
            <Icon name="success" size="lg" weight="emphasis" className="mt-0.5 text-success" />
            <div>
              <p className="font-sans text-label font-semibold text-ink">Thanks for the feedback</p>
              <p className="mt-0.5 font-sans text-body-sm text-ink-muted">Saved. It will not be lost if you close this tab.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-title font-semibold text-ink">Send feedback</h2>
              <p className="mt-0.5 font-sans text-caption text-ink-muted">About this page: {pathname}</p>
            </div>
            <div role="group" aria-label="Rating" className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setRating(n === rating ? 0 : n); setNeedsInput(false); }}
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                  aria-pressed={n <= rating}
                  className="focus-ring touch-target inline-flex size-8 items-center justify-center rounded-control hover:bg-surface-muted"
                >
                  <Icon name="starred" size="lg" weight={n <= rating ? 'emphasis' : 'control'} className={cn(n <= rating ? 'text-warning' : 'text-ink-subtle')} />
                </button>
              ))}
            </div>
            <Field label="What would make this better?" optional error={needsInput ? 'Add a rating or a comment first.' : undefined}>
              <Textarea rows={3} value={text} onChange={event => { setText(event.target.value); setNeedsInput(false); }} placeholder="Tell us what happened or what you need." />
            </Field>
            <Button variant="primary" fullWidth onClick={send}>Send feedback</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
