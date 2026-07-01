## Goal
Allow super admins to cancel a purchase (ACSL → Partner transfer) from the Purchases from ACSL view, but only when no sale has been made against any stove ID in the transaction. Keep a history of cancelled purchases accessible from a new sidebar link.

## UX flow

1. **Cancel option in row menu (Purchases from ACSL)**
   - Add "Cancel Purchase" to the hamburger (⋮) dropdown on each transfer row, below "View Stove IDs".

2. **Pre-check for existing sales**
   - On click, query `sales` for any non-archived record whose `stove_serial_no` matches any stove ID in that transaction.
   - **If matches exist** → show a blocking modal:
     - Title: "Cannot cancel this purchase"
     - Message: "One or more stoves in this transaction have already been sold. Cancel the sale(s) first before removing this purchase."
     - Table listing each blocking sale: Stove ID · Sales Reference (transaction_id) · Sale Date · Partner. Close is the only action.

3. **Confirm cancellation modal (no blocking sales)**
   - Summary: partner name, transaction ID, transfer date, stove count.
   - Warning block explaining exactly what happens:
     - "All {N} stove IDs in this transaction will be permanently deleted from the system."
     - "The transfer record will be moved to Cancelled Purchases."
     - "Partner details (contact, branch, state) will not be affected."
     - "This action cannot be undone."
   - **Required field:** "Reason for cancellation" (textarea, min 5 chars).
   - Buttons: `Cancel` / `Confirm Cancellation` (destructive red, disabled until reason filled).

4. **On confirm**
   - Insert into new `cancelled_purchases` history table (snapshot of transfer + stove IDs + reason + who + when).
   - Delete the `stove_ids` rows for that transaction.
   - Delete (or archive with `is_archived=true`) the `stove_transfer_history` row so it disappears from Purchases from ACSL.
   - Toast success, refresh table.

5. **New sidebar link: "Cancelled Purchases"**
   - Under **Manage Sales**, right after "Cancelled Transactions".
   - Route: `/sales/cancelled-purchases` → new view listing history: Transaction ID · Partner · Original Transfer Date · Stove Count · Reason · Cancelled By · Cancelled At · [View Stove IDs] (from snapshot).

## Technical outline

**Database (migration)**
- New table `public.cancelled_purchases`:
  - `id uuid pk default gen_random_uuid()`
  - `original_transfer_id uuid`, `transaction_id text`, `partner_id uuid`, `partner_name text`, `state text`, `branch text`, `sales_factory text`, `sales_date date`, `transfer_date timestamptz`
  - `stove_count int`, `stove_ids_snapshot jsonb` (array of {stove_id, factory, sales_reference})
  - `cancellation_reason text not null`
  - `cancelled_by uuid references auth.users`, `cancelled_at timestamptz default now()`
- GRANTs: SELECT/INSERT to `authenticated`, ALL to `service_role`.
- RLS: enable; policies via `has_role(auth.uid(),'super_admin')` for SELECT and INSERT.

**Server function** `src/lib/cancelPurchase.functions.ts` (uses `requireSupabaseAuth` + super_admin check):
- `checkPurchaseCancellable({ transferId })` → returns `{ blockingSales: [{stove_id, sales_reference, sales_date, partner_name}] }`.
- `cancelPurchase({ transferId, reason })` → re-checks blocking sales; if clear, snapshots + inserts into `cancelled_purchases`, deletes `stove_ids` rows, archives/deletes the transfer row. Wrapped so partial failures don't leave orphans (use RPC or sequential with error surfaced).
- `listCancelledPurchases({ search, limit, offset })`.

**Frontend files**
- `StoveTransferHistoryContent.tsx`: add menu item + wire two new modals (`BlockingSalesModal`, `ConfirmCancelPurchaseModal`).
- New `src/app/sales/cancelled-purchases/CancelledPurchasesContent.tsx` + `page.tsx` + `src/routes/sales/cancelled-purchases/index.tsx` (mirrors existing Cancelled Transactions view styling).
- `src/app/components/Sidebar.jsx`: add "Cancelled Purchases" link under Manage Sales.

## Out of scope
- No changes to partner records or user records.
- No undo/restore flow for cancelled purchases (history is read-only).
