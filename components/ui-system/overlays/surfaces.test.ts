// The shared floating surface (menus, select lists, popovers): fade + 4 px
// from the trigger side on the quick spring.
import { describe, expect, it } from 'vitest';
import { floatingSurface } from './surfaces';

describe('floatingSurface', () => {
  it('fades with a 4 px rise on the quick spring (no zoom, no base duration)', () => {
    expect(floatingSurface).toContain('fade-in-0');
    expect(floatingSurface).toContain('slide-in-from-top-1');
    expect(floatingSurface).toContain('slide-in-from-bottom-1');
    expect(floatingSurface).toContain('slide-in-from-right-1');
    expect(floatingSurface).toContain('slide-in-from-left-1');
    expect(floatingSurface).toContain('duration-[var(--mo-spring-quick-duration)]');
    expect(floatingSurface).toContain('ease-spring-quick');
    expect(floatingSurface).not.toContain('zoom-in');
    expect(floatingSurface).not.toContain('zoom-out');
    expect(floatingSurface).not.toContain('mo-duration-base');
  });
});
