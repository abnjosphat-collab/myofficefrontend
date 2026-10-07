// components/shared/ContactButtons.tsx — tap-to-call and WhatsApp actions for one
// person's phone field: a call button whenever any digits exist, plus WhatsApp
// when the primary number is a dialable international number. Renders nothing
// when the field is blank, so callers can drop it inline unconditionally.
'use client';

import { Icon, cn, iconButtonVariants } from '@/components/ui-system';
import { formatPhoneDisplay, telHref, whatsappHref } from '@/lib/phone';

export function ContactButtons({ phone, name, size = 'sm' }: {
  phone?: string | null;
  name: string;
  size?: 'sm' | 'md';
}) {
  const tel = telHref(phone);
  const wa = whatsappHref(phone);
  if (!tel && !wa) return null;
  const numbers = formatPhoneDisplay(phone);
  const on = numbers ? ` on ${numbers}` : '';
  const cls = cn(iconButtonVariants({ variant: 'ghost', size }));
  return (
    <span className="inline-flex items-center gap-1">
      {tel && (
        <a href={tel} aria-label={`Call ${name}${on}`} title={`Call ${name}${on}`} className={cls}>
          <Icon name="phone" size={size} />
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${name}${on}`} title={`WhatsApp ${name}${on}`} className={cls}>
          <Icon name="whatsapp" size={size} />
        </a>
      )}
    </span>
  );
}
