import { describe, expect, it } from 'vitest';
import { TEST_ACTIVITY as SEED_ACTIVITY, TEST_TOOLS as SEED_TOOLS } from './testFixtures';
import { countTools, selectVisibleActivity, selectVisibleTools } from './toolSelectors';

const base = { department: 'Engineering', status: 'all' as const, search: '', category: 'all', location: 'all', tab: 'register' as const, sort: 'register' };

describe('Tools selectors', () => {
  it('counts active operational states independently of the visible filters', () => {
    expect(countTools(SEED_TOOLS)).toEqual({ total: 9, available: 5, issued: 3, overdue: 1, attention: 1 });
  });

  it('combines search, category, loan and sorting refinements without mutating fixtures', () => {
    const originalOrder = SEED_TOOLS.map(tool=>tool.id);
    const loans = selectVisibleTools(SEED_TOOLS,{...base,tab:'loans',category:'Hand tools',sort:'name'});
    expect(loans.map(tool=>tool.name)).toEqual(['Socket wrench set','Torque wrench']);
    expect(SEED_TOOLS.map(tool=>tool.id)).toEqual(originalOrder);
  });

  it('limits activity to scoped tools and the search phrase', () => {
    const scoped = [SEED_TOOLS[1]];
    expect(selectVisibleActivity(SEED_ACTIVITY,scoped,'alex')).toHaveLength(1);
    expect(selectVisibleActivity(SEED_ACTIVITY,scoped,'rotary')).toHaveLength(0);
  });
});
