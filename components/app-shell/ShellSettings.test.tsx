// components/app-shell/ShellSettings.test.tsx — C7: the colour-theme and darkness
// switches render in app Settings only for trial-flagged profiles
// (permissions.features has 'high-contrast'), and never in Tools settings,
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

describe('ShellSettings theme gating (C7)', () => {
  it('hides the theme switches for unflagged profiles', () => {
    authState.features = [];
    renderSettings();
    expect(screen.queryByText('Colour theme')).not.toBeInTheDocument();
    expect(screen.queryByText('Darkness')).not.toBeInTheDocument();
    // The shared controls stay: typeface, text size, hints.
    expect(screen.getByText('Typeface')).toBeInTheDocument();
  });

  it('shows the theme switches for trial-flagged profiles', () => {
    authState.features = ['high-contrast'];
    renderSettings();
    expect(screen.getByText('Colour theme')).toBeInTheDocument();
    expect(screen.getByText('Darkness')).toBeInTheDocument();
  });

  it('ignores other flags', () => {
    authState.features = ['something-else'];
    renderSettings();
    expect(screen.queryByText('Colour theme')).not.toBeInTheDocument();
  });
});

describe('ToolsCustomize theme gating (C7)', () => {
  it('never shows the theme switches, even for flagged profiles', () => {
    authState.features = ['high-contrast'];
    render(
      <AppearanceProvider>
        <ToolsCustomize options={{ ...DEFAULT_OPTIONS }} setOptions={() => {}} />
      </AppearanceProvider>,
    );
    expect(screen.queryByText('Colour theme')).not.toBeInTheDocument();
    expect(screen.queryByText('Darkness')).not.toBeInTheDocument();
    expect(screen.getByText('Typeface')).toBeInTheDocument();
  });
});
