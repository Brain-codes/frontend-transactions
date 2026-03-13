# Installment Payment Models — Implementation Reference

> **Branch**: `feature/sales-model`
> **Date**: 2026-03-12
> **Status**: In progress — see "What's Done" and "What's Remaining" sections below.

---

## Overview

This feature adds **installment payment models** to the sales management system. Super admins create flexible payment plans (e.g., "Amina Model", "Session Model") and assign them to partner organizations. When creating a sale, if the partner has models assigned, the seller can choose an installment plan instead of full payment. Each installment sale tracks individual payments over time until fully paid.

**Key principle**: Nothing is hardcoded. Models, parameters, durations, and partner assignments are all managed dynamically by the super admin.

---

## Database Schema

### Migration File
- **Primary**: `supabase/migrations/20260310_payment_models.sql`
- **Copy**: `supabase_codes/tables/20260310_payment_models.sql`

### New Tables

#### `payment_models`
Stores payment plan definitions created by super admin.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `name` | TEXT NOT NULL | e.g., "Amina Model", "Session Model" |
| `description` | TEXT | Optional description |
| `duration_months` | INTEGER NOT NULL | Payment plan duration (e.g., 6, 12) |
| `fixed_price` | NUMERIC(12,2) NOT NULL | Fixed stove price under this model |
| `min_down_payment` | NUMERIC(12,2) DEFAULT 0 | Minimum initial payment required |
| `is_active` | BOOLEAN DEFAULT TRUE | Soft delete / deactivation |
| `created_by` | UUID FK→profiles | Who created it |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

#### `organization_payment_models` (junction table)
Many-to-many: which organizations have access to which models.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `organization_id` | UUID FK→organizations ON DELETE CASCADE | |
| `payment_model_id` | UUID FK→payment_models ON DELETE CASCADE | |
| `assigned_by` | UUID FK→profiles | Who assigned it |
| `assigned_at` | TIMESTAMPTZ | Auto |
| UNIQUE constraint on `(organization_id, payment_model_id)` | | |

#### `installment_payments`
Tracks individual payments for installment sales.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `sale_id` | UUID FK→sales ON DELETE CASCADE | |
| `amount` | NUMERIC(12,2) NOT NULL | Amount paid in this installment |
| `payment_method` | TEXT NOT NULL | "cash", "transfer", "pos" |
| `proof_image_url` | TEXT | URL/path to proof of payment |
| `proof_image_id` | UUID FK→uploads | Reference to uploads table |
| `notes` | TEXT | Optional notes |
| `recorded_by` | UUID FK→profiles | Who recorded this payment |
| `payment_date` | DATE DEFAULT CURRENT_DATE | |
| `created_at` | TIMESTAMPTZ | Auto |

### Altered Table: `sales`

New columns added:

| Column | Type | Description |
|--------|------|-------------|
| `is_installment` | BOOLEAN DEFAULT FALSE | TRUE if sale uses a payment model |
| `payment_model_id` | UUID FK→payment_models | Which model was selected (NULL for direct) |
| `total_paid` | NUMERIC(12,2) DEFAULT 0 | Running total of installment payments |
| `payment_status` | TEXT DEFAULT 'not_applicable' | One of: `not_applicable`, `partially_paid`, `fully_paid` |

### RLS Policies
- `payment_models`: super_admin full CRUD; other roles SELECT only (active models)
- `organization_payment_models`: super_admin full CRUD; admin/agent SELECT for their own org
- `installment_payments`: super_admin full access; org members SELECT/INSERT for their org's sales

---

## Edge Functions

All edge functions follow the folder pattern: `supabase/functions/<name>/index.ts` with `cors.ts` and `authenticate.ts` helpers. Each is also copied to `supabase_codes/edge_functions/<name>/`.

### New Edge Functions

#### 1. `payment-models` — CRUD for payment models
- **Location**: `supabase/functions/payment-models/`
- **Endpoints**:
  - `GET` — List all models. Super admin sees all; others see active only. Supports `?active=true` filter.
  - `GET` with `id` param — Get single model details
  - `POST` — Create model (super_admin only). Body: `{ name, description, duration_months, fixed_price, min_down_payment }`
  - `PATCH` — Update model (super_admin only). Body: partial fields
  - `DELETE` — Soft-delete (set `is_active=false`) or hard delete if no sales reference it

#### 2. `organization-payment-models` — Assign models to orgs
- **Location**: `supabase/functions/organization-payment-models/`
- **Endpoints**:
  - `GET` with `orgId` — Get models assigned to an organization
  - `POST` with `orgId` — Set models for org (full replace). Body: `{ payment_model_ids: string[] }`. Super_admin only.
  - `DELETE` with `orgId` and `modelId` — Remove single assignment

