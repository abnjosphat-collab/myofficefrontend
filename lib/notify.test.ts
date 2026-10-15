import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { notify, setSoundEnabled, soundEnabled } from './notify';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function mockAudioContext() {
  const osc = { type: '', frequency: { value: 0 }, connect: vi.fn().mockReturnThis(), start: vi.fn(), stop: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis() };
  const ctx = { state: 'running', currentTime: 0, createOscillator: vi.fn(() => osc), createGain: vi.fn(() => gain), resume: vi.fn() };
  function FakeAudioContext(this: unknown) { return ctx; }
  Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, writable: true, configurable: true });
  return { osc, ctx };
}

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    (window as unknown as Record<string, unknown>).AudioContext = undefined;
  });

  it('leaves sound on by default and persists the choice', () => {
    expect(soundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(soundEnabled()).toBe(false);
    expect(window.localStorage.getItem('myoffice.notify.sound')).toBe('off');
    setSoundEnabled(true);
    expect(soundEnabled()).toBe(true);
  });

  it('shows failures longer than successes, and honours an explicit duration', () => {
    notify.success('Saved');
    notify.error('Failed', { description: 'No connection' });
    expect(toast.success).toHaveBeenCalledWith('Saved', { duration: 4000 });
    expect(toast.error).toHaveBeenCalledWith('Failed', { description: 'No connection', duration: 8000 });
    notify.info('Note', { duration: 1000 });
    expect(toast.info).toHaveBeenCalledWith('Note', { duration: 1000 });
  });

  it('plays a soft sound unless muted or audio is missing', () => {
    notify.success('Saved');
    expect(toast.success).toHaveBeenCalledOnce();

    const { osc } = mockAudioContext();
    notify.success('Saved again');
    expect(osc.start).toHaveBeenCalled();

    setSoundEnabled(false);
    osc.start.mockClear();
    notify.error('Failed');
    expect(osc.start).not.toHaveBeenCalled();
  });
});
