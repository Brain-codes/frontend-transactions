## Goal
Populate the **Assigned / Collected / In Stock** columns on the Agents Performance Report with real numbers, using the definitions you gave:

- **Assigned** = total stoves across every partner linked to the agent (direct + via state assignment)
- **Collected** = stoves with `status = 'sold'` for those same partners
- **In Stock** = stoves with `status != 'sold'` (i.e. still available) for those partners

Only `SuperAdminAgentsContent.tsx` changes. No backend / edge-function changes.

## Approach

After `fetchAgents` finishes loading the user rows, run a second pass that computes `stove_summary` per agent client-side and merges it into state.

1. For each agent in the page, call `superAdminAgentService.getAgentOrganizations(agent.id)` in parallel (`Promise.all`). This already returns the unified list of orgs assigned to the user — both direct assignments and orgs covered by state assignments — so it works for ACSL agents, managers, and any other role that has the relation. Users with no assignments resolve to an empty list → `0 / 0 / 0`.
2. Build `agentOrgs: Record<agentId, string[]>` and a deduped set of all `organization_id`s seen.
3. Query `stove_ids` once in batches of 200:
   ```
   supabase.from("stove_ids")
     .select("organization_id, status")
     .in("organization_id", batch)
     .eq("is_archived", false)
   ```
   Aggregate into `orgStoveCounts: Record<orgId, { total, sold, available }>` (same pattern already used in the Purchases-from-ACSL modal in this file).
4. For each agent, sum its orgs' counts → `{ received: total, sold, available }` and update the agents array with `stove_summary`.
5. Render falls through unchanged — the existing JSX already reads `agent.stove_summary.{received,sold,available}` for the three badge columns, plus the existing sort/KPI logic on `received` / `sold`.

## Loading behavior

- Show the row counts as a small spinner (or em-dash placeholder, matching today's fallback) until the summary pass resolves, then swap in the badges. The table itself renders immediately from `fetchAgents`; only the three numeric columns hydrate a moment later.
- Re-run the summary pass whenever `fetchAgents` re-runs (filters, pagination, refresh). Guard with an "ignore stale result" flag so a fast filter change doesn't overwrite with older numbers.

## Edge cases

- Non-agent roles with no org assignments → all three columns show `0`.
- `getAgentOrganizations` failure for a single agent → that agent's columns fall back to `—`; others still populate.
- Page size of 100 × ~3 stove batches keeps this well within Supabase rate limits.

## Out of scope

- No change to the Agents Profile view.
- No change to data model, edge functions, or the `manage-users` response shape.
- Definitions of Purchased/Sold/Available on other views are untouched.
