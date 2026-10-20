import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { MatrixDialog } from './MatrixDialog';

function setup() {
  const onOpenChange = vi.fn();
  render(
    <ConfirmProvider>
      <MatrixDialog open onOpenChange={onOpenChange} matrix={{}} loading={false} error={null}
        onRetry={() => {}} records={[]} onSetInterval={async () => {}} onRecalculate={async () => {}} onRecalculateAll={async () => {}} />
    </ConfirmProvider>,
  );
  return { onOpenChange };
}

describe('MatrixDialog guard', () => {
  it('asks before discarding a changed row', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    const months = screen.getAllByLabelText(/Months/);
    expect(months.length).toBeGreaterThan(0);
    await user.clear(months[0]);
    await user.type(months[0], '12');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes silently when pristine', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
