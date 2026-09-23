import { describe, expect, it } from 'vitest';
import { isPublicWorkspacePath } from './accessPaths';

describe('MyOffice access paths', () => {
  it('keeps the standalone Tools workspace and auth completion routes public', () => {
    for (const path of ['/tools', '/tools/item/1', '/login', '/auth/callback', '/auth/set-password']) expect(isPublicWorkspacePath(path)).toBe(true);
  });

  it('protects the dashboard and every ERP module', () => {
    for (const path of ['/', '/employees', '/maintenance', '/admin/lists']) expect(isPublicWorkspacePath(path)).toBe(false);
  });
});
