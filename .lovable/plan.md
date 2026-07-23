
## Goal

Expose an authenticated HTTP API that returns all End User Records with the full detail-modal data, and add an "API Call" button on the End User Records view (visible to super admins) that opens a full-page API documentation view with a "Back to End User Records" button.

## 1. API endpoint (Supabase Edge Function)

New function: `supabase/functions/end-user-records-api/index.ts`.

- **URL:** `${SUPABASE_URL}/functions/v1/end-user-records-api`
- **Methods:** `GET` (query params) and `POST` (JSON body); `OPTIONS` for CORS.
- **Authentication:** static bearer API key for external integrations.
  - Client sends `Authorization: Bearer <API_KEY>` and `apikey: <SUPABASE_ANON_KEY>`.
  - Function validates the bearer against secret `END_USER_RECORDS_API_KEY` using a timing-safe comparison.
  - Missing/invalid → `401 { success: false, error: "Unauthorized" }`.
  - Uses the service-role client for DB reads (bypasses RLS because the caller is authenticated by the API key, not a Supabase user).
- **Query/body parameters:**
  - `page` (default 1), `limit` (default 100, max 500)
  - `dateFrom`, `dateTo` (ISO date, filters on `sales_date`)
  - `state`, `lga`, `partner_id`, `search`
  - `include_cancelled` (default false)
- **Response shape:**
  ```json
  {
    "success": true,
    "pagination": { "page": 1, "limit": 100, "total": 1234, "totalPages": 13 },
    "data": [ /* full sale objects — see fields below */ ]
  }
  ```
- **Fields returned per record** (mirrors `AdminSalesDetailModal`):
  `id`, `transaction_id`, `sales_reference`, `sales_date`, `created_at`, `updated_at`,
  `end_user_name`, `contact_person`, `phone`, `contact_phone`, `email`,
  `state_backup`, `lga_backup`, `address`, `gps_coordinates`,
  `stove_serial_no`, `stove_factory`,
  `organization: { id, name, partner_name }`, `partner_name`,
  `sales_agent: { id, full_name, email }`,
  `sales_model: { id, name }`, `amount`, `deposit`, `balance`,
  `payment_records: [ { id, amount, payment_date, recorded_by, ... } ]`,
  `agreement_image_url`, `end_user_photo_url`,
  `created_by_profile: { id, full_name, email }`,
  `updated_by_profile: { id, full_name, email }`,
  `is_cancelled`, `cancellation_reason`, `cancelled_by_profile`, `cancelled_at`.

Implementation reuses the joined-select shape from `get-sales-advanced` (without any role scoping), with pagination via `.range()` and count via `{ count: "exact" }`.

Standard CORS headers on every response (including 401 and OPTIONS 204).

## 2. Secrets & config

- Generate `END_USER_RECORDS_API_KEY` (48 chars) via `generate_secret` and store as an Edge Function secret.
- Deploy Edge Function with `--no-verify-jwt` so the bearer check owns auth; config in `supabase/config.toml`.

## 3. "API Call" button on End User Records view

Edit `src/app/end-user-records/EndUserRecordsContent.jsx`:

- Compute `isSuperAdmin` from existing `resolvedRole`.
- In `PageHeader` `right`, render (only when `isSuperAdmin`):
  ```
  [🔌 API Call]   [⬇ Export]
  ```
- Button is a TanStack `Link` to `/end-user-records/api`, styled like Export but in the green scheme (`#4a5d0f`).

## 4. API docs page — super admin only, full page

New files:

- `src/routes/end-user-records/api/index.tsx` — lazy route pointing at the page component.
- `src/app/end-user-records/api/page.tsx` — wraps content in `ProtectedRoute` with `requireAdminAccess` **and** an inline role check that shows the standard unauthorized state when `resolvedRole !== 'super_admin'`.
- `src/app/end-user-records/api/ApiEndpointContent.tsx` — the page body, using `DashboardLayout` + `PageHeader`, styled with the green scheme.

Page sections:

1. **Back link (top-left):** `← Back to End User Records` (TanStack `Link` to `/end-user-records`).
2. **Endpoint card:** `GET/POST` badges, full URL with copy button, one-line description.
3. **Authentication card:** explains Bearer token, shows the API key masked (`sk_••••…1234`) with **Reveal** + **Copy** actions. The key is fetched at page mount from a new tiny Edge Function `get-end-user-api-key` gated to `super_admin` (verifies the caller's JWT and role, returns the value of `END_USER_RECORDS_API_KEY`). Non-super-admin never sees this.
4. **Query parameters table:** name, type, required, default, description (rows for `page`, `limit`, `dateFrom`, `dateTo`, `state`, `lga`, `partner_id`, `search`, `include_cancelled`).
5. **Example request:** side-by-side cURL and `fetch` snippets in `<pre>` blocks with a copy button; the API key placeholder is replaced with the real key when revealed.
6. **Example response:** a live sample rendered as prettified JSON — on mount call the endpoint with `limit=3` using the fetched key, show status, timing, and the JSON body.
7. **Try it panel:** form with the parameters above + **Send request** button; renders response status, timing, and JSON.
8. **Response schema reference:** collapsible list of every field returned per record.

All UI uses existing shadcn `Button`, `Input`, `Card`, `Badge`, `Tooltip` and matches the End User Records view style (green `#4a5d0f`, no shadows, no alternating rows).

## 5. Files to add / change

Add:
- `supabase/functions/end-user-records-api/index.ts`
- `supabase/functions/end-user-records-api/cors.ts`
- `supabase/functions/get-end-user-api-key/index.ts`
- `src/app/end-user-records/api/page.tsx`
- `src/app/end-user-records/api/ApiEndpointContent.tsx`
- `src/routes/end-user-records/api/index.tsx`

Edit:
- `src/app/end-user-records/EndUserRecordsContent.jsx` — add super-admin-only "API Call" button.
- `supabase/config.toml` — register both new functions (no-verify-jwt for `end-user-records-api`).

Secrets:
- Generate `END_USER_RECORDS_API_KEY`.

## Verification

- Curl the endpoint without a bearer → `401`.
- Curl with valid bearer → paginated JSON with the specified fields.
- As super admin, `/end-user-records/api` renders, key reveals, "Try it" returns 200.
- As non-super-admin, "API Call" button hidden and `/end-user-records/api` shows unauthorized.
