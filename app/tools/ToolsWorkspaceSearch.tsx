'use client';

import { useId, useState, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon } from './ToolsIcon';
import type { WorkspaceSearchResult } from './toolsSearch';
import s from './tools.module.css';

export function ToolsWorkspaceSearch({
  value, onChange, results, onChoose, inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  results: WorkspaceSearchResult[];
  onChoose: (result: WorkspaceSearchResult) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const listId = useId();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const open = focused && !!value.trim();

  const choose = (result: WorkspaceSearchResult) => {
    onChoose(result);
    setFocused(false);
    inputRef.current?.blur();
  };

  return <div className={s.workspaceSearch}>
    <div className={s.search}>
      <Icon name="search" />
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Search the Tools workspace"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search equipment, people, documents or settings…"
        value={value}
        onChange={event => { setActive(0); onChange(event.target.value); }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setActive(index => (index + 1) % results.length); }
          if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActive(index => (index + results.length - 1) % results.length); }
          if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
          if (event.key === 'Escape') { event.preventDefault(); setFocused(false); inputRef.current?.blur(); }
        }}
      />
      {value ? <button aria-label="Clear search" onClick={() => { onChange(''); inputRef.current?.focus(); }}><Icon name="close" size={15} /></button> : <kbd>/</kbd>}
    </div>
    <AnimatePresence>
      {open && <motion.div
        id={listId}
        role="listbox"
        aria-label="Workspace search suggestions"
        className={s.workspaceSearchPanel}
        initial={{ opacity: 0, y: reduced ? 0 : -5, scale: reduced ? 1 : .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduced ? 0 : -4, scale: reduced ? 1 : .99 }}
        transition={{ duration: reduced ? 0 : .15 }}
      >
        <div className={s.searchPanelHeading}><span>Best matches</span><small>Use ↑ ↓ and Enter</small></div>
        {results.length ? results.map((result, index) => <button
          key={result.id}
          id={`${listId}-${index}`}
          type="button"
          role="option"
          aria-selected={active === index}
          data-active={active === index}
          onMouseDown={event => event.preventDefault()}
          onMouseEnter={() => setActive(index)}
          onClick={() => choose(result)}
        >
          <span className={s.searchResultIcon}><Icon name={result.icon} size={18} /></span>
          <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
          <em>{result.kind}</em><Icon name="chevron" size={14} />
        </button>) : <div className={s.searchNoResult}>
          <Icon name="search" size={21} />
          <span><strong>No close match found</strong><small>Try a tool number, person, task or setting.</small></span>
        </div>}
        <p>Search checks equipment, employees, attached file names, history, pages, actions and settings.</p>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
