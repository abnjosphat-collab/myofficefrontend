import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordCheckDialog, RecordRepairDialog } from './ToolsResolve';
import { ConfirmProvider } from '@/components/ui-system';
import { TEST_TOOLS } from './testFixtures';

const dueTool = { ...TEST_TOOLS[0], backendId: 'b1', inspectionDue: ['monthly', 'quarterly'] };
const heldTool = { ...TEST_TOOLS[8], backendId: 'b9' };

describe('RecordCheckDialog', () => {
  it('records the first due check with the outcome and notes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfirmProvider><RecordCheckDialog tool={dueTool} onClose={() => {}} onSave={onSave} /></ConfirmProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Check notes' }), { target: { value: 'Guard secure, cable sound.' } });
    await user.click(screen.getByRole('button', { name: 'Record check' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toBe(dueTool);
    expect(onSave.mock.calls[0][1]).toMatchObject({ inspection_type: 'monthly', outcome: 'passed', notes: 'Guard secure, cable sound.' });
  });
  it('refuses a failed check without defects, like the Compliance register', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfirmProvider><RecordCheckDialog tool={dueTool} onClose={() => {}} onSave={onSave} /></ConfirmProvider>);
    await user.click(screen.getByRole('button', { name: 'Failed' }));
    await user.click(screen.getByRole('button', { name: 'Record check' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Describe the defects.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Defects' }), { target: { value: 'Cracked guard.' } });
    await user.click(screen.getByRole('button', { name: 'Record check' }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ outcome: 'failed', defects: 'Cracked guard.' });
  });
  it('renders nothing when no tool is set, and cancels without saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<ConfirmProvider><RecordCheckDialog tool={null} onClose={onClose} onSave={() => {}} /></ConfirmProvider>);
    expect(screen.queryByRole('button', { name: 'Record check' })).not.toBeInTheDocument();
    rerender(<ConfirmProvider><RecordCheckDialog tool={dueTool} onClose={onClose} onSave={() => {}} /></ConfirmProvider>);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('RecordRepairDialog', () => {
  it('records the repair note for the tool and cancels without saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmProvider><RecordRepairDialog tool={heldTool} onClose={onClose} onSave={onSave} /></ConfirmProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Repair or inspection completed' }), { target: { value: 'Trigger switch replaced and function tested.' } });
    await user.click(screen.getByRole('button', { name: 'Mark ready for use' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0]).toEqual([heldTool, 'Trigger switch replaced and function tested.']);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
