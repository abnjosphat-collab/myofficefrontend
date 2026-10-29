import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { FolderFormDialog, MoveDialog } from './FolderDialogs';
import { LocationHeader } from './LocationHeader';
import type { DocFolder, FolderNode } from './types';

const authState = vi.hoisted(() => ({ scope: null as string | null }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ scope: authState.scope, isAtLeast: () => false }),
}));

const folder = (id: string, name: string, parentId: string | null = null): FolderNode =>
  ({ id, name, parentId, sortOrder: 1000, seeded: false, quickPrint: false, description: '', createdBy: '', fileCount: 0, totalCount: 0, children: [], depth: parentId ? 1 : 0 });

const ROOT = folder('r', 'Projects');
const SUB = folder('s', 'Drawings', 'r');

function setup(ui: React.ReactNode) {
  render(<ConfirmProvider>{ui}</ConfirmProvider>);
}

describe('documents scoped account', () => {
  afterEach(() => { authState.scope = null; });

  it('move dialog offers no Unfiled destination when scoped', () => {
    authState.scope = 'Projects';
    setup(<MoveDialog subject={{ kind: 'files', ids: ['d'], names: ['a.txt'], currentFolder: 'r' }} flat={[ROOT, SUB]} onOpenChange={() => {}} onMove={async () => {}} />);
    expect(screen.queryByRole('button', { name: 'Unfiled (not in any folder)' })).toBeNull();
    expect(screen.getByRole('button', { name: /Drawings/ })).toBeInTheDocument();
  });

  it('move dialog offers Unfiled when unscoped', () => {
    setup(<MoveDialog subject={{ kind: 'files', ids: ['d'], names: ['a.txt'], currentFolder: 'r' }} flat={[ROOT, SUB]} onOpenChange={() => {}} onMove={async () => {}} />);
    expect(screen.getByRole('button', { name: 'Unfiled (not in any folder)' })).toBeInTheDocument();
  });

  it('folder menu hides rename and move on the scope root', () => {
    authState.scope = 'Projects';
    const noop = () => {};
    setup(<LocationHeader place={{ kind: 'folder', id: 'r' }} folders={[ROOT] as DocFolder[]} isManager={false} onGo={noop} onNewSub={noop} onRename={noop} onMove={noop} onDelete={noop} />);
    // A non-manager has nothing left to do to the root: no menu at all.
    expect(screen.queryByRole('button', { name: 'More for folder Projects' })).toBeNull();
  });

  it('folder menu keeps rename and move on inner folders when scoped', async () => {
    authState.scope = 'Projects';
    const user = userEvent.setup();
    const noop = () => {};
    setup(<LocationHeader place={{ kind: 'folder', id: 's' }} folders={[ROOT, SUB] as DocFolder[]} isManager={false} onGo={noop} onNewSub={noop} onRename={noop} onMove={noop} onDelete={noop} />);
    await user.click(screen.getByRole('button', { name: 'More for folder Drawings' }));
    expect(screen.getByRole('menuitem', { name: 'Move to…' })).toBeInTheDocument();
  });

  it('new-folder dialog gates the top level on the scope root', () => {
    authState.scope = 'Projects';
    // Root exists: no top-level choice.
    const { unmount } = render(
      <ConfirmProvider>
        <FolderFormDialog target={{ mode: 'create', parentId: 'r' }} flat={[ROOT, SUB]} onOpenChange={() => {}} onSave={async () => {}} />
      </ConfirmProvider>,
    );
    expect(screen.queryByRole('button', { name: /Top level/ })).toBeNull();
    unmount();
    // No root yet: top level is offered, named for the scope.
    setup(<FolderFormDialog target={{ mode: 'create', parentId: null }} flat={[]} onOpenChange={() => {}} onSave={async () => {}} />);
    expect(screen.getByRole('button', { name: /name it Projects/ })).toBeInTheDocument();
  });
});
