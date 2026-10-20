import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './ToolsForms';

describe('ToolsForms Footer', () => {
  it('sticks to the dialog bottom over an opaque surface', () => {
    render(<Footer><button>Save</button></Footer>);
    const bar = screen.getByRole('button', { name: 'Save' }).parentElement!;
    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('bottom-0');
    expect(bar.className).toContain('bg-surface');
  });
});
