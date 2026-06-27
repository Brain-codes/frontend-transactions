## Problem

`CreateSalesForm` (used by `/sales/create`) decides how to source the organization based on `userRole`:

- **SAA roles** (`super_admin`, `acsl_agent`, `acsl_agent_manager`, `super_admin_agent`): show a partner picker, store the chosen org in `sessionStorage` (`saa_selected_org_id`).
- **All other roles** (partner, partner_agent, anything new): read `organization_id` from the cached profile via `profileService.getOrganizationId()`.

When that profile lookup returns nothing (stale cache, profile not yet fetched, user without an org assigned, or any role not in the SAA list), the form aborts with **"Organization ID not found. Please log in again."** That's the error currently blocking some users.

The user wants one single sales form that works for every role, with no role-based dead ends.

## Fix

Make the form universally functional by removing the hard role gate and falling back to the partner picker whenever an org isn't already known.

### Changes to `src/app/admin/components/sales/CreateSalesForm.jsx`

1. Replace the static `isSuperAdmin` flag with a dynamic `needsPartnerSelection` state:
   - `true` whenever `profileService.getOrganizationId()` returns nothing AND no `saa_selected_org_id` is in sessionStorage.
   - This covers SAA roles (no personal org) and any other user whose profile org is missing.
2. Before computing it, await `profileService.fetchAndStoreProfile()` once on mount so a fresh login or cache miss is resolved before we decide.
3. Drive partner search visibility, stove fetching, and the "Organization ID not found" guard off `needsPartnerSelection` instead of `isSuperAdmin`. Users with a valid profile org keep the current auto-flow; users without one (regardless of role) get the partner picker.
4. Remove the `setError("Organization ID not found. Please log in again.")` line entirely — once the picker is the fallback, that dead end no longer exists. Show a small inline hint ("Select a partner to load available stoves") instead.
5. Keep `userRole`/`userId` only to choose the partner data source:
   - `super_admin` → `manage-organizations` (all partners).
   - SAA agent roles → `superAdminAgentService.getAgentOrganizations(userId)` (their assigned partners).
   - Any other role that ends up needing the picker → same `manage-organizations` listing, filtered by what RLS allows them to see. No new permission rules.
6. On submit, source `organizationId` from (in order): selected partner → `saa_selected_org_id` → `profileService.getOrganizationId()`. Same precedence everywhere — no role branching.

### Out of scope

- No changes to routing, permissions, RLS, or the create-sale API.
- No visual redesign of the form; only the gating logic and the partner-picker visibility change.

## Verification

- Log in as a partner with a valid org → form loads stoves automatically (unchanged).
- Log in as `super_admin` → partner picker appears, then stoves load (unchanged).
- Log in as any user whose profile is missing `organization_id` → partner picker now appears instead of the blocking error.
- Confirm no console errors and the create flow completes for each case.
