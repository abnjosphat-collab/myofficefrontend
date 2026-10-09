'use client';

// The workspace's select: the shared Select (keyboard model, typeahead, focus return, collision handling) dressed in
// the Tools look. The list is portalled outside the workspace, so the workspace's colour, typeface and text-size
// variables are copied onto it when it opens.
import { useId, useRef, useState, type CSSProperties } from 'react';
import { Select, type SelectSkin } from '@/components/ui-system';
import { ToolsIcon as Icon } from './ToolsIcon';
import { announceToolsPopover } from './toolsPopover';
import s from './tools.module.css';

export type SelectOption = { value: string; label: string };

const THEME = ['--paper', '--canvas', '--ink', '--muted-ink', '--brand', '--brand-soft', '--line', '--soft', '--radius', '--focus', '--font-scale', '--tools-font'];

export function AnimatedSelect({ value, options, onChange, ariaLabel, id, onOpenChange, shortLabels }: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  onOpenChange?: (open: boolean) => void;
  shortLabels?: Record<string, string>;
}) {
  const popoverId = `select-${useId()}`;
  const root = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<CSSProperties>({});
  const full = options.find(option => option.value === value)?.label ?? value;

  function changeOpen(open: boolean) {
    if (open) {
      announceToolsPopover(popoverId);
      const computed = root.current ? window.getComputedStyle(root.current) : null;
      const vars: Record<string, string> = {};
      for (const name of THEME) { const v = computed?.getPropertyValue(name); if (v) vars[name] = v; }
      setTheme({ ...vars, fontFamily: computed?.fontFamily, fontSize: computed?.fontSize, colorScheme: computed?.colorScheme } as CSSProperties);
    }
    onOpenChange?.(open);
  }

  const skin: SelectSkin = {
    trigger: '',
    content: `${s.selectPanel} ${s.selectPanelPortal} ${s.selectList}`,
    option: s.selectOption,
    chevron: <Icon name="down" size={13} />,
    contentStyle: theme,
  };
  return (
    <div ref={root} className={s.animatedSelect}>
      <Select
        id={id}
        value={value}
        onValueChange={onChange}
        options={options}
        aria-label={ariaLabel}
        listLabel={`${ariaLabel} options`}
        title={shortLabels ? full : undefined}
        triggerLabel={shortLabels ? option => shortLabels[option.value] ?? option.label : undefined}
        onOpenChange={changeOpen}
        skin={skin}
      />
    </div>
  );
}
