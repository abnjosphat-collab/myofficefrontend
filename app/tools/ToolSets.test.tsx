import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovementForm, ToolForm } from './ToolsForms';
import { PEOPLE, LOCATIONS } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';

const placeholderPeople = PEOPLE.map((label, index) => ({ id: String(index), employeeNumber: label.split(' · ')[1], name: label.split(' · ')[0], department: 'Engineering', active: true }));
async function fillSuggestField(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.type(screen.getByPlaceholderText(`Search ${label.toLowerCase()}…`), text);
  const useRow = screen.queryByRole('option', { name: `Use “${text}”` });
  if (useRow) await user.click(useRow);
  else await user.click(await screen.findByRole('option', { name: text }));
}

describe('Tool sets', () => {
  const head = { ...SEED_TOOLS[0], backendId: 'head-1', memberIds: ['ENG-RH-03'] };
  const member = { ...SEED_TOOLS[2], backendId: 'member-1', setHeadId: 'ENG-CD-01', setHeadName: 'Cordless drill' };
  it('greys a set member in the picker and names its set', async () => {
    const user = userEvent.setup();
    render(<MovementForm kind="issue" tools={[head, member]} employees={placeholderPeople} addFiles={() => []} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Tool' }));
    const option = await screen.findByRole('option', { name: /Rotary hammer/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveTextContent('Belongs to set Cordless drill');
  });
  it('labels a set head with its piece count', async () => {
    const user = userEvent.setup();
    render(<MovementForm kind="issue" tools={[head, member]} employees={placeholderPeople} addFiles={() => []} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Tool' }));
    expect(await screen.findByRole('option', { name: /Cordless drill.*1 piece/ })).toBeInTheDocument();
  });
  it('asks the condition of each piece when a set returns', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const out = { ...head, status: 'issued' as const, holder: PEOPLE[0] };
    render(<MovementForm kind="return" initialTool={out} tools={[out, member]} employees={placeholderPeople} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    expect(screen.getByText('Condition of each piece')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Condition of ENG-RH-03' });
    await user.click(within(group).getByRole('button', { name: 'Damaged' }));
    await fillSuggestField(user, 'Return location', LOCATIONS[0]);
    fireEvent.change(screen.getByLabelText('Required notes'), { target: { value: 'Jaw chipped on the 13mm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record a return' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ memberConditions: { 'ENG-RH-03': 'Damaged' } });
  });
  it('locks membership while the set is on loan', () => {
    const out = { ...SEED_TOOLS[0], holder: PEOPLE[0], memberIds: ['ENG-RH-03'] };
    render(<ToolForm initialTool={out} tools={SEED_TOOLS} defaultDepartment="Engineering" addFiles={() => []} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('On loan — receive this set back before changing its members.')).toBeVisible();
  });
  it('saves picked set members with the tool', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ToolForm tools={SEED_TOOLS} defaultDepartment="Engineering" addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Tool name'), { target: { value: 'Gedore set' } });
    fireEvent.change(screen.getByLabelText('Tool ID'), { target: { value: 'SET-1' } });
    fireEvent.change(screen.getByLabelText('Make and model'), { target: { value: 'Gedore' } });
    fireEvent.change(screen.getByLabelText('Storage location'), { target: { value: 'Main workshop' } });
    fireEvent.change(screen.getByPlaceholderText('Locked tool room / rack / crib'), { target: { value: 'Tool crib rack A' } });
    await user.click(screen.getByRole('checkbox', { name: /Rotary hammer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ memberIds: ['ENG-RH-03'] });
  });
});
