## Problem

`Agents Performance Report` (`SuperAdminAgentsContent.tsx`) defaults `selectedRoles = ["acsl_agent"]` and sends `role=acsl_agent` to `manage-users`, so only ACSL agents (12) appear. `Agents Profile` sends no role filter, so all 22 users show.

## Fix

Edit `src/app/agents/components/SuperAdminAgentsContent.tsx`:

1. Change default `selectedRoles` from `["acsl_agent"]` to `[]` (treated as "all").
2. Update `fetchAgents` to omit the `role` query param when `selectedRoles` is empty (i.e. show all roles by default). Keep the dropdown working so the user can still narrow if they want.
3. Bump default `pageSize` from 25 so the full roster is visible (match Profile view's behavior — use 100 or a large value), since the user wants parity with the 22-row Profile view.
4. Ensure the role dropdown UI reflects "All roles" when none selected.

Result: Performance Report shows all 22 users by default, matching Agents Profile. Users keep optional filters.

No backend/edge-function changes; no other views touched.