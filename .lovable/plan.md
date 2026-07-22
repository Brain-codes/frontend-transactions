## The problem: three different sources are answering the same question

"How many states are assigned to an agent?" is computed three different ways today, so the numbers can never agree.

1. **Agents Performance — the "States Assigned" number on each agent row (the "25")**
   Computed client-side in `SuperAdminAgentsContent.tsx` (`agentToStates` around L2456–2586) as the **unique set of `organizations.state` across every partner org reachable by the agent** (direct assignments in `super_admin_agent_organizations` / `acsl_agent_organizations`, unioned across all agent-id column variants). This is the derived, partner-driven definition and it matches the rule the user has stated ("as long as an agent has partners assigned, all the states of those partners are states assigned to the agent").

2. **Agents Performance — the modal that opens when you click that number (the "37")**
   `AgentStatesModal` (L1630) calls `superAdminAgentService.getAgentStates(agent.id)`, which reads the **legacy `acsl_agent_states` table only** (see `supabase/functions/super-admin-agents/stateOptions.ts`). That table holds explicit state rows written by the old "Assign by State" flow and is completely independent of the partner-derived set. It commonly contains stale rows from before partners were assigned/unassigned, which is why the modal shows more (37) than the badge (25).

3. **States Performance — "26 states with assigned partners"**
   `StatesPerformanceContent.tsx` renders one row per state that has at least one partner org (`filtered.length` at L690). Its scope is "states where any partner exists", independent of agent assignments. So 26 can legitimately differ from 25 — a state can have partners but no agent covering those partners.

Net: 25 ≠ 37 is a bug (two views of the same agent disagree). 25 vs 26 is a definitional gap (partner-covered states vs agent-covered states) that should be shown explicitly, not hidden.

## The fix

Make the partner-derived set the single source of truth for "States Assigned to an agent" everywhere on Agents Performance, and surface the partner-covered vs agent-covered comparison on States Performance so the user can see the gap instead of guessing.

### 1. Modal reads the same derived set as the row badge
`src/app/agents/components/SuperAdminAgentsContent.tsx`
- Pass the row's already-computed `agent.assigned_states` array into `AgentStatesModal` as a prop.
- In `AgentStatesModal`, render that prop directly; drop the `superAdminAgentService.getAgentStates()` call and its loading/error branches. The badge count and the modal list then come from one array, so they cannot disagree.
- Keep the search filter and the "N of M" chip; they operate on the passed array.

### 2. Row badge stays derived, but stop showing stale legacy rows anywhere in this view
Same file — no change to `agentToStates` logic; it already implements the "partners → their states" rule the user described. Removing the modal's separate fetch also removes the only remaining consumer of `acsl_agent_states` on this view.

### 3. Make the Agents vs States numbers reconcilable on States Performance
`src/app/agents/components/StatesPerformanceContent.tsx`
- Keep the existing "States" KPI (states with partners — currently 26).
- Add a small secondary line under that KPI: `X of Y covered by an agent`, where `Y` = current KPI value and `X` = count of those states that appear in at least one agent's derived `assigned_states`. This is the number that should equal the Agents Performance total (25 today) and makes the 25 vs 26 delta visible and explainable ("1 state has partners but no agent covering it").

### 4. Optional cleanup (no behavior change requested by user, list only)
The `acsl_agent_states` table and `superAdminAgentService.getAgentStates` are now unused by this view. Leaving them in place is safe; a follow-up can retire them once we confirm no other view reads them.

## What the user will see after the fix

- Clicking "States Assigned = 25" on an agent row opens a modal listing exactly those 25 states — no more 37.
- States Performance still shows 26 states (states with partners) and adds "25 of 26 covered by an agent" so the two tabs reconcile at a glance.
- Every "States Assigned" number on the Agents Performance view is driven by the same partner-derived rule.

## Technical notes

- No schema changes. No edge-function changes required for the core fix (the derived set is already computed in `read-operations.ts` and re-hydrated client-side).
- Files touched:
  - `src/app/agents/components/SuperAdminAgentsContent.tsx` — modal props + render; remove modal's own fetch.
  - `src/app/agents/components/StatesPerformanceContent.tsx` — add "X of Y covered by an agent" sub-line on the States KPI; compute X from the same agent roster the tab already loads (via `manage-users`).
