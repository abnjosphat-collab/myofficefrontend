// IconSwap under reduced motion (the global setup mock): the icon changes
// instantly and the owning control's accessible name follows the state.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconSwap } from './IconSwap';

describe('IconSwap (reduced motion)', () => {
  it('changes the accessible name with the state', () => {
    const { rerender } = render(
      <button type="button"><IconSwap from="download" to="check" swapped={false} label="Download" /></button>,
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    rerender(
      <button type="button"><IconSwap from="download" to="check" swapped label="Downloaded" /></button>,
    );
    expect(screen.getByRole('button', { name: 'Downloaded' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('renders with no transform', () => {
    const { container } = render(
      <IconSwap from="copy" to="check" swapped label="Copied" direction="up-up" />,
    );
    for (const el of container.querySelectorAll('*')) {
      expect((el as HTMLElement).style.transform).toBe('');
    }
  });

  it('draws the slash statically for slash pairs', () => {
    const { container, rerender } = render(
      <IconSwap from="sound-on" to="sound-off" swapped={false} slash label="Mute" />,
    );
    expect(container.querySelector('line')).not.toBeInTheDocument();
    rerender(<IconSwap from="sound-on" to="sound-off" swapped slash label="Unmute" />);
    expect(container.querySelector('line')).toBeInTheDocument();
    expect(screen.getByText('Unmute')).toBeInTheDocument();
  });
});
