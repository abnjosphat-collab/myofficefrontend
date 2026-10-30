import { describe, it, expect } from 'vitest';
import { profileScope, profileLimit, profileDepartment, profileModules } from './scope';

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

describe('profileLimit', () => {
  it('reads a string scope as a section', () => {
    expect(profileLimit({ permissions: { scope: 'Projects' } })).toEqual({ kind: 'section', value: 'Projects' });
  });

  it('reads {department} as a department', () => {
    expect(profileLimit({ permissions: { scope: { department: 'Mining' } } })).toEqual({ kind: 'department', value: 'Mining' });
  });

  it('reads {kind,value} pairs', () => {
    expect(profileLimit({ permissions: { scope: { kind: 'department', value: 'Mining' } } })).toEqual({ kind: 'department', value: 'Mining' });
    expect(profileLimit({ permissions: { scope: { kind: 'section', value: 'Projects' } } })).toEqual({ kind: 'section', value: 'Projects' });
  });

  it('is null for blank and malformed values', () => {
    expect(profileLimit(null)).toBeNull();
    expect(profileLimit({ permissions: { scope: '' } })).toBeNull();
    expect(profileLimit({ permissions: { scope: { department: '  ' } } })).toBeNull();
    expect(profileLimit({ permissions: { scope: { kind: 'team', value: 'X' } } })).toBeNull();
    expect(profileLimit({ permissions: { scope: ['Mining'] } })).toBeNull();
  });
});

describe('profileDepartment', () => {
  it('reads the department limit', () => {
    expect(profileDepartment({ permissions: { scope: { department: 'Mining' } } })).toBe('Mining');
  });

  it('is null for section limits and unlimited accounts', () => {
    expect(profileDepartment({ permissions: { scope: 'Projects' } })).toBeNull();
    expect(profileDepartment({ permissions: {} })).toBeNull();
    expect(profileDepartment(null)).toBeNull();
  });
});

describe('profileModules', () => {
  it('reads valid module hrefs', () => {
    expect(profileModules({ permissions: { modules: ['/employees', '/ppe'] } })).toEqual(['/employees', '/ppe']);
  });

  it('drops malformed entries', () => {
    expect(profileModules({ permissions: { modules: ['/employees', 'ppe', '/with space', 42, null] } })).toEqual(['/employees']);
  });

  it('is null when the account has no module limit', () => {
    expect(profileModules({ permissions: {} })).toBeNull();
    expect(profileModules({ permissions: { modules: null } })).toBeNull();
    expect(profileModules({ permissions: { modules: 'x' } })).toBeNull();
    expect(profileModules(null)).toBeNull();
  });
});
