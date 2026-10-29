// Compressor motion on the shared layer (N2): pods carry no own timing (the
// grid MotionList owns inserts), the drawer day-line is Presence, week bars
// sweep by scaleY. Runs under the reduced-motion setup, so enters are instant
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { UnitDrawer } from './UnitDrawer';
import { UnitPod } from './UnitPod';
import { UnitView } from './UnitView';
import type { Compressor } from './types';

const compressor: Compressor = {
  id: 1, name: 'C-1', model: 'M', capacity: '7 bar', location: 'Pit',
  status: 'running', total_running_hours: 120.5, total_loaded_hours: 90,
} as Compressor;

describe('compressor motion (reduced motion)', () => {
  it('carries no own enter timing: the grid MotionList owns inserts', () => {
    const { container } = render(<UnitPod compressor={compressor} recordedToday={false} justSaved={false} kick={0} onOpen={() => {}} />);
    const pod = container.firstElementChild as HTMLElement;
    expect(pod.style.animationDelay).toBe('');
    expect(pod.className).not.toMatch(/rowIn/);
    expect(screen.getByRole('button', { name: /C-1, Running/ })).toBeInTheDocument();
  });

  it('shows the drawer day-line through Presence as the reading is typed', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <UnitDrawer compressor={compressor} previous={{ total_running_hours: 100, total_loaded_hours: 80, date: '2026-10-01' }} previousUnavailable={false} previousLoading={false}
          dateLabel="Fri 10 Oct" recordedToday={false} onClose={vi.fn()} onSave={async () => {}} onStatus={async () => {}} onHistory={() => {}} />
      </ConfirmProvider>,
    );
    await user.clear(screen.getByLabelText(/Running hours/));
    expect(screen.queryByText(/This day:/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Running hours/), '121');
    expect(await screen.findByText(/This day:/)).toBeInTheDocument();
  });

  it('draws week bars as plain divs at their final height', () => {
    const { container } = render(
      <UnitView compressor={compressor} history={[{ date: '2026-10-12', total_running_hours: 110, total_loaded_hours: 55, daily_running_hours: 12, daily_loaded_hours: 6 }]}
        loading={false} today="2026-10-12" onBack={() => {}} onOpenDay={() => {}} />,
    );
    const bar = container.querySelector('.overflow-hidden') as HTMLElement;
    expect(bar).toBeInTheDocument();
    expect(bar.style.height).toBe('50%');
    expect(bar.style.transition).toBe('');
  });
});
