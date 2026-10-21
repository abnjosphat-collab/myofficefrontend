import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AppShellContext } from './context';
import { useRouteSidebarCollapsed } from './useRouteSidebarCollapsed';
import type { AppShellState } from './useAppShellState';

function Hook() { useRouteSidebarCollapsed(); return null; }

function setup() {
  const setSidebarForceCollapsed = vi.fn();
  const setSidebarCollapsed = vi.fn();
  const r = render(
    <AppShellContext.Provider value={{ setSidebarForceCollapsed, setSidebarCollapsed } as unknown as AppShellState}>
      <Hook />
    </AppShellContext.Provider>,
  );
  return { setSidebarForceCollapsed, setSidebarCollapsed, unmount: r.unmount };
}

describe('useRouteSidebarCollapsed', () => {
  it('claims the collapse on mount and releases it on unmount, never touching the persisted preference', () => {
    const { setSidebarForceCollapsed, setSidebarCollapsed, unmount } = setup();
    expect(setSidebarForceCollapsed).toHaveBeenCalledWith(true);
    expect(setSidebarCollapsed).not.toHaveBeenCalled();
    unmount();
    expect(setSidebarForceCollapsed).toHaveBeenCalledWith(false);
    expect(setSidebarCollapsed).not.toHaveBeenCalled();
  });
});
