import { describe, it, expect, vi, afterEach } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

describe('registerServiceWorker', () => {
  const originalServiceWorker = (navigator as any).serviceWorker;

  afterEach(() => {
    if (originalServiceWorker === undefined) {
      delete (navigator as any).serviceWorker;
    } else {
      Object.defineProperty(navigator, 'serviceWorker', { value: originalServiceWorker, configurable: true });
    }
  });

  it('registers /sw.js when serviceWorker is supported', () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });

    registerServiceWorker();

    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does nothing when serviceWorker is unsupported', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    delete (navigator as any).serviceWorker;

    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('swallows a rejected registration instead of throwing an unhandled rejection', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });

    expect(() => registerServiceWorker()).not.toThrow();
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
  });
});
