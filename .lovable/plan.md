## Problem

Network calls go to `undefined/functions/v1/manage-users` (and same for `get-organizations-grouped`, `get-super-admin-dashboard`). The server returns the SPA `index.html` 404 page, which the client tries to `JSON.parse`, producing:

> Unexpected token '<', "<!DOCTYPE "... is not valid JSON

Root cause: these files build URLs from `import.meta.env.VITE_SUPABASE_URL` directly. When the env var isn't injected at build time (e.g. `.env.local` missing after a sandbox rebuild), it resolves to `undefined`. The working calls (e.g. `manage-profile`) use the shared `src/lib/supabaseConfig.ts`, which already has a hardcoded fallback URL — so they keep working.

## Fix

Switch the broken callers to use the shared `supabaseFunctionsUrl` helper (which falls back to the hardcoded project URL when the env var is missing).

### Files to update

1. `src/app/settings/user-management/UserManagementContent.jsx` — all 5 `fetch` calls (lines 200, 343, 380, 404, 425): replace `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` with `${supabaseFunctionsUrl}` and add the import from `@/lib/supabaseConfig`.
2. `src/app/services/superAdminDashboardService.js` — same replacement for the `get-super-admin-dashboard` call.
3. `src/app/dashboard/components/UnifiedDashboardContent.tsx` — same replacement for the `get-organizations-grouped` call.
4. `src/app/stove-management/components/StoveManagementContent.jsx` — same replacement (audit-found, same pattern, would break identically when env is missing).
5. `src/app/components/OrganizationSidebar.jsx` — same replacement.

No backend / schema changes. No UI changes beyond fixing the data fetch.

## Verification

After the edit, reload the User Management page: the request should hit `https://oeiwnpngbnkhcismhpgs.supabase.co/functions/v1/manage-users?...` (200 JSON), the table renders, and the dashboard's "Failed to fetch grouped partners" / "HTTP 404" errors disappear from the console.
