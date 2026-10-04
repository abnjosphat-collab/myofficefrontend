// app/spares/useSparesData.ts — the spares register and the saved requisitions, each with honest load state (a failed load is an error
// with the rows already shown kept, never an empty list). The register read validates its response shape (api.ts) and makes the
// numbers numbers; the writes in api.ts throw, so a dialog can show why.
'use client';

import { useApiList } from '@/lib/useApiList';
import { apiFetchAll, apiGetSavedReqs } from './api';
import { normalizeSpare } from './stock';
import type { SavedRequisition, Spare } from './types';

const fetchRegister = async () => (await apiFetchAll()).map(normalizeSpare);
const fetchSaved = () => apiGetSavedReqs();

export const useSparesRegister = () => useApiList<Spare>('/api/spares', undefined, { fetcher: fetchRegister });
export const useSavedRequisitions = () => useApiList<SavedRequisition>('/api/spares/saved-requisitions', undefined, { fetcher: fetchSaved });
