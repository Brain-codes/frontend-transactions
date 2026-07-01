## Goal
Wipe all sales records and reset every stove ID back to "available" so the system starts fresh for sales.

## Steps

1. **Delete all sales data** (via insert/SQL tool in build mode):
   - `DELETE FROM sales;`
   - Also clear any dependent rows: sale payments/installments, sale attachments (photos/PDFs), and any purchase/cancellation records tied to sales. I'll confirm exact table names by inspecting the schema before running.

2. **Reset stove inventory** so every stove ID is available again:
   - `UPDATE stove_ids SET status = 'available', sold_at = NULL, sold_by = NULL, sale_id = NULL, end_user_id = NULL, ...` (nulling only the sale-related columns that exist on the table).

3. **Clear end-user records created by sales** — only if you want them gone too (see question below).

4. **Verify** counts after: `SELECT count(*) FROM sales` = 0, and `SELECT status, count(*) FROM stove_ids GROUP BY status` shows all rows as `available`.

No frontend/code changes — this is data-only.

## Please confirm before I run

- **Scope**: delete ALL sales for ALL partners/agents (full wipe), correct?
- **End-user records** (Stove Users Data): delete those too, or keep them?
- **Payments/installments** tied to sales: delete along with sales (recommended for consistency)?
- **Assignments** (agent → stove assignments): keep intact, or also reset?

Once you confirm, I'll switch to build mode and run the SQL through the insert tool.
