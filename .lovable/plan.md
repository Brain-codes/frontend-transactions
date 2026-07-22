## Problem

The Sales Record view at `/sales` renders `FinancialReportsTable.tsx`, not `SalesTable.tsx`. The "Last Modified By" column was previously added to `SalesTable.tsx`, which is why it's not visible on this screen.

## Fix

Add the "Last Modified By" column to `src/app/admin/components/financial-reports/FinancialReportsTable.tsx`.

1. Header: insert a new `<TableHead>` "Last Modified By" between the Balance column and the actions column.
2. Body: insert a matching `<TableCell>` rendering two lines:
   - Line 1: `sale.updated_by_profile?.full_name || sale.updated_by_profile?.email || sale.created_by_profile?.full_name || sale.created_by_profile?.email || "—"`
   - Line 2 (muted, smaller): formatted `sale.updated_at || sale.created_at`
3. Ensure the sales data feeding this table already includes `updated_at`, `updated_by`, and the joined `updated_by_profile` (populated earlier in `get-sales-advanced`); no service changes expected — will verify while editing.

No changes to filters, pagination, or actions.
