'use client';

import type { ReactNode } from 'react';
import { Button, IconButton, type ButtonSize } from '../primitives/Button';
import type { IconMeaning } from '../foundations/icon-meanings';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../overlays/Menu';

export interface ExportMenuItem {
  label: string;
  icon?: IconMeaning;
  disabled?: boolean;
  onSelect: () => void;
  /** Secondary text aligned to the right (a count, a format note). */
  hint?: ReactNode;
}

/** Shared trigger options; callers pass exactly one of `items` or `onPress` + `label`. */
export type ExportButtonCommon = {
  /** Leading icon. The export action everywhere; a file-type glyph only inside the menu. */
  icon?: IconMeaning;
  disabled?: boolean;
  /** Shows a spinner and blocks repeat activation. */
  pending?: boolean;
  /** Shows the check (swapped up-up): the file landed. Blocks repeat activation while shown. */
  success?: boolean;
  size?: ButtonSize;
  menuAlign?: 'start' | 'center' | 'end';
  className?: string;
  /** Icon-only trigger for dense table row actions ONLY (a docs check fails it
   *  elsewhere). Page and section exports are always labelled. */
  iconOnly?: boolean;
};

/**
 * The one export trigger. Menu mode (`items`) renders a labelled secondary
 * "Export" button with a caret; single mode (`onPress` + `label`) renders the
 * label ("Export Excel") with no menu. `DownloadButton` renders through this,
 * and bespoke exporters use it directly so every export looks the same.
 *
 * At 390 px and below a single-mode label shortens to `shortLabel`
 * ("Download"), never to a bare icon; the menu trigger already reads "Download".
 */
export function ExportButton(props: ExportButtonCommon & (
  | { items: ExportMenuItem[]; onPress?: never; label?: never; shortLabel?: never }
  | { onPress: () => void; label: string; shortLabel?: string; items?: never }
)) {
  const { icon = 'download', disabled = false, pending = false, success = false, size = 'md', menuAlign = 'end', className, iconOnly = false } = props;
  const iconSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';

  if (props.items) {
    const items = props.items;
    const trigger = iconOnly
      ? <IconButton icon={icon} label="Download" tooltip="Download" variant="shell" size={iconSize} pending={pending} success={success} className={className} />
      : <Button variant="secondary" size={size} icon={icon} iconAfter="chevron-down" disabled={disabled} pending={pending} success={success} className={className}>Download</Button>;
    return (
      <Menu>
        <MenuTrigger asChild>{trigger}</MenuTrigger>
        <MenuContent align={menuAlign} className="min-w-48">
          {items.map(item => <MenuItem key={item.label} icon={item.icon} hint={item.hint} disabled={item.disabled} onSelect={item.onSelect}>{item.label}</MenuItem>)}
        </MenuContent>
      </Menu>
    );
  }

  const { onPress, label, shortLabel = 'Download' } = props;
  if (iconOnly) {
    return <IconButton icon={icon} label={label} tooltip={label} variant="shell" size={iconSize} disabled={disabled} pending={pending} success={success} onClick={onPress} className={className} />;
  }
  const shortened = shortLabel !== label;
  return (
    <Button variant="secondary" size={size} icon={icon} disabled={disabled} pending={pending} success={success} onClick={onPress} className={className}>
      {shortened ? <span className="hidden min-[391px]:inline">{label}</span> : label}
      {shortened && <span className="min-[391px]:hidden">{shortLabel}</span>}
    </Button>
  );
}
