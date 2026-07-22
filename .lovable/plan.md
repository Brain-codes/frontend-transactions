## Fixes for Agents Performance view

### 1. States Assigned column always shows 0 for most agents

**Root cause (verified):**
- `manage-users/read-operations.ts` derives `assigned_states_count` only from the `acsl_agent_organizations` table using the `agent_id` column, and only for roles `acsl_agent` / `super_admin_agent`.
- Per `src/app/services/agentAssignmentQueries.js` (the shared source of truth), assignments actually live in **two** tables (`super_admin_agent_organizations` and `acsl_agent_organizations`) and the agent id column has drifted between `agent_id`, `super_admin_agent_id`, and `user_id`. The backend misses everything outside the single table/column it queries, and it never runs for `acsl_agent_manager`.
- The frontend hydration effect in `SuperAdminAgentsContent.tsx` recomputes `assigned_organizations_count` from the client-side org resolver but never recomputes `assigned_states_count`, so the wrong backend number sticks.

**Fix:**
- Backend (`supabase/functions/manage-users/read-operations.ts`):
  - Include `acsl_agent_manager` in the ACSL branch alongside `acsl_agent`/`super_admin_agent`.
  - Replace the single-table query with a union across both assignment tables and all three agent-id column variants (mirroring `getAgentIdsForPartner` logic).
  - Join to `organizations(state)` and union with legacy `acsl_agent_states` rows to build `assigned_states` / `assigned_states_count`.
- Frontend (`src/app/agents/components/SuperAdminAgentsContent.tsx`, hydration effect around line 2530):
  - Reuse the already-fetched `orgListResults` (each org already carries a `state`) to compute a unique per-agent state set from **all** reachable orgs (direct + via state assignments).
  - Merge that `assigned_states` array and `assigned_states_count` into each agent alongside the existing `stove_summary` / `direct_org_ids` merge, so the badge and the "States Assigned" modal are always accurate regardless of backend gaps.

### 2. Records Collected chart is empty even when an agent has sales

**Root cause (verified):**
- `AgentRecordsChart.tsx` builds its agent id list by selecting from `profiles` with the browser Supabase client. That query is subject to RLS and, for the same reason the earlier "States Performance" agent count was wrong (23 vs 24), it returns a truncated or empty roster. With no agent ids, the follow-up `sales` query is skipped and the chart renders all zeros.
- The per-agent "Records Collected" KPI in the table works because it hits `sales` directly per agent id already loaded via the `manage-users` edge function — that path bypasses the RLS-restricted `profiles` read.

**Fix:**
- Rework `AgentRecordsChart.tsx` to source the agent id set the same way the table does: fetch the ACSL roster via the `manage-users` edge function (roles `acsl_agent`, `acsl_agent_manager`), then run the existing batched `sales` query keyed on `created_by IN agentIds` and bucket by month.
- Keep the current chart UI, tooltip, and month bucketing unchanged.

### Technical notes

- No schema changes. No new tables or migrations.
- Backend change is isolated to `read-operations.ts`; response shape (`assigned_states`, `assigned_states_count`) is unchanged, only the values become correct.
- Frontend state-derivation change is additive inside the existing `useEffect` that already runs after `getAgentOrganizations`, so no extra network calls.
- Chart change swaps a single `profiles` query for a `manage-users` call already used elsewhere on the page — no new dependencies.

### Files to change

- `supabase/functions/manage-users/read-operations.ts`
- `src/app/agents/components/SuperAdminAgentsContent.tsx` (hydration effect only)
- `src/app/agents/components/AgentRecordsChart.tsx`
