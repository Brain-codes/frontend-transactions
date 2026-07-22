## Goal

Add a **Delete** action on each row of the End User Records view. Deleting a record removes it from Sales Records / End User Records and archives it under **Cancelled Transactions** with a reason — reusing the existing cancel-sale flow.

## Access

- Visible and enabled only for `super_admin` and `partner` (resolved via `resolveRole(userRole)`).
- Hidden for every other role.

## UX

- New **Delete** button (red, trash icon) in the Actions column of `EndUserRecordsContent.jsx`, next to the existing Edit button.
- Clicking Delete opens the existing `CancelSaleModal` (already includes a warning prompt and a "Reason for cancelling" textarea). We will:
  - Change its title to "Delete End User Record" and the confirm button to "Confirm Delete" when opened from this view (via a prop), keeping the same warning + reason field.
  - Make the reason **required** for this entry point (label switches from optional to required, submit disabled until non-empty), since the user asked for a reason to be provided.
- On confirm: call the existing cancel flow, then refresh the list. Toast on success/failure.

## Backend behavior (reused, no schema change)

- Reuse `adminSalesService.cancelSale(id, reason)` — the same call used by Sales Records' Cancel action.
- This flow already:
  - Sets `cancelled_at` and `cancel_reason` on the sale so it appears under **Cancelled Transactions**.
  - Removes the sale from Sales Records / End User Records queries (they filter out cancelled rows via `get-sales-advanced`, and Cancelled Transactions reads rows where `cancelled_at is not null`).
  - Releases the stove ID back to available.
- No new edge function or migration required.

## Files to change

- `src/app/end-user-records/EndUserRecordsContent.jsx`
  - Add `canDelete = ['super_admin','partner'].includes(resolveRole(userRole))`.
  - Add Delete button in Actions column (guarded by `canDelete`).
  - Add state `deleteTarget`, render `CancelSaleModal` with `requireReason` and custom labels; on confirm call `adminSalesService.cancelSale` and refetch.
- `src/app/admin/components/sales/CancelSaleModal.tsx`
  - Add optional props: `title`, `confirmLabel`, `requireReason` (default preserves current behavior).
  - When `requireReason` is true: label shows "(required)", Confirm button disabled until reason is non-empty.

## Out of scope

- No changes to Cancelled Transactions view (it already shows `cancel_reason` and `cancelled_at`).
- No changes to `delete-sale` edge function (we use cancel, not hard delete, so records remain auditable under Cancelled Transactions as requested).
