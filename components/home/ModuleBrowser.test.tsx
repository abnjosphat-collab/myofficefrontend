import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleBrowser } from './ModuleBrowser';
import type { Category } from '@/components/app-shell/modules';

const StubIcon = () => null;
const actions = {
  favorites: new Set<string>(), onToggleFavorite: vi.fn(), onQuickView: vi.fn(),
  selectMode: false, selected: new Set<string>(), onToggleSelected: vi.fn(),
};
const categories: Category[] = [{
  id: 'hr', title: 'HR', description: '', icon: StubIcon,
  modules: [{ icon: StubIcon, title: 'Artisan Timesheets', description: 'Formal monthly timesheets', href: '/artisan-timesheets' }],
}];

describe('ModuleBrowser highlight', () => {
  it('marks matched words in titles and descriptions', () => {
    render(<ModuleBrowser categories={categories} view="grid" actions={actions} highlight={['artisan', 'timesheets']} />);
    const marks = screen.getAllByText((_, el) => el?.tagName === 'MARK');
    expect(marks.map(mark => mark.textContent)).toEqual(['Artisan', 'Timesheets', 'timesheets']);
  });

  it('renders plain text without highlight words', () => {
    const { container } = render(<ModuleBrowser categories={categories} view="grid" actions={actions} />);
    expect(container.querySelector('mark')).toBeNull();
    expect(screen.getByText('Artisan Timesheets')).toBeInTheDocument();
  });
});
