import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './SearchField';
import { MoreMenu } from '../patterns/MoreMenu';

function Harness({ collapsible = true }: { collapsible?: boolean }) {
  const [value, setValue] = useState('');
  return <><SearchField collapsible={collapsible} value={value} onValueChange={setValue} placeholder="Search work orders" /><button type="button">elsewhere</button></>;
}

describe('SearchField collapsible', () => {
  it('folds to an icon, opens focused on click, and folds again when left empty', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search work orders' }));
    expect(screen.getByRole('searchbox', { name: 'Search work orders' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('stays open while it holds a query', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Search work orders' }));
    await user.keyboard('pump');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.getByRole('searchbox')).toHaveValue('pump');
  });

  it('is always a field without collapsible', () => {
    render(<Harness collapsible={false} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});

describe('MoreMenu', () => {
  it('is an icon named More that opens its items', async () => {
    const user = userEvent.setup();
    render(<MoreMenu items={[{ label: 'Import', onSelect: () => {} }]} />);
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(await screen.findByRole('menuitem', { name: 'Import' })).toBeInTheDocument();
  });
});
