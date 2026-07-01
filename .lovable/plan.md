## Problem

On the ACSL Agents Performance report, the "Assigned for sale / Retrieval" KPI and the "Unsold / Unretrieved Stoves" KPI both show the same value (144), even after 1 stove has been sold. Expected: Assigned = 144, Sold = 1, Unsold = 143.

**Root cause:** the "Assigned" KPI is currently computed from `stove_ids.status != 'sold'` (i.e. only *available* stoves), so it already excludes sold stoves. Then Unsold reuses that same available count. The sold stove is never counted into the assigned pool, so subtracting sold has no visible effect.

## Fix (frontend only, `src/app/agents/components/SuperAdminAgentsContent.tsx`)

Redefine the three KPIs so they behave as the user expects:

1. **Assigned for sale / Retrieval** = every non-archived stove at the agents' directly-assigned partner orgs, regardless of status (`available` + `sold` + any other). This is the fixed pool of stoves handed to the agent group to sell.
2. **Stoves Sold / Retrieved** = unchanged (attribution-based: sales `created_by` these agents at these orgs, non-archived).
3. **Unsold / Unretrieved Stoves** = `Assigned − Sold`.

### KPI computation changes

- Replace the current "count available stoves per org" query with a "count all non-archived stoves per org" query used to build `globalAssigned`.
- Keep a parallel map of *available* stove IDs per org (needed for the Unsold modal and for the per-agent `stove_summary.available` column already shown in the table).
- Set `stoveTotals.assigned = globalAssigned` (all stoves) and `stoveTotals.unsold = max(0, globalAssigned − globalSold)`.
- Per-agent row `stove_summary`: keep `received` = all stoves at that agent's orgs, `sold` = attribution sold, `available` = received − sold (already the pattern used in the table).

### Modal changes

- **Assigned modal** (`mode="assigned"` — new mode, or reuse existing): list every non-archived stove at the org set, showing status. Columns: Stove ID, Partner, State, Branch, Status. Include export + search.
- **Unsold modal** (`mode="unsold"`): fetch all non-archived stoves at the org set, then exclude any stove IDs that appear as sold-by-these-agents (compute the sold ID set the same way the Sold modal does, then filter). Result count matches `Assigned − Sold`.
- **Sold modal**: unchanged.

### Wiring

- The "Assigned for sale / Retrieval" KPI card currently opens `AssignedStovesModal`. Point it at the new all-status query so its total matches the KPI (currently it shows 144 because that modal also queried available-only). After the change both the card and the modal show the full assigned pool.
- No schema changes, no service changes, no changes to sidebar/routing.

## Verification

After the change, with the current data (144 available + 1 sold by an agent):
- Assigned KPI = 145, Sold = 1, Unsold = 144 — **OR** if the user's 144 already includes the sold one (data-dependent), Assigned = 144, Sold = 1, Unsold = 143.
Either way the invariant `Assigned − Sold = Unsold` holds and clicking each KPI opens a modal whose row count matches the KPI number.
