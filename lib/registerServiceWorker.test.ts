import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

type Listener = () => void;

/** A fake ServiceWorkerRegistration that can be told a new worker is waiting. */
function fakeRegistration(initialWaiting: ServiceWorker | null = null) {
  const listeners: Record<string, Listener[]> = {};
  const registration = {
    waiting: initialWaiting as ServiceWorker | null,
    installing: null as { state: string; addEventListener: (t: string, l: Listener) => void } | null,
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: (type: string, listener: Listener) => { (listeners[type] ??= []).push(listener); },
    emit: (type: string) => (listeners[type] ?? []).forEach(l => l()),
  };
  return registration;
}

describe('registerServiceWorker', () => {
  const originalServiceWorker = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;

  beforeEach(() => { vi.resetModules(); });
  afterEach(() => {
    if (originalServiceWorker === undefined) delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    else Object.defineProperty(navigator, 'serviceWorker', { value: originalServiceWorker, configurable: true });
  });

  it('registers /sw.js at the root scope and bypasses the HTTP cache when checking for updates', async () => {
    const register = vi.fn().mockResolvedValue(fakeRegistration());
    Object.defineProperty(navigator, 'serviceWorker', { value: { register, controller: null }, configurable: true });
    const { registerServiceWorker } = await import('./registerServiceWorker');
    registerServiceWorker();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });

  it('registers only once however many components ask', async () => {
    const register = vi.fn().mockResolvedValue(fakeRegistration());
    Object.defineProperty(navigator, 'serviceWorker', { value: { register, controller: null }, configurable: true });
    const { registerServiceWorker } = await import('./registerServiceWorker');
    registerServiceWorker(); registerServiceWorker();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('does nothing when serviceWorker is unsupported', async () => {
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    const { registerServiceWorker } = await import('./registerServiceWorker');
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('swallows a rejected registration instead of throwing an unhandled rejection', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    const { registerServiceWorker } = await import('./registerServiceWorker');
    expect(() => registerServiceWorker()).not.toThrow();
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
  });

  it('announces a waiting update only when an older worker already controls the page', async () => {
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const first = fakeRegistration(waiting);
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: vi.fn().mockResolvedValue(first), controller: null }, configurable: true });
    const { registerServiceWorker, UPDATE_READY_EVENT } = await import('./registerServiceWorker');
    const heard = vi.fn();
    window.addEventListener(UPDATE_READY_EVENT, heard);
    registerServiceWorker();
    await vi.waitFor(() => expect(first.update).not.toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(heard).not.toHaveBeenCalled(); // first install: nothing to replace

    vi.resetModules();
    const second = fakeRegistration(waiting);
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: vi.fn().mockResolvedValue(second), controller: {} }, configurable: true });
    const again = await import('./registerServiceWorker');
    const heardUpdate = vi.fn();
    window.addEventListener(again.UPDATE_READY_EVENT, heardUpdate);
    again.registerServiceWorker();
    await vi.waitFor(() => expect(heardUpdate).toHaveBeenCalled());
    window.removeEventListener(UPDATE_READY_EVENT, heard);
    window.removeEventListener(again.UPDATE_READY_EVENT, heardUpdate);
  });

  it('never activates the waiting worker by itself; only applyServiceWorkerUpdate does, by message', async () => {
    const postMessage = vi.fn();
    const waiting = { postMessage } as unknown as ServiceWorker;
    const registration = fakeRegistration(waiting);
    const addEventListener = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: vi.fn().mockResolvedValue(registration), controller: {}, addEventListener }, configurable: true });
    const { registerServiceWorker, applyServiceWorkerUpdate, UPDATE_READY_EVENT } = await import('./registerServiceWorker');
    const heard = vi.fn();
    window.addEventListener(UPDATE_READY_EVENT, heard);
    registerServiceWorker();
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());
    expect(postMessage).not.toHaveBeenCalled();
    applyServiceWorkerUpdate();
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), { once: true });
    window.removeEventListener(UPDATE_READY_EVENT, heard);
  });

  it('checks for an update when the app returns to the foreground', async () => {
    const registration = fakeRegistration();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: vi.fn().mockResolvedValue(registration), controller: {} }, configurable: true });
    const { registerServiceWorker } = await import('./registerServiceWorker');
    registerServiceWorker();
    await new Promise(resolve => setTimeout(resolve, 0));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalled();
  });
});
