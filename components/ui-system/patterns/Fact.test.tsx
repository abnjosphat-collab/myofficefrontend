import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Fact, FactList, FactSection } from './Fact';

describe('FactList', () => {
  it('renders one description list for the record', () => {
    render(<FactList><Fact label="Name">Tariro Moyo</Fact></FactList>);
    const list = screen.getByText('Name').closest('dl');
    expect(list).toBeInTheDocument();
    expect(within(list as HTMLElement).getByText('Tariro Moyo')).toBeInTheDocument();
  });

  it('spans the requested columns from small screens up', () => {
    const { container } = render(<FactList columns={3}><Fact label="A">a</Fact></FactList>);
    expect(container.querySelector('dl')!.className).toContain('sm:grid-cols-3');
  });
});

describe('Fact', () => {
  it('reads an empty value as quiet missing data, never as a gap', () => {
    const { rerender } = render(<FactList><Fact label="Phone">{undefined}</Fact></FactList>);
    for (const value of [undefined, '', null] as const) {
      rerender(<FactList><Fact label="Phone">{value}</Fact></FactList>);
      const missing = screen.getByText('Not recorded');
      expect(missing.className).toContain('text-ink-muted');
      expect(missing.className).toContain('italic');
    }
  });

  it('keeps real values in the normal weight', () => {
    render(<FactList><Fact label="Phone">0771 234 567</Fact></FactList>);
    const value = screen.getByText('0771 234 567').closest('dd')!;
    expect(value.className).not.toContain('font-semibold');
    expect(value.className).not.toContain('italic');
  });

  it('reserves semibold for the one headline value', () => {
    render(<FactList><Fact label="Duration" emphasis="headline">5 days</Fact></FactList>);
    expect(screen.getByText('5 days').closest('dd')!.className).toContain('font-semibold');
  });

  it('spans the full row for sentence-length values', () => {
    const { container } = render(<FactList><Fact label="Notes" wide>A sentence that would stretch its neighbours.</Fact></FactList>);
    expect(container.querySelector('dl > div')!.className).toContain('sm:col-span-full');
  });
});

describe('FactSection', () => {
  it('labels the section from its heading', () => {
    render(<FactSection title="Employee"><FactList><Fact label="Name">Tariro Moyo</Fact></FactList></FactSection>);
    const section = screen.getByRole('region', { name: 'Employee' });
    expect(section.tagName).toBe('SECTION');
    expect(within(section).getByRole('heading', { level: 3, name: 'Employee' })).toBeInTheDocument();
  });

  it('puts the aside on the heading row', () => {
    render(<FactSection title="Standby periods" aside="2 periods"><p>body</p></FactSection>);
    expect(screen.getByText('2 periods')).toBeInTheDocument();
  });

  it('draws a card instead of a ruled group when asked', () => {
    render(<FactSection title="Procedures" card><p>body</p></FactSection>);
    const section = screen.getByRole('region', { name: 'Procedures' });
    expect(section.className).toContain('rounded-card');
    expect(section.className).not.toContain('border-t');
  });

  it('rules every section but the first', () => {
    render(
      <>
        <FactSection title="First"><p>one</p></FactSection>
        <FactSection title="Second"><p>two</p></FactSection>
      </>,
    );
    expect(screen.getByRole('region', { name: 'First' }).className).toContain('first:border-t-0');
    expect(screen.getByRole('region', { name: 'Second' }).className).toContain('border-t');
  });

  it('uses h2 on a full page', () => {
    render(<FactSection title="Register" level={2}><p>body</p></FactSection>);
    expect(screen.getByRole('heading', { level: 2, name: 'Register' })).toBeInTheDocument();
  });
});
