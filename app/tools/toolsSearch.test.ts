import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzySearch';
import { buildWorkspaceSearchIndex, searchWorkspace } from './toolsSearch';
import { TEST_TOOLS } from './testFixtures';

describe('Tools workspace search', () => {
  const index = buildWorkspaceSearchIndex(TEST_TOOLS, [{ id: 'E-7', employeeNumber: 'E-7', name: 'Nia Dube', department: 'Engineering', jobTitle: 'Fitter', active: true }], []);

  it('finds a setting when the query is misspelled', () => {
    expect(searchWorkspace(index, 'custmize')[0]?.title).toBe('Customize workspace');
  });

  it('uses domain synonyms to find employee navigation', () => {
    expect(searchWorkspace(index, 'personnel').some(result => result.title === 'Employee register')).toBe(true);
  });

  it('ranks an equipment record for a close spelling', () => {
    const expected = TEST_TOOLS[0].name;
    const typo = expected.toLowerCase().replace(/[aeiou]/, '');
    expect(searchWorkspace(index, typo).some(result => result.title === expected)).toBe(true);
  });

  it('does not treat unrelated text as a result', () => {
    expect(fuzzyScore('zqxv', 'equipment register')).toBe(0);
  });
});
