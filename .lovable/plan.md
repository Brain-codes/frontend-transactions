## Problem

The "Assigned for Sale / Retrieval" KPI shows 15,295 instead of the expected 13,321 because the total is computed by summing `stove_summary.received` across every agent row:

```ts
const totalAssigned = agents.reduce((s, a) => s + (a.stove_summary?.received || 0), 0);
const totalSold     = agents.reduce((s, a) => s + (a.stove_summary?.sold || 0), 0);
const totalUnsold   = Math.max(0, totalAssigned - totalSold);
```

When two or more agents are linked to the **same partner organization** (very common — a manager + their agent, or co-assigned agents), that organization's stoves are counted once per agent. The per-row badges are correct for each agent, but the KPI double-counts the shared orgs.

The same flaw inflates "Unsold / Unretrieved Stoves" (derived from the inflated Assigned).

"Stoves Sold / Retrieved" can also double-count when a sale's `created_by` agent is linked to multiple agents in the visible list... actually `sold` is keyed off `created_by = agent.id`, so each sale belongs to exactly one agent — that total is safe. Only Assigned and Unsold need fixing.

## Fix

In `src/app/agents/components/SuperAdminAgentsContent.tsx`, change the KPI aggregation to dedupe by organization rather than sum per agent.

1. During the stove-hydration effect (around line 1543–1597), in addition to the per-agent `stove_summary`, build and store the global totals using the **unique** set of organization IDs across all agents:
   - Collect `allOrgIds = new Set<string>()` from every agent's org list.
   - `globalAssigned = sum of stoveTotalByOrg[oid] for oid in allOrgIds` (each org counted once).
   - `globalSold = sum of stoveSoldByOrg[oid] for oid in allOrgIds` if available, otherwise keep the per-agent `sold` sum (since sold is by `created_by` and not double-counted).
   - `globalUnsold = max(0, globalAssigned - <sold-at-those-orgs>)`. Use the org-based sold total so Assigned and Unsold come from the same denominator and stay consistent with the 13,321 figure (which is org-based).
   - Store these on a new state object `stoveTotals = { assigned, sold, unsold }`.

2. Replace the KPI computation block (around lines 1935–1937, 1968, and the Unsold card) to read from `stoveTotals` instead of `agents.reduce(...)`. Fallback to 0 / "—" while loading.

3. Leave per-row badges and per-row sorting untouched — they correctly reflect what each agent personally has access to (overlap is expected at the row level).

4. Optional clarity: add a small subtitle under the Assigned card like `Unique stoves across all partners` so it's obvious the total is deduped (per-agent rows can still sum higher).

## Technical notes

- `stoveTotalByOrg` already exists in the hydration effect; we just need a parallel `stoveSoldByOrg` (count of `sold` per org) from the same `stove_ids` query. The current code only computes `sold` per agent from the `sales` table by `created_by`; to keep Assigned/Unsold internally consistent at the org level, derive Unsold from `stove_ids.status` totals rather than from the sales-table count.
- No schema or RLS changes required; this is a pure client-side aggregation fix.