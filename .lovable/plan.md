## Problem

The current "Take Photo" button uses the HTML `capture="environment"` attribute. On mobile that opens the camera, but on **desktop/laptop browsers it's ignored** and the file picker opens instead. To actually use a laptop webcam we need the `navigator.mediaDevices.getUserMedia()` API with a live video preview.

## Fix

### 1. New component: `src/app/components/ui/CameraCaptureModal.jsx`
A modal dialog that:
- On open, calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` (falls back to any camera if `environment` unavailable — laptops use the front-facing webcam).
- Renders a live `<video autoPlay playsInline muted>` stream preview.
- **Capture** button draws the current video frame to an offscreen `<canvas>`, converts to a JPEG `Blob` via `canvas.toBlob`, wraps it into a `File` (`stove-photo-<timestamp>.jpg`), and passes it to `onCapture`.
- **Retake** returns to live preview after a capture; **Use Photo** confirms and closes.
- **Cancel** stops all tracks and closes.
- Cleans up: stops every `MediaStreamTrack` on close/unmount.
- Handles errors: permission denied, no camera found, insecure context — shows a clear message and a "Choose file instead" button that triggers the normal upload path.

### 2. `src/app/components/ui/ImageUploadSection.jsx`
- Drop the hidden `capture="environment"` input.
- When `enableCamera` is true, the "Take Photo" / "Retake" button opens the new `CameraCaptureModal` instead of a file input.
- On successful capture, call the same `onUpload(file)` callback — the parent form flow is unchanged.
- Keep "Upload Image" / "Change" as-is for device file selection.

### 3. No changes needed in `CreateSalesForm.jsx`
It already passes `enableCamera` and `onUpload={(file) => handleImageUpload(file, "stove")}`.

## Technical notes

- `getUserMedia` requires a **secure context** (HTTPS or localhost). The Lovable preview and published site are HTTPS, so this works. If ever served over plain HTTP, the modal will surface the error message and fall back to file upload.
- No new dependencies — uses built-in browser APIs (`MediaDevices`, `HTMLCanvasElement`).
- JPEG quality set to `0.9`; captured resolution follows the native stream size (typically 1280×720 on laptop webcams).
- Camera stream is fully torn down when the modal closes to release the webcam indicator.
