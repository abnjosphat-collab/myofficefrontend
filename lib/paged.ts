// lib/paged.ts — load every row of a list endpoint that is capped per request.
// Several backend list routes (near miss, VFL, PTO, work stoppage, Pachedu, safety complaints, breakdowns,
// production) return only the newest 30 to 200 rows unless `limit`/`offset` are passed. A page that skips this
// shows an incomplete register with no sign that anything is missing, so such lists must come through here.
import { api } from '@/lib/apiClient';

export const PAGE_SIZE = 1000; // the backend maximum for `limit`
const MAX_PAGES = 50;

export interface PagedOptions<T> {
  pageSize?: number;
  /** Names the source in the invalid-response error ("Near Miss returned an invalid response."). */
  label?: string;
  /** Pull the rows out of a wrapped response such as `{ data: [...] }`. Defaults to the response itself. */
  pick?: (raw: unknown) => T[] | undefined;
}

/** For routes that wrap their rows: `{ data: [...] }`, or a bare array. */
export const unwrapRows = <T,>(raw: unknown): T[] | undefined => (Array.isArray(raw) ? raw as T[] : (raw as { data?: T[] } | null)?.data);

/**
 * Fetches `path` page by page until a short page arrives. Throws rather than returning a partial list when the
 * response has no rows array or when the safety cap is hit, so a failure can never look like a complete result.
 * Only use it on endpoints that honour `limit` and `offset`.
 */
export async function getAllPages<T>(path: string, { pageSize = PAGE_SIZE, label, pick }: PagedOptions<T> = {}): Promise<T[]> {
  const rows: T[] = [];
  const joiner = path.includes('?') ? '&' : '?';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const raw = await api.get<unknown>(`${path}${joiner}limit=${pageSize}&offset=${page * pageSize}`);
    const data = pick ? pick(raw) : raw;
    if (!Array.isArray(data)) throw new Error(label ? `${label} returned an invalid response.` : 'The server returned an unexpected response.');
    rows.push(...(data as T[]));
    if (data.length < pageSize) return rows;
  }
  throw new Error(`There are more than ${MAX_PAGES * pageSize} records, which this page cannot load completely.`);
}
