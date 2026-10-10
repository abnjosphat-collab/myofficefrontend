import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { dialogKey, useResetOnOpen } from './useResetOnOpen';

function Form({ open, record }: { open: boolean; record?: { id: number; name: string } }) {
  const [name, setName] = useState('');
  const [resets, setResets] = useState(0);
  useResetOnOpen(dialogKey(open, record?.id), () => { setName(record?.name ?? ''); setResets(n => n + 1); });
  return <p>{open ? `${name}|${resets}` : `closed|${resets}`}</p>;
}

describe('dialogKey', () => {
  it('is null while closed, the id when editing and "new" when creating', () => {
    expect(dialogKey(false, 4)).toBeNull();
    expect(dialogKey(true, 4)).toBe('4');
    expect(dialogKey(true, undefined)).toBe('new');
    expect(dialogKey(true, null, 'scanned')).toBe('scanned');
  });
});

describe('useResetOnOpen', () => {
  it('fills the form on open, keeps it while open, refills for another record and blanks for a new one', () => {
    const { rerender } = render(<Form open={false} />);
    expect(screen.getByText('closed|0')).toBeInTheDocument();

    rerender(<Form open record={{ id: 1, name: 'Pump' }} />);
    expect(screen.getByText('Pump|1')).toBeInTheDocument();

    rerender(<Form open record={{ id: 1, name: 'Pump (edited elsewhere)' }} />);
    expect(screen.getByText('Pump|1')).toBeInTheDocument(); // same record still open: the user's typing is not overwritten

    rerender(<Form open record={{ id: 2, name: 'Fan' }} />);
    expect(screen.getByText('Fan|2')).toBeInTheDocument();

    rerender(<Form open={false} record={{ id: 2, name: 'Fan' }} />);
    rerender(<Form open />);
    expect(screen.getByText('|3')).toBeInTheDocument();
  });

  it('refills when the same record is opened again after closing', () => {
    const { rerender } = render(<Form open record={{ id: 1, name: 'Pump' }} />);
    rerender(<Form open={false} record={{ id: 1, name: 'Pump' }} />);
    rerender(<Form open record={{ id: 1, name: 'Pump' }} />);
    expect(screen.getByText('Pump|2')).toBeInTheDocument();
  });
});
