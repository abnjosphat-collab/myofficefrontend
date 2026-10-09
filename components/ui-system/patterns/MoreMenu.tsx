'use client';

import { Button, IconButton } from '../primitives/Button';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../overlays/Menu';

export interface MoreMenuItem {
  label: string;
  icon?: IconMeaning;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * The "More" menu for a page's secondary actions: one quiet control instead of a row of equal-weight buttons, so the
 * page keeps a single primary action. By default it is an icon with its label as the tooltip (the Tools header
 * control); `iconOnly={false}` shows the label for a spot where an icon alone would be unclear. Items are real menu
 * items (keyboard, typeahead, focus return come from Menu).
 */
export function MoreMenu({ items, label = 'More', pending = false, iconOnly = true }: { items: MoreMenuItem[]; label?: string; pending?: boolean; iconOnly?: boolean }) {
  if (items.length === 0) return null;
  return (
    <Menu>
      <MenuTrigger asChild>
        {iconOnly
          ? <IconButton icon="more" label={label} tooltip={label === 'More' ? 'More actions' : label} variant="shell" pending={pending} />
          : <Button icon="more" iconAfter="chevron-down" pending={pending}>{label}</Button>}
      </MenuTrigger>
      <MenuContent align="end">
        {items.map(item => <MenuItem key={item.label} icon={item.icon} disabled={item.disabled} onSelect={item.onSelect}>{item.label}</MenuItem>)}
      </MenuContent>
    </Menu>
  );
}
