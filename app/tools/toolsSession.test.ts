import { describe, expect, it } from 'vitest';
import type { WorkspaceAccount } from './prototype';
import { clearToolsSession, readToolsSession, saveToolsSession } from './toolsSession';

const account: WorkspaceAccount = { id: 'a1', name: 'Pat', username: 'pat', password: '', role: 'viewer', canIssue: false, token: 'browser-only-token' };

describe('Tools browser-local sessions', () => {
  it('restores a session only from the browser storage that saved it', () => {
    saveToolsSession(localStorage, account);
    expect(readToolsSession(localStorage)).toMatchObject({ id: 'a1', token: 'browser-only-token' });
    expect(readToolsSession(sessionStorage)).toBeNull();
  });

  it('clears the saved account without placing credentials in the URL', () => {
    saveToolsSession(localStorage, account);
    clearToolsSession(localStorage);
    expect(readToolsSession(localStorage)).toBeNull();
    expect(window.location.search).not.toContain('token');
    expect(window.location.hash).not.toContain('token');
  });
});
