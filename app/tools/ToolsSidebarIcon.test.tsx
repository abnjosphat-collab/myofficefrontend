import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ICON_PACKS } from './sidebarNav';
import { IconPackPicker, SidebarIcon, type SidebarIconName } from './ToolsSidebarIcon';

const NAMES: SidebarIconName[] = ['home', 'box', 'out', 'user', 'check', 'history', 'upload', 'accounts', 'analytics', 'edit'];

describe('Sidebar icon styles', () => {
  it('offers exactly Phosphor Solid and Tabler', () => {
    expect(ICON_PACKS.map(pack => pack.label)).toEqual(['Phosphor Solid', 'Tabler']);
  });

  it('draws every section icon in both styles, current or not', () => {
    for (const pack of ICON_PACKS) for (const name of NAMES) for (const active of [false, true]) {
      const { container, unmount } = render(<SidebarIcon pack={pack.id} name={name} active={active} />);
      expect(container.querySelector('svg'), `${pack.id} / ${name}`).not.toBeNull();
      unmount();
    }
  });

  it('shows both styles in Settings, marks the current one, and applies a pick at once', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IconPackPicker pack="phosphor-solid" onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Phosphor Solid' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Tabler' }));
    expect(onChange).toHaveBeenCalledWith('tabler');
  });
});
