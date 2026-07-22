## Problem

On the Agents Performance Report view, "Records to collect", "Records collected", and "Records not collected" columns go blank after changing pages, and only reappear on a full page refresh.

## Root cause (verified in `SuperAdminAgentsContent.tsx`)

Pagination on this table is client-side (`pageRows = tableFilteredAgents.slice(...)`), but `fetchAgents` still lists `page` and `pageSize` in its `useCallback` dependencies (line 2382). So every page change:

1. Re-runs `fetchAgents`, which rebuilds `agents` from scratch via `setAgents(rows)` (line 2360). The new agent objects have no `stove_summary` / `direct_org_ids` yet.
2. The stove hydration effect is keyed on `agentIdsKey = agents.map(a => a.id).join(",")` (line 2395, effect at 2396–2549). Because the underlying IDs are unchanged, `agentIdsKey` is the same string and the memo returns the same reference — so React skips the effect and the hydrated stove counts are never re-merged.

Result: the three stove-related cells stay empty until a hard refresh (which happens to re-run everything from a clean state).

## Fix

Keep client-side pagination working seamlessly without losing hydrated data.

1. In `src/app/agents/components/SuperAdminAgentsContent.tsx`, remove `page` and `pageSize` from the `fetchAgents` `useCallback` deps (line 2382) so paging no longer refetches the full agent list. Pagination is already applied to `tableFilteredAgents`, so no data is lost.
2. As a safety net, preserve prior enrichment when `fetchAgents` does run (e.g. after a real filter change or a `acsl:user-updated` event): change `setAgents(rows)` to a functional update that copies `stove_summary`, `direct_org_ids`, `assigned_organizations_count`, and `total_partners_count` from the previous entry with the same `id` when present. This avoids a flash of empty cells during the brief window before the hydration effect finishes.
3. Verify by paging forward/back and changing page size on the Agents Performance table — the three stove columns must remain populated without any refresh, and the KPI totals / sorting must still work.

No schema, backend, or UI-layout changes.
