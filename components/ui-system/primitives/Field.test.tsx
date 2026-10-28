import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Field, FieldGroup } from './Field';
import { Input } from './Input';
import { FIRST_ERROR_EVENT } from '../patterns/focusFirstError';

const describedByTargets = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map(id => document.getElementById(id));

describe('Field', () => {
  it('associates the label with the control and references the hint and the error', () => {
    render(
      <Field label="Department" required description="Where the tool lives." error="Enter the department.">
        <Input placeholder="Engineering" />
      </Field>,
    );
    const input = screen.getByLabelText(/Department/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    const [hint, error] = describedByTargets(input);
    expect(hint).toHaveTextContent('Where the tool lives.');
    expect(error).toHaveTextContent('Enter the department.');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('marks optional fields and omits the wiring when there is no hint or error', () => {
    render(
      <Field label="Notes" optional>
        <Input />
      </Field>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    const input = screen.getByLabelText(/Notes/);
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-required');
  });

  it('applies labelClassName to the label while keeping the association', () => {
    render(
      <Field label="Add a progress update" labelClassName="sr-only">
        <Input />
      </Field>,
    );
    const label = document.querySelector('label');
    expect(label?.className).toContain('sr-only');
    expect(screen.getByLabelText('Add a progress update')).not.toBeNull();
  });
});

describe('ErrorWiggle', () => {
  it('wiggles only the field that holds the focused control', () => {
    const { container } = render(
      <>
        <Field label="First" error="Enter the first."><Input /></Field>
        <Field label="Second" error="Enter the second."><Input /></Field>
      </>,
    );
    const wiggles = () => [...container.querySelectorAll('[data-wiggle-trigger]')].map(el => el.getAttribute('data-wiggle-trigger'));
    expect(wiggles()).toEqual(['0', '0']);
    const second = screen.getByLabelText('Second');
    fireEvent(second, new CustomEvent(FIRST_ERROR_EVENT, { bubbles: true, detail: second }));
    expect(wiggles()).toEqual(['0', '1']);
  });

  it('ignores first-error events from outside any field', () => {
    const { container } = render(
      <Field label="First" error="Enter the first."><Input /></Field>,
    );
    const outsider = document.createElement('input');
    document.body.appendChild(outsider);
    try {
      fireEvent(outsider, new CustomEvent(FIRST_ERROR_EVENT, { bubbles: true, detail: outsider }));
      expect(container.querySelector('[data-wiggle-trigger]')).toHaveAttribute('data-wiggle-trigger', '0');
    } finally {
      outsider.remove();
    }
  });
});

describe('FieldGroup', () => {
  it('names the group and references its hint and error, with no label element', () => {
    const { container } = render(
      <FieldGroup label="Format" required description="Excel keeps the formulas." error="Choose a format.">
        <button type="button">Excel</button>
      </FieldGroup>,
    );
    // A group cannot take <label htmlFor> — the name comes from role="group" instead.
    expect(container.querySelector('label')).toBeNull();
    const group = screen.getByRole('group', { name: /Format/ });
    const [hint, error] = describedByTargets(group);
    expect(hint).toHaveTextContent('Excel keeps the formulas.');
    expect(error).toHaveTextContent('Choose a format.');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('supports the optional marker and renders without hint or error', () => {
    render(
      <FieldGroup label="Pressure" optional>
        <button type="button">Readings</button>
      </FieldGroup>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: /Pressure/ });
    expect(group).not.toHaveAttribute('aria-describedby');
  });
});
