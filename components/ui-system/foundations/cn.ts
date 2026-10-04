import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge must know the UI system's custom scales. Without this, a role
 * size such as `text-body` is mistaken for a text colour and silently dropped
 * when combined with `text-ink` (or vice versa).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'page', 'section', 'title', 'body', 'body-sm', 'label', 'caption', 'metric', 'nav', 'spotlight', 'tip'],
      radius: ['control', 'card', 'panel', 'nav'],
      shadow: ['card', 'card-hover', 'popover', 'dialog', 'ring'],
      font: ['display'],
    },
  },
});

/** Compose class names; later utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