#### 3. `installment-payments` — Record & list payments
- **Location**: `supabase/functions/installment-payments/`
- **Endpoints**:
  - `GET` with `saleId` — List all payments for a sale (ordered by `payment_date`)
  - `POST` with `saleId` — Record a new payment. Body: `{ amount, payment_method, proof_image_id, notes, payment_date }`
  - **Validations**: sale must be installment, user must have org access, cannot overpay (`total_paid + amount <= sale.amount`)
  - **Side effects**: Updates `sales.total_paid` and `sales.payment_status` after insert

### Modified Edge Functions

#### 4. `create-sale` (modified)
- **File**: `supabase/functions/create-sale/index.ts`
- **Changes**:
  - Accepts new optional fields: `is_installment`, `payment_model_id`, `initial_payment_amount`, `initial_payment_method`
  - If `is_installment=true`: validates model exists, org has access to model, uses model's `fixed_price` as sale amount
  - Sets `payment_status` accordingly (`partially_paid` or `fully_paid`)
  - If `initial_payment_amount > 0`: inserts first record into `installment_payments`
  - If not installment: existing flow unchanged, `payment_status = 'not_applicable'`

#### 5. `get-sales-advanced` (modified)
- **File**: `supabase/functions/get-sales-advanced/build-query.ts`
- **Changes**:
  - Added to SELECT: `is_installment`, `payment_model_id`, `total_paid`, `payment_status`
  - Added LEFT JOIN to `payment_models` for model name: `payment_model:payment_models(id, name, duration_months, fixed_price)`
- **File**: `supabase/functions/get-sales-advanced/parse-filters.ts`
  - **NOT YET MODIFIED** — filter options for `is_installment`, `payment_status`, `payment_model_id` still need to be added

#### 6. `get-sale` (modified)
- **File**: `supabase/functions/get-sale/index.ts`
- **Changes**:
  - Added to SELECT: `is_installment`, `payment_model_id`, `total_paid`, `payment_status`
  - Added LEFT JOINs: `payment_model:payment_models(*)`, `installment_payments(*)`

---

## Frontend — Service Layer

### `src/app/services/paymentModelService.js`
Provides all API methods for the feature:

```
PaymentModelService:
  getPaymentModels(params)             → GET /payment-models
  getPaymentModel(id)                  → GET /payment-models/:id
  createPaymentModel(data)             → POST /payment-models
  updatePaymentModel(id, data)         → PATCH /payment-models/:id
  deletePaymentModel(id)               → DELETE /payment-models/:id
  getOrgPaymentModels(orgId)           → GET /organization-payment-models/:orgId
  setOrgPaymentModels(orgId, ids)      → POST /organization-payment-models/:orgId
  removeOrgPaymentModel(orgId, modelId)→ DELETE /organization-payment-models/:orgId/:modelId
  getInstallmentPayments(saleId)       → GET /installment-payments/:saleId
  recordInstallmentPayment(saleId, data)→ POST /installment-payments/:saleId
```

---

## Frontend — Pages & Components

### New Pages/Components

#### 1. Payment Models Management Page
- **File**: `src/app/payment-models/page.tsx`
- Super admin only (wrapped with `ProtectedRoute` + `DashboardLayout`)
- Table listing all payment models: Name, Fixed Price, Duration, Status, Created Date, Actions
- Create/Edit modals with: name, description, duration_months, fixed_price, min_down_payment
- Toggle active/inactive, delete with confirmation
- Uses `CreditCard` icon (not DollarSign), comma-formatted currency inputs

#### 2. Assign Payment Models Modal
- **File**: `src/app/partners/components/AssignPaymentModelsModal.jsx`
- Opens from the partners page per organization row
- Shows all active payment models as checkboxes
- Pre-checks currently assigned models
- Save calls `setOrgPaymentModels(orgId, selectedModelIds)`

#### 3. Record Payment Modal
- **File**: `src/app/admin/components/sales/RecordPaymentModal.tsx`
- Opens from the admin sale detail modal when sale is installment
- Fields: amount (validates ≤ remaining balance), payment method, payment date, proof image upload, notes
- After recording: refreshes payment list, updates progress

### Modified Pages/Components

#### 4. CreateSalesForm (modified)
- **File**: `src/app/admin/components/sales/CreateSalesForm.jsx`
- **Changes**:
  - Merged "Sale Information" + "Payment Type" cards into one card
  - Single `<Select>` dropdown for payment type: "Full Payment" or any available model
  - On model selection: auto-fills amount with `fixed_price` (read-only)
  - Shows payment plan summary (monthly calculation)
  - Initial payment amount input + payment method + proof image upload
  - All amount inputs use `type="text"` with `inputMode="numeric"` and comma formatting
  - Uses `CreditCard` icon everywhere (no DollarSign)

