## Problem
On `/agents/profiles`, a newly created **ACSL Agent Manager** shows **0** in both **States Assigned** and **Partners Assigned** columns, even though clicking the badges opens modals that correctly list the assigned states and partners.

Root cause: the table reads `assigned_states_count` and `assigned_organizations_count` from the `manage-users` edge function response. That endpoint does not return accurate counts for `acsl_agent_manager` users (it currently returns 0 for them). The modals work because they call separate, working endpoints (`getAgentStates`, `getAgentOrganizations`) that read the actual assignment tables.

## Fix (frontend-only, no backend changes)

Single file: `src/app/agents/agents-profiles/AgentsProfilesContent.jsx`.

After `loadAgents()` finishes, hydrate the counts for every agent whose role is `acsl_agent` or `acsl_agent_manager` by calling the same two endpoints the modals already use:

- `superAdminAgentService.getAgentStates(agent.id)` → length sets `assigned_states_count`
- `superAdminAgentService.getAgentOrganizations(agent.id)` → length sets `assigned_organizations_count`

### Implementation details

1. Extract a small helper `hydrateAgentCounts(agentsList)`:
   - Filter to agents with role in `["acsl_agent", "acsl_agent_manager"]`.
   - Run all calls in parallel with `Promise.allSettled`, batched (e.g. 8 at a time) to avoid hammering the endpoint when the list is large.
   - For each settled pair, update that row's counts via a functional `setAgents` so the UI refreshes incrementally as results come in.
   - Failures per agent are swallowed silently (the existing 0 stays).

2. Call `hydrateAgentCounts(rows)` at the end of `loadAgents()`, after `setAgents(rows)`.

3. After `AssignOrganizationsModal` reports success (existing `onSuccess` reload), counts will refresh through the same path — no extra wiring needed.

4. No change to badge click handlers, modal contents, or any other column.

## Out of scope
- Backend / edge function changes (`manage-users` count logic).
- Other roles (`partner`, `partner_agent`, `super_admin`) — they don't use state/partner assignments in this view.
- The Agents Performance Report view.
