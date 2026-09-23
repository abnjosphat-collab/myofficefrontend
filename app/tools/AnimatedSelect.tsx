'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import s from './tools.module.css';

export type SelectOption = { value: string; label: string };
type FloatingStyle = CSSProperties & Record<string, string | number | undefined>;

export function AnimatedSelect({ value, options, onChange, ariaLabel, id, onOpenChange }: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const generatedId = useId();
  const popoverId = `select-${generatedId}`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<'down' | 'up'>('down');
  const [floatingStyle, setFloatingStyle] = useState<FloatingStyle>({});
  const selected = Math.max(0, options.findIndex(option => option.value === value));

  function changeOpen(next: boolean) {
    if (next) {
      announceToolsPopover(popoverId);
      setActive(selected);
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) {
        const estimatedHeight = Math.min(286, options.length * 36 + 12);
        const roomBelow = window.innerHeight - rect.bottom;
        const nextPlacement = roomBelow < estimatedHeight && rect.top > roomBelow ? 'up' : 'down';
        const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 28);
        const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14));
        const source = root.current;
        const computed = source ? window.getComputedStyle(source) : null;
        const theme: FloatingStyle = {};
        for (const property of ['--paper','--canvas','--ink','--muted-ink','--brand','--brand-soft','--line','--soft','--font-scale','--tools-font']) {
          const computedValue = computed?.getPropertyValue(property);
          if (computedValue) theme[property] = computedValue;
        }
        setPlacement(nextPlacement);
        setFloatingStyle({
          ...theme,
          left,
          width,
          maxHeight: Math.max(120, Math.min(286, nextPlacement === 'down' ? roomBelow - 12 : rect.top - 12)),
          top: nextPlacement === 'down' ? rect.bottom + 6 : undefined,
          bottom: nextPlacement === 'up' ? window.innerHeight - rect.top + 6 : undefined,
          fontFamily: computed?.fontFamily,
          fontSize: computed?.fontSize,
          colorScheme: computed?.colorScheme,
        });
      }
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) changeOpen(false);
    };
    const onAnotherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== popoverId) changeOpen(false);
    };
    const onViewportChange = (event: Event) => {
      if (event.type === 'scroll' && (root.current?.contains(event.target as Node) || panel.current?.contains(event.target as Node))) return;
      changeOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener(TOOLS_POPOVER_EVENT, onAnotherPopover);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener(TOOLS_POPOVER_EVENT, onAnotherPopover);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  });

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    changeOpen(false);
    trigger.current?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      if (open) event.preventDefault();
      changeOpen(false);
      return;
    }
    if (event.key === 'Tab') {
      changeOpen(false);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!open) changeOpen(true);
      setActive(event.key === 'Home' ? 0 : options.length - 1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        changeOpen(true);
        return;
      }
      setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else changeOpen(true);
    }
  }

  const floatingPanel = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>{open && <motion.div ref={panel} id={`${popoverId}-options`} role="listbox" aria-label={`${ariaLabel} options`} className={`${s.selectPanel} ${s.selectPanelPortal}`} data-placement={placement} style={floatingStyle} initial={{ height: 0, opacity: 0, y: reduced ? 0 : placement === 'down' ? -4 : 4 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: reduced ? 0 : placement === 'down' ? -4 : 4 }} transition={{ duration: reduced ? 0 : .2, ease: [.2,.8,.2,1] }}>
      {options.map((option, index) => <button id={`${popoverId}-option-${index}`} type="button" role="option" aria-selected={option.value === value} data-active={active === index} key={option.value} onPointerEnter={() => setActive(index)} onClick={() => choose(index)}>{option.label}{option.value === value && <Icon name="check" size={14}/>}</button>)}
    </motion.div>}</AnimatePresence>,
    document.body,
  ) : null;

  return <div ref={root} className={s.animatedSelect} data-placement={placement}>
    <button ref={trigger} id={id} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${popoverId}-options` : undefined} onClick={() => changeOpen(!open)} onKeyDown={handleKey}>
      <span>{options[selected]?.label || value}</span>
      <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduced ? 0 : .18 }}><Icon name="down" size={13}/></motion.span>
    </button>
    {floatingPanel}
  </div>;
}