#### 5. Partners Page (modified)
- **File**: `src/app/partners/page.jsx`
- Added "Assign Payment Models" action button per partner row
- Opens `AssignPaymentModelsModal`
- Shows badge indicating number of assigned models

#### 6. Admin Sales Detail Modal (modified)
- **File**: `src/app/admin/components/sales/AdminSalesDetailModal.tsx`
- If `is_installment=true`: shows installment payments section with:
  - Progress bar (`total_paid / amount`)
  - Remaining amount display
  - Payment model info (name, duration)
  - Table of all installment payments: Date, Amount, Method, Proof, Recorded By
  - "Record Payment" button (opens RecordPaymentModal)
  - If `fully_paid`: shows "Payment Complete" state

#### 7. Super Admin Agent Sales Page (modified)
- **File**: `src/app/super-admin-agent/sales/page.tsx`
- Added payment status column/badge to the sales table
- `not_applicable` → gray "Full Payment"
- `partially_paid` → yellow/orange badge with progress (e.g., "₦25,000 / ₦80,000")
- `fully_paid` → green badge "Fully Paid"

#### 8. Sidebar (modified)
- **File**: `src/app/components/Sidebar.jsx`
- Added "Payment Models" link for super admin role
- Route: `/payment-models`
- Icon: `CreditCard` from lucide-react

#### 9. Types (modified)
- **File**: `src/types/adminSales.ts` — Added installment-related fields to AdminSale type
- **File**: `src/types/superAdminSales.ts` — Added installment-related fields to SuperAdminSale type

---

## Sales Listing Pages — Payment Status Column

### Modified:
- `src/app/super-admin-agent/sales/page.tsx` — **DONE** (has payment status badge/column)

### NOT YET Modified:
- `src/app/sales/page.jsx` (super admin sales) — **PENDING** (no installment columns yet)
- `src/app/admin/sales/page.tsx` (admin sales) — **PENDING** (no installment columns yet)

---

## Other Fixes Applied During Implementation

### 1. Google Places Dropdown Not Clickable
- **File**: `src/app/components/ui/google-places-input.jsx`
- **Fix**: Added `onMouseDown={(e) => e.preventDefault()}` on suggestion buttons to prevent input `onBlur` from firing before `onClick`

### 2. Sale Deletion — Foreign Key + Check Constraint
- **File**: `src/app/sales/page.jsx`
- **Problem**: `stove_ids.sale_id` FK references `sales.id` without cascade, plus CHECK constraint requires `sale_id IS NOT NULL` when `status='sold'`
- **Fix**: Before deleting a sale, first update linked stove to `status='available', sale_id=null`, then delete the sale
- Added proper confirmation modal with loading state (Dialog, not window.confirm)

### 3. Sales History Trigger — Signature Bloat
- **File**: `supabase_codes/sql_queries/Sales_History_Triggers.sql`
- **Problem**: `row_to_json(NEW)` captured entire row including massive base64 signature
- **Fix**: Changed to `row_to_json(NEW)::jsonb - 'signature'` on both INSERT and DELETE operations
- **SQL to run**: Replace the `create_sales_history()` function (provided separately)
- **Cleanup SQL**: Remove signature from existing records using `#-` operator

### 4. Amount Input — 999.99 Display Bug
- All amount inputs changed from `type="number"` to `type="text"` with `inputMode="numeric"`
- Added comma formatting helpers (`formatAmountInput` / `parseAmountInput`)
- Applied in: CreateSalesForm, Payment Models page

### 5. Icon Consistency
- Replaced all `DollarSign` icons with `CreditCard` across CreateSalesForm and Payment Models page

---

## What's Done ✓

