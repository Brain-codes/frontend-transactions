## Goal

Every sale must be tied to a unique end-user phone. Reject a new sale when its end-user phone (digits-only) already appears on an existing active sale. Cancelled sales (moved to `cancelled_purchases`) free the phone automatically since they no longer live in `sales`.

## Where the check runs

**Server (authoritative)** — `supabase/functions/create-sale/index.ts`, right after the existing required-field checks (around line 167, before amount validation):

1. Normalize `phone` to digits-only: `const phoneDigits = String(phone).replace(/\D+/g, "")`.
2. Guard: if `phoneDigits.length < 7` return `jsonError("End user phone number is invalid", 400)`.
3. Query existing sales with the same digits:
   ```ts
   const { data: dupes } = await supabase
     .from("sales")
     .select("id, transaction_id, phone")
     .ilike("phone", `%${phoneDigits.slice(-10)}%`) // cheap prefilter
     .limit(50);
   const clash = (dupes ?? []).find(
     (r) => String(r.phone ?? "").replace(/\D+/g, "") === phoneDigits
   );
   if (clash) {
     return jsonError(
       `This end user phone is already used on sale ${clash.transaction_id}. Each sale must have a unique end user phone.`,
       409
     );
   }
   ```
   In edit mode (`mode === "edit"` / existing `saleId` in payload) exclude the current sale id from the clash check.

Rationale: `sales.phone` is stored as text without normalization; the digits-only comparison in JS covers `0801…` vs `+234 801 …` variants without a schema migration. `cancelled_purchases` isn't queried, so cancelled sales free the phone.

**Client (fast feedback)** — `src/app/admin/components/sales/CreateSalesForm.jsx`:

1. On blur of the End User Phone input, call a lightweight check against `sales` via the existing supabase client using the same digits-only compare, and surface `errors.phone = "This phone is already used on another sale"` (excluding the current sale in edit mode).
2. Keep the check debounced/best-effort — the server remains the source of truth.

No changes to `salesFormValidation.js` beyond wiring the async duplicate message into `errors.phone` state; the required check there stays.

## Optional hardening (recommended, not required)

Add a partial unique index so races can't slip two concurrent inserts through:

```sql
-- migration
CREATE UNIQUE INDEX IF NOT EXISTS sales_phone_digits_unique
  ON public.sales ((regexp_replace(phone, '\D', '', 'g')));
```

If any existing rows already share a phone, the migration will fail; we'd need to inspect and clean those first. Confirm before I add this — I can either (a) run a pre-check query and list the offenders for you to resolve, or (b) skip the DB constraint and rely on the edge-function check only.

## Files touched

- `supabase/functions/create-sale/index.ts` — add duplicate-phone guard.
- `src/app/admin/components/sales/CreateSalesForm.jsx` — onBlur duplicate check + inline error surfacing.
- (Optional) new SQL migration for the unique index.

## Out of scope

- Retroactive dedupe of existing sales rows.
- Changing contact phone / alternative phone rules (only end-user `phone` is constrained).