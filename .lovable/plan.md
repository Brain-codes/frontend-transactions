## Root cause

For stove `101106583` the network trace shows the details endpoint 404s with `"No agreement image found for serial number: 101106583"`. The current source of `supabase/functions/get-agreement-image-by-serial/index.ts` returns `"No sale found for serial number: ..."` on the `details` path, so the production edge function is still the pre-fix version (never redeployed). The client relies entirely on that endpoint to obtain a `sale` object, so when it 404s the fallback PDF path in `page.jsx` never runs.

## Fix (two-sided, so it works regardless of deploy timing)

### 1. `supabase/functions/get-agreement-image-by-serial/index.ts`

- Keep `return_type=binary` behavior: still requires `agreement_image_id` and 404s if missing.
- For `return_type=details`:
  - Query `sales` by `stove_serial_no` with no image filter (already in source — this edit forces a redeploy).
  - If no row in `sales`, also query `cancelled_purchases` by the same serial and, if found, return it as `sale` with `image: null` and `source: "cancelled_purchases"`.
  - Only 404 when neither table has a row.
- Add a trivial log/comment change to force the function to redeploy.

### 2. `src/app/agreement-images/page.jsx`

Client-side safety net so the view works even if the edge function is temporarily stale:

- In `runSearch`, when `detailsResponse.success === false`, fall back to reading the sale directly via the Supabase client:
  1. `supabase.from("sales").select("*").eq("stove_serial_no", serial).maybeSingle()`
  2. If empty, `supabase.from("cancelled_purchases").select("*").eq("stove_serial_no", serial).maybeSingle()`
- If either returns a row, set `imageDetails = { sale: row, image: null }` and continue into the existing `buildAgreementBlobUrl(sale)` branch — the right panel renders the generated PDF and Download saves it.
- Only show the "No sale found …" error card if the edge function AND both direct queries come back empty.
- Preserve the existing `latestSerialRef` race-guard and blob-URL cleanup.

## Out of scope

- No changes to `AgreementPDFGenerator.ts`, `agreementImagesService.js`, sidebar, routing, or other views.
- No changes to the binary/image path.

## Verification

- Type `101106583` on `/agreement-images` → left panel shows the transaction details, right panel renders the generated User Agreement PDF, Download saves `agreement_101106583.pdf`.
- A serial with a signed uploaded image still shows the image and downloads a JPG.
- A truly unknown serial still shows the "No sale found …" error card.
- Fast typing then changing the serial mid-flight still only shows the final serial's result (race guard intact).

## Why this will work

If Supabase hasn't yet redeployed the edge function, step 2 makes the UI succeed by hitting `sales` / `cancelled_purchases` directly under the user's RLS session. Once the redeploy from step 1 lands, the edge function alone satisfies the request and the direct-table fallback simply never runs. Both paths converge on the same `buildAgreementBlobUrl(sale)` code that is already known to render and download correctly.
