# End User Records — Edit action + Last Modified tracking

## 1. Database (migration)
Add audit columns to `sales`:
- `updated_at timestamptz`
- `updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL`

Backfill `updated_at = created_at` for existing rows so the new column shows a sensible date immediately.

## 2. Edge function — `update-sale`
Create a new function `supabase/functions/update-sale/index.ts` (the client service in `adminSalesService.jsx` already references this URL but the function isn't deployed).

Behavior:
- Authenticate caller via bearer token, load profile.
- Authorize by role: allow `super_admin`, `acsl_agent_manager`, and `partner` (partner scoped to `organization_id = caller.organization_id`). Others → 403.
- Accept editable end-user fields only:
  `end_user_name, aka, phone, other_phone, contact_person, contact_phone, state_backup, lga_backup, address (street/city + address_id row update)`.
- Re-run existing Nigerian phone validation + duplicate-phone check (digits-only normalization, ignoring the current sale's `id`).
- Update the `sales` row and set `updated_at = now()`, `updated_by = caller.id`.
- Return the refreshed sale.

## 3. Frontend — `EndUserRecordsContent.jsx`
- Gate a new "Edit" button per row using `usePermissions` — visible when role is `super_admin`, `acsl_agent_manager`, or `partner`.
- Add a new column **Last Modified By** rendering `updated_by_name` + formatted `updated_at` (falls back to "—" when never edited). Insert it before the Actions column, and add it to the CSV export.
- The `Details` button stays; the new `Edit` button opens a new modal.

## 4. New modal — `EditEndUserModal.jsx`
- Inputs for all end-user fields listed in §2, prefilled from the sale.
- Reuses `isValidNgPhone` + `NG_PHONE_FORMAT_MESSAGE` for `phone` and `contact_phone` (live format check).
- Debounced duplicate lookup on `phone` (excluding current sale id), same UX as `CreateSalesForm`.
- Save → calls `adminSalesService.updateSale(id, payload)` → on success, refreshes the row in local state and closes.

## 5. Read path — `get-sales-advanced`
Extend the sales select and response mapping to include `updated_at` and a joined `updated_by_profile(full_name)` so the new column renders without an extra fetch. (Format2 response used by End User Records.)

## Technical notes
- RLS on `sales`: keep existing policies; writes go through the edge function using service role after role check, matching the pattern used by `create-sale` / `delete-sale`.
- Partner scoping: enforced in the edge function by comparing `sales.organization_id` to caller's `organization_id`.
- No changes to sidebar/permissions map required; the row-level gate uses the existing role from `useAuth`.
