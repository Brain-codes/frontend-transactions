## Problem

The sales form errors out with **"This organization does not have access to the selected payment model"** when submitting an installment sale. The `create-sale` Supabase edge function still gates payment models by the `organization_payment_models` join, even though payment models were decoupled from partners (see `supabase/payment-model-decoupling.md`). Any active model should now be usable by any partner.

## Fix

Edit `supabase/functions/create-sale/index.ts` (lines ~161–171) — remove the org↔model access check block. Keep the rest of the installment validation intact:

- still fetch the payment model by `paymentModelId`
- still reject if not found or `is_active === false`
- still use `fixed_price` as the sale amount and validate `min_down_payment`

No schema change, no client change, no other edge functions touched. `organization_payment_models` stays in the DB (non-destructive) but is no longer enforced at point of sale.

## Verification

Redeploy the `create-sale` edge function, then record an installment sale on the form using a partner that has no rows in `organization_payment_models` for the chosen model — it should succeed instead of returning the 403.
