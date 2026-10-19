import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Category } from '@/components/app-shell/modules';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const trackSearch = vi.fn();
vi.mock('@/lib/usage', () => ({
  trackModuleOpen: vi.fn(),
  trackSearch: (...args: unknown[]) => trackSearch(...args),
  getSearchHistory: () => ['overtime'],
  clearSearchHistory: vi.fn(),
}));

// Imported after the mocks above so the module picks them up.
const { HomeSearch } = await import('./HomeSearch');

const StubIcon = () => null;
const categories: Category[] = [{
  id: 'time', title: 'Time & Attendance', description: '', icon: StubIcon,
  modules: [
    { icon: StubIcon, title: 'Overtime', description: 'Overtime requests & approvals', href: '/overtime', tags: ['Payroll'] },
    { icon: StubIcon, title: 'Leaves', description: 'Leave applications & balances', href: '/leaves', tags: ['HR'] },
  ],
}];

function setup(value = '', onValueChange: (next: string) => void = () => {}) {
  const user = userEvent.setup();
  render(<HomeSearch value={value} onValueChange={onValueChange} visibleCategories={categories} />);
  return { user, field: screen.getByRole('combobox', { name: 'Search MyOffice' }) };
}

beforeEach(() => { push.mockClear(); trackSearch.mockClear(); });

describe('HomeSearch', () => {
  it('suggests matching modules as you type', async () => {
    const user = userEvent.setup();
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return <HomeSearch value={value} onValueChange={setValue} visibleCategories={categories} />;
    };
    render(<Wrapper />);
    const field = screen.getByRole('combobox', { name: 'Search MyOffice' });
    await user.click(field);
    await user.type(field, 'overtime');
    await screen.findByRole('option', { name: /Overtime/ });
  });

  it('shows module results for a query and navigates on click', async () => {
    const onValueChange = vi.fn();
    const { user, field } = setup('overtime', onValueChange);
    await user.click(field);
    const option = await screen.findByRole('option', { name: /Overtime/ });
    expect(within(option).getByText('Time & Attendance')).toBeInTheDocument();
    await user.click(option);
    expect(push).toHaveBeenCalledWith('/overtime');
    expect(trackSearch).toHaveBeenCalledWith('overtime', expect.any(Number));
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('suggests quick actions with their destination module', async () => {
    const onValueChange = vi.fn();
    const { user, field } = setup('new work order', onValueChange);
    await user.click(field);
    const option = await screen.findByRole('option', { name: /New Work Order/ });
    expect(within(option).getByText('Action')).toBeInTheDocument();
    await user.click(option);
    expect(push).toHaveBeenCalledWith('/maintenance');
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('chooses the first result on Enter', async () => {
    const onValueChange = vi.fn();
    const { user, field } = setup('leaves', onValueChange);
    await user.click(field);
    await screen.findByRole('option', { name: /Leaves/ });
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/leaves');
  });

  it('shows recent searches when idle and refills the query on choose', async () => {
    const onValueChange = vi.fn();
    const { user, field } = setup('', onValueChange);
    await user.click(field);
    const option = await screen.findByRole('option', { name: /overtime/ });
    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith('overtime');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows the typed guide overlay while idle and hides it while typing', () => {
    const { container, rerender } = render(<HomeSearch value="" onValueChange={() => {}} visibleCategories={categories} />);
    expect(container.querySelector('.typewriter-caret')).toBeInTheDocument();
    rerender(<HomeSearch value="leave" onValueChange={() => {}} visibleCategories={categories} />);
    expect(container.querySelector('.typewriter-caret')).not.toBeInTheDocument();
  });

  it('types example searches into the guide', async () => {
    render(<HomeSearch value="" onValueChange={() => {}} visibleCategories={categories} />);
    await screen.findByText(/Try/, {}, { timeout: 3000 });
  });
});
