// components/shared/ContactButtons.test.tsx — call + WhatsApp actions: both links
// for a Zimbabwe mobile, call-only for a non-international number, nothing blank.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactButtons } from './ContactButtons';

describe('ContactButtons', () => {
  it('links call and WhatsApp for a Zimbabwe mobile', () => {
    render(<ContactButtons phone="077 123 4567" name="Ann Alpha" />);
    const call = screen.getByRole('link', { name: /Call Ann Alpha/ });
    const wa = screen.getByRole('link', { name: /WhatsApp Ann Alpha/ });
    expect(call).toHaveAttribute('href', 'tel:+263771234567');
    expect(wa).toHaveAttribute('href', 'https://wa.me/263771234567');
    expect(wa).toHaveAttribute('target', '_blank');
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses the primary number when several are stored', () => {
    render(<ContactButtons phone="077 123 4567 / 071 234 5678" name="Ann Alpha" />);
    expect(screen.getByRole('link', { name: /WhatsApp Ann Alpha/ })).toHaveAttribute('href', 'https://wa.me/263771234567');
  });

  it('shows call-only when the number is not dialable internationally', () => {
    render(<ContactButtons phone="12345" name="Front Desk" />);
    expect(screen.getByRole('link', { name: /Call Front Desk/ })).toHaveAttribute('href', 'tel:+12345');
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('renders nothing when the phone field is blank', () => {
    const { container } = render(<ContactButtons phone="  " name="Nobody" />);
    expect(container).toBeEmptyDOMElement();
    const { container: none } = render(<ContactButtons name="Nobody" />);
    expect(none).toBeEmptyDOMElement();
  });
});
