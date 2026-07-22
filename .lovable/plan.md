## Goal

Show who last modified each sale (and when) directly in the Sales Records table at `/sales`, so modifications are traceable at a glance.

## Current state (verified)

- `sales.updated_at` / `sales.updated_by` columns already exist (`supabase/sql/add_sales_update_tracking.sql`).
- `update-sale` edge function already writes both fields on every edit (`updated_at: now`, `updated_by: userId`).
- The `get-sales-advanced` edge function already joins the modifier profile as `updated_by_profile` (`supabase/functions/get-sales-advanced/fetch-related.ts`, `fetchModifiers`).
- `src/app/sales/components/SalesTable.tsx` currently renders: Transaction ID, Sales Date, End User, Phone, State, Stove ID, Payment Model, Expected/Paid/Balance, Actions — no modifier column.
- `SuperAdminSale` type does not yet declare `updated_at`, `updated_by`, or `updated_by_profile`.

## Changes

1. `src/types/superAdminSales.ts` — add `updated_at?`, `updated_by?`, and `updated_by_profile?: UserProfile | null` to `SuperAdminSale`.
2. `src/app/sales/components/SalesTable.tsx`
   - Add a "Last Modified By" column between Balance and Actions.
   - Cell shows two lines:
     - Name: `updated_by_profile.full_name` → email → creator name → "N/A"
     - Date (smaller, gray): `updated_at` if present, else `created_at` (so unedited rows show original capture date), formatted with the existing `formatDate` prop.
   - Bump the empty-state `colSpan` from 12 → 13.

## Out of scope

- No schema, RLS, or edge-function changes — audit fields and the join already exist.
- Row-level modification history (per-field diff log) is not part of this change; only the latest modifier is shown.
