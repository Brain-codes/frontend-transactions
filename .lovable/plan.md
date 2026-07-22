## Goal

On the sales form's "Stove Photo" field, let the user choose between:
1. **Take Photo** — open the device camera and capture directly
2. **Upload from Device** — pick an existing image (current behavior)

Agreement Document upload stays unchanged.

## Changes

### 1. `src/app/components/ui/ImageUploadSection.jsx`
Add an optional `enableCamera` prop. When enabled:
- Render two buttons instead of one: **Take Photo** (camera icon) and **Upload Image** (upload icon).
- Add a second hidden `<input type="file" accept="image/*" capture="environment">` wired to a separate ref for camera capture. On mobile browsers this opens the rear camera directly; on desktop browsers without a camera it gracefully falls back to a file picker.
- In the "preview exists" state, show both **Retake** and **Change** buttons when `enableCamera` is true.
- Keep all existing behavior (upload flow, PDF preview, error, loading spinner) intact for other usages.

### 2. `src/app/admin/components/sales/CreateSalesForm.jsx`
Pass `enableCamera` on the Stove Photo `ImageUploadSection` only. Agreement Document upload stays as-is.

## Technical notes

- Uses the standard HTML `capture` attribute — no new dependencies, no `getUserMedia` permissions plumbing, and it works inside iframes/preview.
- Existing `handleImageUpload(file, "stove")` handler is reused for both paths; the captured photo is delivered as a normal `File`, so validation, upload, and preview logic don't change.
- No backend, storage, or schema changes.
