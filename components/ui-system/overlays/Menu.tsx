'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { COLLISION_PADDING, floatingSurface, optionRow } from './surfaces';

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;

export const MenuContent = forwardRef<ElementRef<typeof MenuPrimitive.Content>, ComponentPropsWithoutRef<typeof MenuPrimitive.Content>>(
  function MenuContent({ className, sideOffset = 6, align = 'end', ...props }, ref) {
    return (
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          align={align}
          collisionPadding={COLLISION_PADDING}
          className={cn(floatingSurface, 'min-w-48 max-w-[calc(100vw-1.5rem)] p-1', className)}
          {...props}
        />
      </MenuPrimitive.Portal>
    );
  },
);

export interface MenuItemProps extends Omit<ComponentPropsWithoutRef<typeof MenuPrimitive.Item>, 'children'> {
  icon?: IconMeaning;
  tone?: 'default' | 'danger';
  /** Secondary text aligned to the right (shortcut, count). */
  hint?: ReactNode;
  children: ReactNode;
}

export const MenuItem = forwardRef<ElementRef<typeof MenuPrimitive.Item>, MenuItemProps>(function MenuItem(
  { icon, tone = 'default', hint, className, children, ...props },
  ref,
) {
  return (
    <MenuPrimitive.Item ref={ref} className={cn(optionRow, 'pr-2.5', tone === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft', className)} {...props}>
      {icon && <Icon name={icon} size="sm" className={tone === 'danger' ? 'text-danger' : 'text-ink-muted'} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="ml-3 text-caption text-ink-muted">{hint}</span>}
    </MenuPrimitive.Item>
  );
});

export const MenuSeparator = ({ className }: { className?: string }) => (
  <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-line-subtle', className)} />
);

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <MenuPrimitive.Label className="px-2.5 py-1.5 font-sans text-caption font-medium text-ink-muted">{children}</MenuPrimitive.Label>
);
