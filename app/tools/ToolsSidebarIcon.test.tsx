import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ICON_PACKS } from './sidebarNav';
import { SidebarIcon, SidebarIconSwitch, type SidebarIconName } from './ToolsSidebarIcon';

const NAMES: SidebarIconName[] = ['home', 'box', 'out', 'user', 'check', 'history', 'upload', 'accounts', 'analytics', 'edit'];

describe('Sidebar icon packs', () => {
  it('draws every section icon in every pack', () => {
    for (const pack of ICON_PACKS) for (const name of NAMES) {
      const { container, unmount } = render(<SidebarIcon pack={pack.id} name={name} />);
      expect(container.querySelector('svg'), `${pack.id} / ${name}`).not.toBeNull();
      unmount();
    }
  });

  it('offers every pack, marks the current one, and applies a pick at once', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SidebarIconSwitch pack="phosphor-regular" collapsed={false} onChange={onChange} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Icon style: Phosphor Regular/ }));
    expect(screen.getAllByRole('radio')).toHaveLength(ICON_PACKS.length);
    expect(screen.getByRole('radio', { name: 'Phosphor Regular' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Tabler' }));
    expect(onChange).toHaveBeenCalledWith('tabler');
  });
});
