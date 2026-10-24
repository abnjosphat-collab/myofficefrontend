import { describe, it, expect } from 'vitest';
import { profileScope } from './scope';

describe('profileScope', () => {
  it('reads permissions.scope', () => {
    expect(profileScope({ permissions: { scope: 'Projects' } })).toBe('Projects');
  });

  it('trims whitespace', () => {
    expect(profileScope({ permissions: { scope: '  Projects ' } })).toBe('Projects');
  });

  it('is null when unlimited or malformed', () => {
    expect(profileScope(null)).toBeNull();
    expect(profileScope(undefined)).toBeNull();
    expect(profileScope({})).toBeNull();
    expect(profileScope({ permissions: null })).toBeNull();
    expect(profileScope({ permissions: {} })).toBeNull();
    expect(profileScope({ permissions: { scope: null } })).toBeNull();
    expect(profileScope({ permissions: { scope: '' } })).toBeNull();
    expect(profileScope({ permissions: { scope: '   ' } })).toBeNull();
    expect(profileScope({ permissions: { scope: 42 } })).toBeNull();
    expect(profileScope({ permissions: { scope: ['Projects'] } })).toBeNull();
  });
});
