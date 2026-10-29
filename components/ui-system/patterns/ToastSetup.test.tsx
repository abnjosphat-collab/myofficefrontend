// MotionToaster under reduced motion (the global setup mock): the stack
// mounts as an announced live region, and the error icon renders the error
// glyph (the wiggle itself is a full-motion behaviour, covered in
// ToastSetup.full.test.tsx).
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionToaster, ToastErrorIcon } from './ToastSetup';

describe('MotionToaster (reduced motion)', () => {
  it('mounts the toast stack as an announced live region', () => {
    const { container } = render(<MotionToaster />);
    const region = container.querySelector('section[aria-live="polite"]');
    expect(region).toBeInTheDocument();
  });

  it('error icon renders the error glyph', () => {
    const { container } = render(<ToastErrorIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
