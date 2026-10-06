'use client';

import { Button } from '../primitives/Button';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../overlays/Menu';

export interface MoreMenuItem {
  label: string;
  icon?: IconMeaning;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * The "More" menu for a page's secondary actions: one quiet button instead of a row of equal-weight buttons, so the
 * page keeps a single primary action. Items are real menu items (keyboard, typeahead, focus return come from Menu).
 */
export function MoreMenu({ items, label = 'More', pending = false }: { items: MoreMenuItem[]; label?: string; pending?: boolean }) {
  if (items.length === 0) return null;
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button icon="more" iconAfter="chevron-down" pending={pending}>{label}</Button>
      </MenuTrigger>
      <MenuContent>
        {items.map(item => <MenuItem key={item.label} icon={item.icon} disabled={item.disabled} onSelect={item.onSelect}>{item.label}</MenuItem>)}
      </MenuContent>
    </Menu>
  );
}
