## Fix next installment due date calculation

**Bug:** In `supabase/functions/get-sales-advanced/fetch-related.ts` (`fetchInstallmentSummaries`), next due date is computed as:

```ts
baseDate.setMonth(baseDate.getMonth() + paidInstallments + 1);
```

For sale `5ELKDF` (sales_date July, 2 payments made), this yields October instead of September.

**Correct logic:** The 1st installment covers the sales month itself. So:
- paid = 1 → next due = sales_month + 1 (August)
- paid = 2 → next due = sales_month + 2 (September)

Change offset from `paidInstallments + 1` to `paidInstallments`.

**File:**
- `supabase/functions/get-sales-advanced/fetch-related.ts` — one-line change inside `fetchInstallmentSummaries`.

**Deploy:** `supabase functions deploy get-sales-advanced --no-verify-jwt`
