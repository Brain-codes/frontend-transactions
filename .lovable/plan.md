## Goal
Make the Payment Models view fully functional without depending on undeployed Supabase Edge Functions. The `payment_models` and `organization_payment_models` tables already exist in your Supabase project (per `SUPABASE_TABLE_OVERVIEW.md`), so no schema changes are required — only client code.

## What's wrong today
`paymentModelService.js` calls edge functions at `/functions/v1/payment-models` and `/functions/v1/organization-payment-models`. Those functions are not deployed on your external Supabase, so every call returns **HTTP 404**. The Create / Edit / Delete / Assign modals all fail.

## Fix — rewrite the service to use the Supabase client directly
Replace the edge-function HTTP layer with direct Supabase queries (RLS already restricts writes to super_admin). All UI files (`PaymentModelsContent.tsx`, `AssignPaymentModelsModal.jsx`, `CreateSalesForm.jsx`) keep their existing function signatures — no UI changes needed.

### `src/app/services/paymentModelService.js` — rewrite

- `getPaymentModels({ show_all, status, search })`
  - Query `payment_models` with `creator:profiles!created_by(id, full_name, email)`
  - Apply `is_active` filter (non-super-admins forced to active; super-admin honors `status` filter)
  - Apply `ilike('name', %search%)` if search provided
  - Compute `top_model` from `sales` grouped by `payment_model_id` (single query, count client-side)
  - Return `{ success, data, total, top_model }`

- `getPaymentModel(id)` — single row + count of rows in `organization_payment_models` for that model

- `createPaymentModel({ name, description, duration_months, fixed_price, min_down_payment })`
  - Validate client-side (name required, duration ≥ 1, price > 0, min_down ≤ price)
  - Insert with `created_by = auth.uid()`

- `updatePaymentModel(id, patch)` — patch allowed fields including `is_active`

- `deletePaymentModel(id)`
  - Count `sales` referencing the model
  - If > 0 → soft delete (set `is_active = false`)
  - Else → delete `organization_payment_models` rows then delete the model

- `getOrgPaymentModels(orgId)` — query `organization_payment_models` with `payment_model:payment_models(*)`

- `setOrgPaymentModels(orgId, ids)`
  - Fetch current assignments
  - Delete rows whose `payment_model_id` is no longer in `ids`
  - Insert new rows for added ids with `assigned_by = auth.uid()`

- `removeOrgPaymentModel(orgId, modelId)` — delete the matching row

- `getInstallmentPayments(saleId)` / `recordInstallmentPayment(saleId, data)` — direct queries on `installment_payments`

Each method returns the same shape the UI already expects (`{ success: true, data, ... }`) so no caller has to change.

## Files touched
- `src/app/services/paymentModelService.js` — full rewrite (single file)

## Out of scope
- No schema/migration changes (tables already exist)
- No UI changes to `PaymentModelsContent.tsx` or modals
- Edge functions in `supabase/functions/payment-models/` and `organization-payment-models/` stay in the repo but are no longer called
