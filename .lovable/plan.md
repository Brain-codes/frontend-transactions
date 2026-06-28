## Problems

### 1. New ACSL Agent shows 122 partners instead of the 2 assigned

In `src/app/agents/agents-profiles/AgentsProfilesContent.jsx`, the Partners Assigned count for `acsl_agent` users is hydrated by calling `superAdminAgentService.getAgentOrganizations(agent.id)` (the `/super-admin-agents/{id}/organizations` edge function).

That endpoint was originally written to return partners "available to" an ACSL Agent — i.e. every partner located in any state the agent is assigned to — not the partners explicitly checked in the Create User form. So as soon as the new agent's *state* assignment covers a state that contains all 122 partners, the count comes back as 122 even though only 2 rows were written to the agent ↔ organization assignment table.

We confirmed that the create flow itself writes the right data:
- `handleCreateUser` in `UserManagementContent.jsx` (lines 491-497) calls `superAdminAgentService.setAgentOrganizations(newUserId, Array.from(selectedPartnerIds))` with exactly the 2 selected partner IDs.

So the persisted assignments are correct; only the *display* is wrong because we're reading from a "by-state" view instead of "by-direct-assignment".

### 2. Page appears to reload itself

`hydrateAgentCounts` iterates every `acsl_agent` / `acsl_agent_manager` row, fires two requests per agent, and calls `setAgents(prev => …)` on each settled result. With many agents this produces dozens of sequential re-renders, which on `/agents/profiles` looks like the page is flickering / reloading. (The "vite ws lost" + Grammarly hydration messages in the console are unrelated noise — they don't cause real reloads.)

## Fix (frontend only)

### A. Show the actually-assigned partner count for ACSL Agents

`src/app/agents/agents-profiles/AgentsProfilesContent.jsx`:

1. Stop using `getAgentOrganizations` (the by-state list) as the source of truth for the count column. Instead, read directly from the `agent_organization_assignments` table via the existing Supabase client so the number matches the rows that were actually inserted at create time.
   - Add a helper `fetchDirectPartnerCount(agentId)` that runs:
     `supabase.from("agent_organization_assignments").select("organization_id", { count: "exact", head: true }).eq("agent_id", agentId)`
   - Use the returned `count` to set `assigned_organizations_count`.
2. For `acsl_agent_manager`, keep the current behavior (state-derived count via the existing endpoint) since managers are scoped by state.
3. Keep `getAgentStates` for the States column — that one returns the explicit state assignments and is correct.
4. The "Partners Assigned" badge click still opens `openPartnersModal`, but switch its data source to the same direct assignment table (joined to `organizations` for name/branch/state) so the modal lists the exact 2 partners, not the 122 by-state list.

If the table name in the project differs (some installs use `acsl_agent_organizations` or `super_admin_agent_organizations`), we'll detect it once by trying the canonical name first and falling back to the alternate — and log the resolved name so it isn't re-detected per agent.

### B. Stop the re-render storm on the Agents Profile page

Same file:

1. Replace the per-agent `setAgents` calls inside `hydrateAgentCounts` with a single batched update:
   - Collect all `{id, updates}` pairs into a local `Map`.
   - After each batch of 8 settles, do **one** `setAgents(prev => prev.map(...))` using the map.
2. Add an `isMountedRef` (set false in the effect cleanup) and bail out of the hydrate loop if the component unmounted, so navigating away mid-hydration doesn't trigger React warnings or stale updates.
3. Memoize the row render: extract the table row into a small `AgentRow` component wrapped in `React.memo` so unrelated row updates don't re-render every row.

These three changes collectively eliminate the visible "reloading" effect without changing any data or UI.

## Out of scope

- Edge function / backend changes to `/super-admin-agents/*` — not needed; the data is already in the assignment table.
- Behavior for `partner`, `partner_agent`, `super_admin` rows.
- The Create New User cascading flow — it already writes the correct rows.
- The Grammarly hydration warning and the Vite HMR "ws lost" log — unrelated to this issue.

## Verification

After the change, on `/agents/profiles`:
- The newly created "ACSL Agent" user shows **2** in the Partners Assigned column.
- Clicking the badge opens a modal listing exactly those 2 partners.
- The page renders once, then updates counts smoothly without visible flicker.
