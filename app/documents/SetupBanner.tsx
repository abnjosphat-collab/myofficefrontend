// app/documents/SetupBanner.tsx — the two one-off jobs that make the library complete, shown to managers until they are done: create
// the Asset Management System folders (skipping every folder that already exists), and read the words of files uploaded before text
// search existed. Other people see what is pending and who can do it.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Notice } from '@/components/ui-system';
import { reindexAll, seedAmsFolders } from './useDocumentsData';

const reason = (e: unknown) => (e instanceof Error ? e.message : 'something went wrong');

export function SetupBanner({ isManager, amsMissing, unindexed, onChanged }: { isManager: boolean; amsMissing: number; unindexed: number; onChanged: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await seedAmsFolders();
      toast.success(`${r.created} ${r.created === 1 ? 'folder' : 'folders'} created${r.adopted ? `, ${r.adopted} of your existing ${r.adopted === 1 ? 'folder' : 'folders'} placed in the structure` : ''}${r.skipped ? `, ${r.skipped} already there` : ''}.`);
      onChanged();
    } catch (e) { toast.error(`The AMS folders were not created: ${reason(e)}`); } finally { setSeeding(false); }
  };
  const read = async () => {
    setLeft(unindexed);
    try { await reindexAll(setLeft); toast.success('Every file can now be found by what is written inside it.'); }
    catch (e) { toast.error(`Reading stopped: ${reason(e)}`); }
    finally { setLeft(null); onChanged(); }
  };

  if (amsMissing === 0 && unindexed === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {amsMissing > 0 && (
        <Notice
          tone="info" title="The Asset Management System folders are not all set up"
          action={isManager ? <Button size="sm" icon="folder-add" pending={seeding} onClick={seed}>Set up the AMS folders</Button> : undefined}
        >
          {amsMissing} {amsMissing === 1 ? 'folder' : 'folders'} of the structure {amsMissing === 1 ? 'is' : 'are'} still to be created. Folders you already have are kept and, where the name matches, placed in the structure with their files.
          {!isManager && ' A manager can set them up.'}
        </Notice>
      )}
      {unindexed > 0 && (
        <Notice
          tone="info" title="Some files cannot be found by what is written inside them yet"
          action={isManager ? <Button size="sm" icon="search" pending={left !== null} onClick={read}>{left !== null ? `${left} to go` : 'Read them now'}</Button> : undefined}
        >
          {unindexed} {unindexed === 1 ? 'file was' : 'files were'} added before text search existed. They are still found by name, comment and tags.
          {!isManager && ' A manager can read them.'}
        </Notice>
      )}
    </div>
  );
}
