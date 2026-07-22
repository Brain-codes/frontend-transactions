## Diagnosis (unconfirmed — needs a quick data check)

The Records Collected chart in `src/app/agents/components/AgentRecordsChart.tsx` builds its roster from `manage-users` filtered to only two roles:

```
const AGENT_ROLES = ["acsl_agent", "acsl_agent_manager"];
```

It then reads `sales.created_by IN (agentIds)`. But elsewhere in the app, "agent" also includes `super_admin_agent` — `create-sale/index.ts` treats `super_admin_agent` as an agent, and `manage-users/read-operations.ts` lists it among agent roles. If Kamal Mustapha (the seller of the 6 July sales) has role `super_admin_agent`, his ID is never fetched, so his sales never bucket into the chart and it renders zeros.

The KPI card for his 6 sales comes from a different code path that does count `super_admin_agent`, which is why the numbers disagree.

## Fix

1. In `AgentRecordsChart.tsx`, extend the roster to all three agent roles:
   ```
   const AGENT_ROLES = ["acsl_agent", "acsl_agent_manager", "super_admin_agent"];
   ```
   This is used both by `fetchAgentIdsViaManageUsers` (which loops per role) and by the RLS fallback (`profiles.in("role", AGENT_ROLES)`).

2. Keep the existing batched `sales.in("created_by", batch)` query — no other change needed, because `created_by` is set to the caller's userId in `create-sale`.

3. Verification step: after the change, open the Agents Performance tab; the July bucket should show 6 (matching Kamal's KPI). If it still shows 0, the sales' `created_by` isn't Kamal's profile id — I'll then log the fetched agentIds and a sample sales row in the browser console to confirm the mismatch and adjust (e.g. fall back to querying sales by `profiles.role IN agent roles` via a join).

## Scope

Frontend-only change to one file: `src/app/agents/components/AgentRecordsChart.tsx`. No backend, schema, or RLS changes.
