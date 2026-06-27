## Goal

Make **Agents Profile** and **Agents Performance Report** show the exact same agent list by sourcing both from the same endpoint (`manage-users`) with the same role scope (all users regardless of role).

Today they disagree because:
- Performance Report → `manage-users` (all users, paginated)
- Agents Profile → `super-admin-agents` (only ACSL agent roles)

## Changes

### 1. Agents Profile (`src/app/agents/agents-profiles/AgentsProfilesContent.jsx`)
- Replace the `superAdminAgentService.getSuperAdminAgents()` call in `loadAgents` with a fetch to `${supabaseFunctionsUrl}/manage-users?limit=5000&sortBy=created_at&sortOrder=desc` (same source as the Performance Report).
- Map the response so existing fields (`id`, `full_name`, `email`, `role`, `assigned_organizations_count`, `assigned_states_count`, `created_at`, `status`) keep working.
- Keep all existing UI: role filter, badges, States Assigned / Partners Assigned modals, "Assign a Partner" button, search.
- Add the same response-safety guard used on the Performance Report (check content-type before `res.json()`) so an HTML error page never breaks the view.

### 2. Agents Performance Report (`src/app/agents/components/SuperAdminAgentsContent.tsx`)
- No data-source change (already on `manage-users`). Just confirm it uses `supabaseFunctionsUrl` from `@/lib/supabaseConfig` (done in the last fix).

### 3. No other changes
- Both menu links stay in the sidebar.
- No edits to edge functions, routing, or permissions.

## Result

Both views read from the same endpoint with the same scope, so the agent counts and roster will match. Each page keeps its own layout and features (KPIs/pagination on Performance Report; role-grouped profile cards/modals on Agents Profile).
