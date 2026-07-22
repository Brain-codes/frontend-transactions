## Goal
Replace the plain text in the **Payment** column of the sales record table with a clear, card-style summary that shows:
- Sales / payment model name
- Total number of installments
- Installments paid and installments remaining
- Next due date

This matches the sample image attached by the user.

## Current state
- The sales record table (`FinancialReportsTable.tsx`) currently renders the Payment column as plain text: either `Full Payment` or the payment model name for installment sales.
- The `get-sales-advanced` edge function returns sales rows with a joined `payment_model` object (`name`, `duration_months`, `fixed_price`) but does **not** return the count of recorded installment payments or a calculated next-due date.
- Installment payments are stored in `public.installment_payments` and linked by `sale_id`.
- The project uses its own Supabase project, so edge-function changes must be deployed by the user after they are written.

## Proposed implementation

### 1. Backend: enrich sales data with installment summary
In `supabase/functions/get-sales-advanced/fetch-related.ts`, add a new `fetchInstallmentSummaries(supabase, sales)` helper that:
- Collects all `sale.id` values for rows where `is_installment` is true.
- Runs a single batched query against `installment_payments` to get the count of payments per `sale_id`.
- Attaches a computed `installment_summary` object to each sale:
  - `total_installments` — from `payment_model.duration_months`
  - `paid_installments` — count of payment records
  - `left_installments` — `total - paid`
  - `next_due_date` — `sales_date` plus `(paid_installments + 1)` months, or `null` when fully paid
  - `installment_amount` — optional, `fixed_price / duration_months`

This follows the existing batching pattern already used for organizations, addresses, creators, and modifiers.

### 2. TypeScript types
Update `src/types/adminSales.ts` to include the new optional field:
```ts
installment_summary?: {
  total_installments: number;
  paid_installments: number;
  left_installments: number;
  next_due_date: string | null;
  installment_amount?: number;
};
```

### 3. UI: render the Payment column as a compact card
Update `src/app/admin/components/financial-reports/FinancialReportsTable.tsx` so the **Payment** column cell renders:
- **Full payment sales**: a small green badge or text reading `Full Payment`.
- **Installment sales**: a compact stacked block styled like the sample:
  - First line: payment model name (e.g. `Direct Community Engagement Sales Model`)
  - Second line: `{total} installments`
  - Third line: `{paid} paid · {left} left`
  - Fourth line: `Next due: {date}` in the project's accent color (current green `#4a5d0f`)

If the summary is missing or the payment model has no duration, fall back gracefully to the current text display.

### 4. Edge case handling
- Sales with `is_installment = false` → show `Full Payment`.
- Installment sales with no payments yet → `0 paid · N left`, next due = `sales_date + 1 month`.
- Fully paid installment sales → show `Completed` / `Paid in full` instead of a next due date.
- Missing `sales_date` → use `created_at` for the due-date calculation.

## Files to change
- `supabase/functions/get-sales-advanced/fetch-related.ts` — add batched installment summary fetcher
- `src/types/adminSales.ts` — add `installment_summary` type
- `src/app/admin/components/financial-reports/FinancialReportsTable.tsx` — update Payment column rendering

## Out-of-scope (unless requested)
- CSV/Excel export changes
- Changes to the Payment History modal
- Adding new database columns or triggers

## Deployment note
Because this project connects to the user's own Supabase project, the updated `get-sales-advanced` edge function will need to be redeployed after the code changes:
```bash
supabase functions deploy get-sales-advanced --no-verify-jwt
```
