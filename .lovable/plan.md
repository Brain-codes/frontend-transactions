## Goal

Make the Agreement Images view search live as the user types, and reliably show the sales agreement document for the entered stove ID — the uploaded signed image when it exists, otherwise the auto-generated agreement PDF (with a working Download).

## Current state (verified in `src/app/agreement-images/page.jsx`)

- Search is button/Enter-triggered via `handleSearch()`.
- On submit it already calls both `getAgreementImageBinary` and `getAgreementImageDetails` in parallel, and if the image is missing it generates a fallback PDF via `buildAgreementBlobUrl(sale)` from `AgreementPDFGenerator.ts`.
- `handleDownload` already downloads the uploaded image when present, or calls `downloadAgreementPDF(sale)` otherwise.
- The edge function `get-agreement-image-by-serial` already returns sale details even when no image is on file (from prior change).

So the fallback path exists — the missing piece is live search, plus a couple of correctness fixes so results don't flicker or race as the user types.

## Changes

1. Live "search-as-you-type" in `src/app/agreement-images/page.jsx`
   - Remove the Search button; keep only the input (with the search icon and a small inline spinner when a lookup is in flight).
   - Add a `useEffect` on `searchTerm` that debounces ~350 ms and calls a new `runSearch(serial, { signal })` helper.
   - Trim the value; treat length `< 4` as "not enough yet" — clear results/error and do nothing (avoids hammering the API for 1–2 char inputs).
   - Track the latest request with an `AbortController` and a `latestSerialRef`; ignore responses whose serial no longer matches the current input. Revoke any prior `fallbackPdfUrl` before setting a new one to prevent blob leaks.
   - Keep pressing Enter as a no-op shortcut (already effectively covered by the live effect).

2. Result rendering rules (unchanged behavior, tightened)
   - If `getAgreementImageBinary` succeeds → render the uploaded image (existing right-panel viewer, zoom, print). Download button saves the JPG.
   - If it fails but `getAgreementImageDetails` succeeds → generate the PDF via `buildAgreementBlobUrl(sale)`, render it in the existing `<iframe>` viewer, and show a subtle "Auto-generated agreement (no signed copy on file)" note. Download button calls `downloadAgreementPDF(sale)`.
   - If details fail → show the existing error card ("No sale found for serial …").

3. UX polish
   - Show the inline spinner inside the input's right edge while `searching` or `generatingPdf` is true.
   - When the input is cleared, reset all state (`currentImage`, `imageDetails`, `fallbackPdfUrl`, `error`) and revoke the blob URL.

## Out of scope

- No edge function changes (the endpoint already returns sale details without an image).
- No changes to `AgreementPDFGenerator.ts` or `agreementImagesService.js`.
- No changes to other views/sidebar/routes.

## Verification

- Type a serial that has an uploaded image → image appears within ~350 ms of stopping typing; Download saves the JPG.
- Type a serial that has a sale but no uploaded image → generated agreement PDF renders in the iframe with a "no signed copy on file" note; Download saves the PDF.
- Type a non-existent serial → error card shows "No sale found for serial …".
- Type quickly and then change the serial mid-flight → only the final serial's result is shown (older responses are ignored, blob URLs revoked).
- Clear the input → view returns to the empty state.
