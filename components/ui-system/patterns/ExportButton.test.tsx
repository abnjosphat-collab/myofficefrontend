// components/ui-system/patterns/ExportButton.test.tsx — the one export trigger:
// a labelled "Download" menu button, a single-format labelled button, or (dense
// table row actions only) an icon-only trigger.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from './ExportButton';

const items = [
  { label: 'Excel (.xlsx)', onSelect: vi.fn() },
  { label: 'PDF', onSelect: vi.fn() },
];

describe('ExportButton', () => {
  it('menu mode: a labelled Download button opens the menu and runs the chosen item', async () => {
    const user = userEvent.setup();
    render(<ExportButton items={items} />);
    const trigger = screen.getByRole('button', { name: 'Download' });
    expect(trigger.textContent).toContain('Download');
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'PDF' }));
    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('single mode: the full label with no menu, shortened to Download at 390px and below', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<ExportButton label="Download Excel" onPress={onPress} />);
    const trigger = screen.getByRole('button');
    // Both forms render; CSS shows exactly one (the short form at <=390px). The full label defaults hidden: Tailwind 4 max-* is exclusive, so max-[390px] showed BOTH at exactly 390px.
    expect(within(trigger).getByText('Download Excel', { selector: 'span.hidden.min-\\[391px\\]\\:inline' })).toBeInTheDocument();
    expect(within(trigger).getByText('Download', { selector: 'span.min-\\[391px\\]\\:hidden' })).toBeInTheDocument();
    await user.click(trigger);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    cleanup();
  });

  it('iconOnly renders an icon trigger with the label as its accessible name', async () => {
    const user = userEvent.setup();
    render(<ExportButton items={items} iconOnly />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(screen.getByRole('menuitem', { name: 'Excel (.xlsx)' })).toBeInTheDocument();
    cleanup();
    render(<ExportButton label="Download PDF" onPress={() => {}} iconOnly />);
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    cleanup();
  });

  it('success swaps the trigger to the check and blocks reactivation', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ExportButton label="Download Excel" onPress={onPress} success />);
    expect(container.querySelector('[data-motion-swap="replace"]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Download/ }));
    expect(onPress).not.toHaveBeenCalled();
    cleanup();
  });

  it('disabled and pending block activation', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<ExportButton label="Download Excel" onPress={onPress} disabled />);
    expect(screen.getByRole('button', { name: /Download/ })).toBeDisabled();
    cleanup();
    render(<ExportButton label="Download Excel" onPress={onPress} pending />);
    await user.click(screen.getByRole('button', { name: /Download/ }));
    expect(onPress).not.toHaveBeenCalled();
    cleanup();
  });
});
