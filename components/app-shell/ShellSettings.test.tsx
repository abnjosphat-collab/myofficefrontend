// components/app-shell/ShellSettings.test.tsx — the Look switch (light or
// black-and-white dark) renders in app Settings only for trial-flagged profiles
// (permissions.features has 'appearance_themes'), and never in Tools settings,
// which keeps its sage floor.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({ features: [] as string[] }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ profile: { permissions: { features: authState.features } } }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { AppearanceProvider, ConfirmProvider } from '@/components/ui-system';
import { ShellSettings } from './ShellSettings';
import { DEFAULT_OPTIONS, ToolsCustomize } from '@/app/tools/ToolsCustomize';

function renderSettings() {
  render(
    <AppearanceProvider>
      <ConfirmProvider>
        <ShellSettings
          open
          onOpenChange={() => {}}
          sidebarCollapsed={false}
          onSidebarCollapsedChange={() => {}}
          onResetCustomizations={() => {}}
        />
      </ConfirmProvider>
    </AppearanceProvider>,
  );
}

describe('ShellSettings appearance gating', () => {
  it('hides the Look switch for unflagged profiles', () => {
    authState.features = [];
    renderSettings();
    expect(screen.queryByRole('combobox', { name: 'Look' })).not.toBeInTheDocument();
    // The shared controls stay: typeface, text size, hints.
    expect(screen.getByText('Typeface')).toBeInTheDocument();
  });

  it('shows the Look switch for trial-flagged profiles', () => {
    authState.features = ['appearance_themes'];
    renderSettings();
    expect(screen.getByRole('combobox', { name: 'Look' })).toBeInTheDocument();
  });

  it('ignores other flags', () => {
    authState.features = ['something-else'];
    renderSettings();
    expect(screen.queryByRole('combobox', { name: 'Look' })).not.toBeInTheDocument();
  });
});

describe('ToolsCustomize appearance gating', () => {
  it('never shows the Look switch, even for flagged profiles', () => {
    authState.features = ['appearance_themes'];
    render(
      <AppearanceProvider>
        <ToolsCustomize options={{ ...DEFAULT_OPTIONS }} setOptions={() => {}} />
      </AppearanceProvider>,
    );
    expect(screen.queryByRole('combobox', { name: 'Look' })).not.toBeInTheDocument();
    expect(screen.getByText('Typeface')).toBeInTheDocument();
  });
});
