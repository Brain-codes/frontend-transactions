## Goal
Validate End User Phone in real time on the sales form — flag duplicates as the user types, not on blur or submit.

## Changes

**`src/app/admin/components/sales/CreateSalesForm.jsx`**

1. Remove the current `onBlur` duplicate check on the phone Input.
2. Add a debounced live check (≈300ms) that runs whenever `formData.phone` changes:
   - Normalize to digits-only; skip if fewer than 7 digits.
   - Query `sales` via Supabase: `ilike("phone", "%<last10digits>%")`, excluding the current sale id in edit mode.
   - Match strictly on digits-only equality.
   - If a clash is found, set `errors.phone` to: `"A customer with this phone number already exists (sale <transaction_id>)."`
   - If clear, clear `errors.phone`.
3. Race-guard with a ref/token so a stale response can't overwrite a newer result; cancel timer on unmount and when input changes.
4. Show a subtle inline status under the field while checking (e.g. "Checking…") and, when a duplicate is confirmed, the red error message (existing `FormField` error slot already renders it).
5. Block submit while a duplicate is flagged (guard in the existing submit validator using the same live-error state).

No server changes — the existing `create-sale` 409 duplicate check stays as the authoritative backstop.

## Technical notes
- Use `useEffect` keyed on `formData.phone` with `setTimeout` + cleanup for debounce.
- Use `getSupabase()` (already imported) for the query.
- Preserve edit-mode exclusion via `initialData?.id`.
