## Diagnosis (unconfirmed until redeploy check)

The Modified By cell renders `updated_by_profile?.full_name || creator?.full_name || "—"`. The "line" you see is the em‑dash `—`, i.e. both objects arrive as `null` on the sale rows.

Both fields are attached in `supabase/functions/get-sales-advanced/fetch-related.ts` (`fetchCreators`, `fetchModifiers`), and the edge function runs with the service role so RLS is not the blocker. That means one of these is true on your Supabase project:

1. The `get-sales-advanced` edge function has not been redeployed since `fetchModifiers` / the `creator` attachment was added, so the deployed version returns rows without those fields.
2. `sales.created_by` values don't correspond to rows in `profiles` (an older issue documented in `get-sales-advanced/DEPLOYMENT-GUIDE.md`), so `creator` resolves to `null` for existing sales and `updated_by` is still `null` for anything you haven't edited yet.

I need to verify which one is happening before writing code, and the safest fix is a small UI-side fallback plus a redeploy.

## Plan

1. **Verify what the API is returning**
   - Open the browser Network tab on `/sales`, inspect the POST to `get-sales-advanced`, and confirm whether each sale object contains `creator` / `updated_by_profile` keys. That confirms (1) vs (2).

2. **Redeploy the edge function (if fields are missing in the response)**
   ```bash
   supabase functions deploy get-sales-advanced --no-verify-jwt
   ```
   No code changes needed here — the current source already fetches both.

3. **UI fallback in `FinancialReportsTable.tsx`** so the column is never just `—` when we have any identifying info:
   - Order of preference for the name line:
     1. `updated_by_profile.full_name`
     2. `creator.full_name`
     3. `updated_by_profile.email` (before falling back to email of creator)
     4. `creator.email`
     5. `sale.partner_name` (last resort — shows who owns the record)
     6. `—`
   - Keep the second line (date) as `updated_at || created_at`.

4. **Backfill only if needed** (only if step 1 shows `creator` is present in the payload but its `full_name` is `null` because the profile row is missing):
   - Provide a one-off SQL snippet to insert placeholder profiles for orphaned `sales.created_by` UUIDs, mirroring the guidance in `get-sales-advanced/DEPLOYMENT-GUIDE.md`. This is optional and only run if the network payload proves broken FKs.

No changes to business logic — this stays a display / deployment fix.

## Files touched

- `src/app/admin/components/financial-reports/FinancialReportsTable.tsx` — extend the "Modified By" fallback chain.
- (Deploy only) `supabase/functions/get-sales-advanced/*` — no source change, just `supabase functions deploy`.
- (Optional SQL) a snippet you'd run manually if orphaned `created_by` IDs are the cause.
