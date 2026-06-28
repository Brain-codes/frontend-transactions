# Fix: Failed to create Partner Agent

## Root cause

Network log shows the request goes to `undefined/functions/v1/manage-agents` → 404 (the HTML returned is the SPA fallback). The service reads `import.meta.env.VITE_SUPABASE_URL`, which is not defined in this environment. The rest of the app uses `supabaseFunctionsUrl` from `src/lib/supabaseConfig.ts`, which has hardcoded fallbacks and works.

A secondary issue: `manage-agents` creates the auth user but typically tags `profiles.role` as `agent` (its native role), not `partner_agent`. After creation we must explicitly set both `role = 'partner_agent'` and `organization_id = <selected partner>` so the new user appears correctly in the Agents Profiles view and is bound 1:1 to the partner.

## Changes

1. `src/app/services/adminAgentService.jsx`
   - Replace `const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL;` and `API_FUNCTIONS_URL` derivation with `import { supabaseFunctionsUrl } from "@/lib/supabaseConfig";` and use that everywhere `${API_FUNCTIONS_URL}` is referenced. This restores a valid URL and matches the rest of the codebase.

2. `src/app/settings/user-management/UserManagementContent.jsx` — `handleCreateUser`, partner_agent branch
   - After `adminAgentService.createAgent(...)` succeeds, update the new profile row in a single statement that sets BOTH `role: "partner_agent"` AND `organization_id: partnerId` (instead of only `organization_id`). Keep it best-effort with proper error surfacing if it fails (currently swallowed in `try{}catch{}` — convert to surface real errors via toast so future failures aren't silent).
   - Validate `partnerId` exists before the call (already enforced by `validateForm`, but add a defensive guard).

3. `src/app/settings/user-management/UserManagementContent.jsx` — `handleUpdateUser`, partner_agent branch
   - No URL change needed (uses `supabase` client directly). Confirm it already sets `role` and `organization_id`. Leave as-is.

## Verification

- Create a new Partner Agent from the form → toast shows success; user appears in Users list with role "Partner Agent" and the chosen partner.
- Open the new user in Edit → form re-hydrates with the same single partner selected.
- Agents Profiles view lists the new user under the correct partner.
- No more `undefined/functions/v1/...` requests in the network panel.
