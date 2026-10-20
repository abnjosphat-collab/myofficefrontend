import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, FormDialog } from '@/components/ui-system';
import { TagField } from './TagField';

function Harness({ onOpenChange }: { onOpenChange: (next: boolean) => void }) {
  const [value, setValue] = useState<string[]>(['First aid']);
  return (
    <ConfirmProvider>
      <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
        <TagField label="Qualifications" value={value} onChange={setValue} />
      </FormDialog>
    </ConfirmProvider>
  );
}

describe('TagField dirty', () => {
  it('removing a chip without typing marks the dialog dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: /remove/i }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('adding a tag marks the dialog dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    await user.type(screen.getByRole('textbox', { name: /qualifications/i }), 'Fire safety');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
