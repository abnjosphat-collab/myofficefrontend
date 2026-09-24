import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzySearch';
import { buildWorkspaceSearchIndex, searchWorkspace } from './toolsSearch';
import { TEST_TOOLS } from './testFixtures';

describe('Tools workspace search', () => {
  const index = buildWorkspaceSearchIndex(TEST_TOOLS, [{ id: 'E-7', employeeNumber: 'E-7', name: 'Nia Dube', department: 'Engineering', jobTitle: 'Fitter', active: true }], []);

  it('finds a setting when the query is misspelled', () => {
    expect(searchWorkspace(index, 'custmize')[0]?.title).toBe('Settings');
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

  it('searches preserved source-register documents', () => {
    const withDocument=buildWorkspaceSearchIndex(TEST_TOOLS,[],[],[{id:'r-1',department:'Engineering',original_name:'Workshop opening register.xlsx',content_type:'application/vnd.ms-excel',size_bytes:1200,uploaded_by:'Josphat',uploaded_at:'2026-09-24T08:00:00Z'}]);
    const result=searchWorkspace(withDocument,'workshop opening');
    expect(result.some(item=>item.title==='Workshop opening register.xlsx'&&item.target.type==='tab'&&item.target.tab==='sources')).toBe(true);
  });
});
