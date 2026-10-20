import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('the label row carries the coarse-pointer minimum', () => {
    render(<Checkbox label="Night shift" />);
    const row = screen.getByRole('checkbox').closest('div');
    expect(row!.className).toContain('touch-target');
  });
});
