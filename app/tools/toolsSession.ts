import type { WorkspaceAccount } from './prototype';

const SESSION_KEY = 'myoffice.tools.session.v2';
const LEGACY_SESSION_KEY = 'myoffice.tools.session.v1';
const BROWSER_KEY = 'myoffice.tools.browser.v1';

type SessionEnvelope = {
  version: 1;
  browserId: string;
  account: WorkspaceAccount;
};

function browserId(storage: Storage) {
  const existing = storage.getItem(BROWSER_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  storage.setItem(BROWSER_KEY, created);
  return created;
}

export function readToolsSession(storage: Storage): WorkspaceAccount | null {
  const raw = storage.getItem(SESSION_KEY);
  const legacy = storage.getItem(LEGACY_SESSION_KEY);
  if (!raw && legacy) {
    try {
      const account = JSON.parse(legacy) as WorkspaceAccount;
      storage.removeItem(LEGACY_SESSION_KEY);
      if (!account.token) return null;
      saveToolsSession(storage, account);
      return account;
    } catch {
      storage.removeItem(LEGACY_SESSION_KEY);
      return null;
    }
  }
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SessionEnvelope;
    if (saved.version !== 1 || saved.browserId !== browserId(storage) || !saved.account?.token) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    return saved.account;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveToolsSession(storage: Storage, account: WorkspaceAccount) {
  const envelope: SessionEnvelope = { version: 1, browserId: browserId(storage), account };
  storage.setItem(SESSION_KEY, JSON.stringify(envelope));
}

export function clearToolsSession(storage: Storage) {
  storage.removeItem(SESSION_KEY);
}
