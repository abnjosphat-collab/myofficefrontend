import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChooseSoonDialog, FreeLineDialog, LineEditDialog } from './OrderLineDialogs';
import type { BasketLine } from './orderBasket';
import type { PPERecord } from './types';

function line(over: Partial<BasketLine> = {}): BasketLine {
  return { record_id: '1', employee_id: 'C100', employee_name: 'Ann Alpha', ppe_type: 'safety_shoes', item_name: 'Boots', size: '8', expiry_date: '2026-10-01', origin: 'manual', ...over };
}

function rec(id: string, over: Partial<PPERecord> = {}): PPERecord {
  return {
    id, employee_id: 'C100', employee_name: 'Ann Alpha', position: '', department: '',
    ppe_type: 'safety_shoes', item_name: 'Boots', size: '8', issue_date: '2026-01-10',
    expiry_date: '2026-11-01', condition: 'good', status: 'active', notes: '', issued_by: '',
    location: '', mine_section: '',
    ...over,
  };
}

describe('LineEditDialog', () => {
  it('saves the edited quantity, size and note', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(); const onClose = vi.fn();
    render(<LineEditDialog line={line({ qty: 1, note: '' })} onClose={onClose} onSave={onSave} />);
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '3');
    await user.clear(screen.getByLabelText('Size'));
    await user.type(screen.getByLabelText('Size'), '9');
    await user.type(screen.getByLabelText(/Note for the purchaser/), 'wide fit');
    await user.click(screen.getByRole('button', { name: 'Save line' }));
    expect(onSave).toHaveBeenCalledWith('1', { qty: 3, size: '9', note: 'wide fit' });
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a quantity below 1 and saves nothing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LineEditDialog line={line()} onClose={() => {}} onSave={onSave} />);
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '0');
    await user.click(screen.getByRole('button', { name: 'Save line' }));
    expect(screen.getByText('Quantity must be at least 1.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ChooseSoonDialog', () => {
  const records = [rec('1'), rec('2', { employee_name: 'Bob Beta', ppe_type: 'helmet', item_name: 'Helmet', size: '' })];

  it('ticks records and adds the picked ids', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<ChooseSoonDialog open records={records} onClose={() => {}} onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: 'Add to the order list' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Bob Beta/ }));
    await user.click(screen.getByRole('button', { name: 'Add 1 to the order list' }));
    expect(onAdd).toHaveBeenCalledWith(['2']);
  });

  it('narrows the choices by type', async () => {
    const user = userEvent.setup();
    render(<ChooseSoonDialog open records={records} onClose={() => {}} onAdd={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(await screen.findByRole('option', { name: 'Safety Helmet' }));
    expect(screen.queryByRole('checkbox', { name: /Ann Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bob Beta/ })).toBeInTheDocument();
  });

  it('matches the type without regard to case', async () => {
    const user = userEvent.setup();
    const mixed = [...records, rec('3', { employee_name: 'Cy Gamma', ppe_type: 'Helmet', item_name: 'Helmet', size: '' })];
    render(<ChooseSoonDialog open records={mixed} onClose={() => {}} onAdd={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(await screen.findByRole('option', { name: 'Safety Helmet' }));
    expect(screen.queryByRole('checkbox', { name: /Ann Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bob Beta/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cy Gamma/ })).toBeInTheDocument();
  });

  it('says so when nothing is due soon', () => {
    render(<ChooseSoonDialog open records={[]} onClose={() => {}} onAdd={() => {}} />);
    expect(screen.getByText('Nothing is due soon that is not on the order list yet.')).toBeInTheDocument();
  });
});

describe('FreeLineDialog', () => {
  it('asks for the type and the item before saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FreeLineDialog open onClose={() => {}} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add free line' }));
    expect(screen.getByText('Choose the PPE type.')).toBeInTheDocument();
    expect(screen.getByText('Enter the item or brand.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a complete free line', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(); const onClose = vi.fn();
    render(<FreeLineDialog open onClose={onClose} onSave={onSave} />);
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(await screen.findByRole('option', { name: 'Safety Shoes' }));
    await user.type(screen.getByLabelText(/Item or brand/), 'Spare laces');
    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), '5');
    await user.click(screen.getByRole('button', { name: 'Add free line' }));
    expect(onSave).toHaveBeenCalledWith({ ppe_type: 'safety_shoes', item_name: 'Spare laces', size: '', qty: 5, note: '' });
    expect(onClose).toHaveBeenCalled();
  });

  it('names who a free line is for when someone is known', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FreeLineDialog open onClose={() => {}} onSave={onSave} />);
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(await screen.findByRole('option', { name: 'Safety Helmet' }));
    await user.type(screen.getByLabelText(/Item or brand/), 'Spare visor');
    await user.type(screen.getByLabelText(/^For/), 'Ann Alpha');
    await user.click(screen.getByRole('button', { name: 'Add free line' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ employee_name: 'Ann Alpha' }));
  });
});