| # | Item | Status |
|---|------|--------|
| 1 | Database migration SQL (all 3 tables + sales ALTER) | ✓ Written (needs to be run on Supabase) |
| 2 | `payment-models` CRUD edge function | ✓ |
| 3 | `organization-payment-models` edge function | ✓ |
| 4 | `installment-payments` edge function | ✓ |
| 5 | `create-sale` modified for installment support | ✓ |
| 6 | `get-sales-advanced/build-query.ts` updated with new fields + JOIN | ✓ |
| 7 | `get-sale` updated with new fields + JOINs | ✓ |
| 8 | All edge functions copied to `supabase_codes/edge_functions/` | ✓ |
| 9 | Service layer (`paymentModelService.js`) | ✓ |
| 10 | Payment Models management page (`/payment-models`) | ✓ |
| 11 | Partners page — Assign Payment Models modal | ✓ |
| 12 | CreateSalesForm — installment selection (single dropdown) | ✓ |
| 13 | Admin sales detail modal — installment section + Record Payment | ✓ |
| 14 | Record Payment Modal | ✓ |
| 15 | SAA sales page — payment status column | ✓ |
| 16 | Sidebar — Payment Models link | ✓ |
| 17 | Types updated (adminSales.ts, superAdminSales.ts) | ✓ |
| 18 | Sales history trigger fix (exclude signature) | ✓ Written (needs to be run on Supabase) |
| 19 | Sale deletion fix (stove constraint handling) | ✓ |
| 20 | Google Places dropdown fix | ✓ |
| 21 | Amount comma formatting + CreditCard icon | ✓ |

## What's Remaining ✗

| # | Item | Details |
|---|------|---------|
| 1 | **Run migration SQL on Supabase** | Run `20260310_payment_models.sql` in Supabase SQL Editor |
| 2 | **Run sales history trigger fix on Supabase** | Run the updated `CREATE OR REPLACE FUNCTION create_sales_history()` |
| 3 | **Deploy edge functions** | Deploy: `payment-models`, `organization-payment-models`, `installment-payments`, re-deploy `create-sale`, `get-sales-advanced`, `get-sale` |
| 4 | **`parse-filters.ts` update** | Add filter options for `is_installment`, `payment_status`, `payment_model_id` to `get-sales-advanced/parse-filters.ts` |
| 5 | **Super admin sales page** (`src/app/sales/page.jsx`) | Add payment status column/badge (same pattern as SAA page) |
| 6 | **Admin sales page** (`src/app/admin/sales/page.tsx`) | Add payment status column/badge |
| 7 | **End-to-end testing** | Test full flow: create model → assign to org → create installment sale → record payments → verify status transitions |
| 8 | **Optional: Filter UI** | Add payment status / installment filters to sales listing pages |

---

## File Index

### New Files
```
supabase/migrations/20260310_payment_models.sql
supabase/functions/payment-models/index.ts
supabase/functions/payment-models/cors.ts
supabase/functions/payment-models/authenticate.ts
supabase/functions/organization-payment-models/index.ts
supabase/functions/organization-payment-models/cors.ts
supabase/functions/organization-payment-models/authenticate.ts
supabase/functions/installment-payments/index.ts
supabase/functions/installment-payments/cors.ts
supabase/functions/installment-payments/authenticate.ts
supabase_codes/edge_functions/payment-models/ (mirror)
supabase_codes/edge_functions/organization-payment-models/ (mirror)
supabase_codes/edge_functions/installment-payments/ (mirror)
src/app/services/paymentModelService.js
src/app/payment-models/page.tsx
src/app/partners/components/AssignPaymentModelsModal.jsx
src/app/admin/components/sales/RecordPaymentModal.tsx
```

### Modified Files
```
supabase/functions/create-sale/index.ts
supabase/functions/get-sales-advanced/build-query.ts
supabase/functions/get-sale/index.ts
src/app/admin/components/sales/CreateSalesForm.jsx
src/app/admin/components/sales/AdminSalesDetailModal.tsx
src/app/admin/sales/page.tsx (types)
src/app/super-admin-agent/sales/page.tsx
src/app/partners/page.jsx
src/app/components/Sidebar.jsx
src/app/components/ui/google-places-input.jsx
src/app/sales/page.jsx (delete modal only, no installment columns yet)
src/types/adminSales.ts
src/types/superAdminSales.ts
supabase_codes/sql_queries/Sales_History_Triggers.sql
```

---

## Verification Checklist

1. Super admin creates "Amina Model" (6 months, ₦80,000 fixed) and "Session Model" (12 months, ₦120,000)
2. Super admin assigns "Amina Model" to Partner X on partners page
3. Admin for Partner X creates a sale → sees "Installment Payment" option → selects "Amina Model" → amount auto-fills ₦80,000 → enters initial payment ₦15,000
4. Sale created with `is_installment=true`, `payment_model_id=<amina>`, `total_paid=15000`, `payment_status='partially_paid'`
5. Sales listing shows yellow "Partially Paid (₦15,000/₦80,000)" badge
6. Sale detail shows payment history with ₦15,000 entry + "Record Payment" button
7. Admin records ₦65,000 payment → `total_paid=80,000` → status flips to `fully_paid` → green badge
8. Partner Y (no models assigned) → create sale → no installment option, standard full payment only
9. Cannot overpay: if ₦75,000 paid on ₦80,000 sale, max allowed is ₦5,000
