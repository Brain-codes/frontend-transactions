## Problem

On the Agents Performance Report table, the **States Assigned** column shows `0` for most ACSL agents even when partners are assigned to them.

Root cause is in `supabase/functions/manage-users/read-operations.ts` (lines 184–199). For `acsl_agent` / `super_admin_agent` users, `assigned_states_count` is computed by counting rows in a separate `acsl_agent_states` direct-assignment table:

```ts
supabase.from("acsl_agent_states")
  .select("*", { count: "exact", head: true })
  .eq("agent_id", user.id)
```

In this project, agents are assigned **partner organizations** (via `acsl_agent_organizations`), not states directly. Unless a state was also explicitly written to `acsl_agent_states`, the count is 0 — which is exactly what the table is showing. The expected behavior is: derive the agent's states from the `state` column of the partner organizations already assigned to that agent.

## Fix (edge function only)

In `supabase/functions/manage-users/read-operations.ts`, change the ACSL agent branch to derive states from the agent's assigned organizations:

1. For each `acsl_agent` / `super_admin_agent` user, replace the two parallel count queries with a single fetch:
   ```ts
   const { data: assignments } = await supabase
     .from("acsl_agent_organizations")
     .select("organization_id, organizations!inner(state)")
     .eq("agent_id", user.id);
   ```
2. Derive:
   - `assigned_organizations_count` = `assignments.length`
   - `assigned_states` = de-duplicated, non-empty, case-insensitive-unique list of `assignments[i].organizations.state`
   - `assigned_states_count` = `assigned_states.length`
3. Return `assigned_states` (the array) on the user payload as well, so the existing "View assigned states" modal in `SuperAdminAgentsContent.tsx` (which already reads `agent.assigned_states`) shows the correct list. Keep the payload shape backward-compatible — all existing fields remain.
4. Keep the `partner_agent` / `agent` branch unchanged (their single org.state already drives the count correctly).
5. Union with any legacy explicit rows in `acsl_agent_states` if that table is still populated, so agents assigned directly to states aren't regressed:
   - fetch `state` values from `acsl_agent_states` for the same `agent_id` and merge into the set before counting.

No frontend changes required — `SuperAdminAgentsContent.tsx` already reads `assigned_states_count` and `assigned_states` from the API payload. No schema changes.

## Verification

After deploying the updated `manage-users` function:
- The States Assigned pill on the Agents Performance Report reflects the number of distinct states across the agent's assigned partners.
- Clicking the pill opens the states modal populated with those state names.
- Agents with no partner assignments still show `0`.
