/**
 * Helpers for running PostgREST `.in()` / `.or()` filters over LARGE id lists.
 *
 * PostgREST serializes these filters into the request URL. When a list has
 * hundreds of ids (e.g. an ACSL agent scoped to hundreds of organizations),
 * the URL grows to tens of KB and the HTTP/2 layer between the Edge Function
 * and PostgREST rejects it with:
 *   "http2 error: stream error detected: unspecific protocol error detected"
 *
 * These helpers split the id list into chunks, run each chunk as its own query
 * in parallel, and merge the results — keeping every URL small and safe.
 *
 * IMPORTANT: chunking assumes the chunks are DISJOINT (a list of unique ids is,
 * by definition). Summed counts are therefore exact for a plain `.in()`. When a
 * side query (e.g. an attribution `.or(...)`) can overlap the chunks, dedupe by
 * row `id` and treat summed counts as an upper bound.
 */

export const IN_CHUNK_SIZE = 100;

export function chunkArray<T>(arr: T[], size = IN_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Sum an exact/head COUNT across a large id list. `makeQuery(chunk)` must return
 * a PostgREST builder configured with `{ count: "exact", head: true }` and the
 * `.in(col, chunk)` filter applied. Chunks are disjoint, so counts sum exactly.
 */
export async function countInChunks(
  ids: string[],
  makeQuery: (chunk: string[]) => any,
  size = IN_CHUNK_SIZE
): Promise<{ count: number; error: any }> {
  if (ids.length === 0) return { count: 0, error: null };
  const chunks = ids.length <= size ? [ids] : chunkArray(ids, size);
  const results = await Promise.all(chunks.map((c) => makeQuery(c)));
  const error = results.find((r: any) => r.error)?.error || null;
  const count = results.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
  return { count, error };
}

/**
 * Fetch and merge the FULL result set for a query scoped by a large id list,
 * when the caller consumes every row (no DB-side pagination). `makeQuery(chunk)`
 * must return a PostgREST builder with the `.in(col, chunk)` filter applied.
 * Rows are deduped by `id` when present.
 */
export async function selectInChunks<T = any>(
  ids: string[],
  makeQuery: (chunk: string[]) => any,
  size = IN_CHUNK_SIZE
): Promise<{ data: T[]; error: any }> {
  if (ids.length === 0) return { data: [], error: null };
  const chunks = ids.length <= size ? [ids] : chunkArray(ids, size);
  const results = await Promise.all(chunks.map((c) => makeQuery(c)));
  const error = results.find((r: any) => r.error)?.error || null;
  const seen = new Set<any>();
  const data: T[] = [];
  for (const r of results) {
    for (const row of (r.data as any[]) || []) {
      if (row?.id != null) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
      }
      data.push(row);
    }
  }
  return { data, error };
}

/**
 * Paginated fetch (offset/limit + a sort) over a large id list. Each chunk
 * returns its own top `(offset + limit)` rows; the global page is a subset of
 * their union, so we merge, sort with `compare`, and slice. Counts sum exactly
 * (disjoint chunks). `makeQuery(chunk)` must return a builder with select
 * (`{ count: "exact" }`), all filters, the `.in(col, chunk)`, and ordering
 * applied — but NOT `.range()` (this helper applies it).
 */
export async function paginatedSelectInChunks<T = any>(
  ids: string[],
  makeQuery: (chunk: string[]) => any,
  opts: { offset: number; limit: number; compare: (a: T, b: T) => number },
  size = IN_CHUNK_SIZE
): Promise<{ data: T[]; count: number; error: any }> {
  const { offset, limit, compare } = opts;
  const top = offset + limit;

  if (ids.length === 0) return { data: [], count: 0, error: null };
  if (ids.length <= size) {
    const { data, count, error } = await makeQuery(ids).range(0, top - 1);
    const rows = ((data as T[]) || []).slice(offset, offset + limit);
    return { data: rows, count: count || 0, error };
  }

  const chunks = chunkArray(ids, size);
  const results = await Promise.all(chunks.map((c) => makeQuery(c).range(0, top - 1)));
  const error = results.find((r: any) => r.error)?.error || null;

  const seen = new Set<any>();
  const merged: T[] = [];
  let count = 0;
  for (const r of results) {
    count += r.count || 0;
    for (const row of (r.data as any[]) || []) {
      if (row?.id != null) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
      }
      merged.push(row);
    }
  }
  merged.sort(compare);
  return { data: merged.slice(offset, offset + limit), count, error };
}
