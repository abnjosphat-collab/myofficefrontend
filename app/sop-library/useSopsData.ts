// app/sop-library/useSopsData.ts — SOP Library data layer, following the
// established useXData.ts pattern (see app/availabilities/useAvailabilitiesData.ts).
// One load cycle for the active list; archived SOPs are fetched lazily only when
// the archive panel is opened, since most sessions never need them.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';
import {
  fetchSops, fetchArchivedSops, fetchSop, createSop, updateSop, archiveSop, restoreSop,
  type SopListFilters,
} from '@/lib/sops/api';
import { formValuesToPayload, type SopDocument, type SopFormValues, type SopRevision } from '@/lib/sops/types';

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export function useSopsData() {
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [archived, setArchived] = useState<SopDocument[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const load = useCallback(async (filters: SopListFilters = {}, quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchSops(filters);
      setSops(data);
    } catch (e) {
      setError(errorMessage(e, 'Could not load the SOP library.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      setArchived(await fetchArchivedSops());
    } catch (e) {
      toast.error(errorMessage(e, 'Could not load archived SOPs.'));
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  const create = useCallback(async (values: SopFormValues): Promise<SopDocument | null> => {
    try {
      const created = await createSop(formValuesToPayload(values));
      setSops(prev => [created, ...prev]);
      toast.success(`${created.code} created`);
      return created;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create the SOP.'));
      return null;
    }
  }, []);

  const update = useCallback(async (id: string, values: SopFormValues): Promise<SopDocument | null> => {
    try {
      const saved = await updateSop(id, formValuesToPayload(values));
      setSops(prev => prev.map(s => (s.id === id ? saved : s)));
      toast.success(`${saved.code} saved`);
      return saved;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save the SOP.'));
      return null;
    }
  }, []);

  const archive = useCallback(async (sop: SopDocument) => {
    try {
      await archiveSop(sop.id);
      setSops(prev => prev.filter(s => s.id !== sop.id));
      toast.success(`${sop.code} archived`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not archive the SOP.'));
    }
  }, []);

  const restore = useCallback(async (sop: SopDocument) => {
    try {
      const restored = await restoreSop(sop.id);
      setArchived(prev => prev.filter(s => s.id !== sop.id));
      setSops(prev => [restored, ...prev]);
      toast.success(`${sop.code} restored`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not restore the SOP.'));
    }
  }, []);

  /** Refresh one SOP from the server (post-save, before enabling export) —
   *  keeps the export always reading the just-saved server response, not
   *  optimistic local state. */
  const refreshOne = useCallback(async (id: string): Promise<{ sop: SopDocument; revisions: SopRevision[] } | null> => {
    try {
      return await fetchSop(id);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not refresh this SOP.'));
      return null;
    }
  }, []);

  return {
    sops, loading, refreshing, error, load,
    archived, archivedLoading, loadArchived,
    create, update, archive, restore, refreshOne,
  };
}
