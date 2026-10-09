import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsWorkspaceSearch } from './ToolsWorkspaceSearch';
import type { WorkspaceSearchResult } from './toolsSearch';

const results: WorkspaceSearchResult[] = [
  { id: 'page-equipment', kind: 'Page', title: 'Equipment register', subtitle: 'Browse items', keywords: 'tools', icon: 'box', target: { type: 'tab', tab: 'register' } },
];

function setup(value = '') {
  const inputRef = createRef<HTMLInputElement | null>();
  const onChange = vi.fn();
  const onChoose = vi.fn();
  render(<ToolsWorkspaceSearch value={value} onChange={onChange} results={results} onChoose={onChoose} inputRef={inputRef} />);
  return { inputRef, onChange, onChoose };
}

describe('ToolsWorkspaceSearch', () => {
  it('starts collapsed and expands with focus on trigger', async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole('button', { name: 'Expand search' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(screen.queryByRole('button', { name: 'Expand search' })).not.toBeInTheDocument();
    const box = screen.getByRole('combobox', { name: 'Search the Tools workspace' });
    expect(box).toHaveFocus();
  });

  it('expands when the input is focused programmatically (slash shortcut)', () => {
    const { inputRef } = setup();
    expect(screen.getByRole('button', { name: 'Expand search' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Search the Tools workspace' })).not.toBeInTheDocument();
    expect(inputRef.current).not.toBeNull();
    fireEvent.focus(inputRef.current!);
    expect(screen.queryByRole('button', { name: 'Expand search' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search the Tools workspace' })).toBeInTheDocument();
  });

  it('collapses on Escape only when empty', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Expand search' }));
    const box = screen.getByRole('combobox', { name: 'Search the Tools workspace' });
    await user.keyboard('{Escape}');
    expect(box).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'Expand search' })).toBeInTheDocument();
  });

  it('keeps results, keyboard choice and clearing intact', async () => {
    const user = userEvent.setup();
    const { onChoose, onChange } = setup('equipment');
    await user.click(screen.getByRole('button', { name: 'Expand search' }));
    const box = screen.getByRole('combobox', { name: 'Search the Tools workspace' });
    expect(box).toHaveValue('equipment');
    expect(screen.getByRole('option', { name: /Equipment register/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onChoose).toHaveBeenCalledWith(results[0]);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
