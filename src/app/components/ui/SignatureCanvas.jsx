
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenTool, Upload, Lock, Camera } from "lucide-react";
import {
  getSignatureFromCanvas,
  clearSignatureCanvas,
  loadSignatureToCanvas,
  initializeSignatureCanvas,
  getCanvasCoordinates,
} from "../../utils/signatureUtils";
import CameraCaptureModal from "./CameraCaptureModal";

const SignatureCanvas = ({
  signature,
  onSignatureChange,
  error,
  label = "Customer Signature *",
}) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  // The pad is LOCKED by default: it only captures strokes once the user
  // explicitly activates it. This stops accidental marks while scrolling the
  // form up/down (a common complaint on touch screens).
  const [drawingEnabled, setDrawingEnabled] = useState(false);

  useEffect(() => {
    initializeCanvas();
  }, []);

  useEffect(() => {
    // Load existing signature if provided (handles both base64 and data URL)
    // Wait for canvas to be ready before loading signature
    if (signature && canvasRef.current && canvasReady) {
      loadSignatureToCanvas(canvasRef.current, signature);
    }
  }, [signature, canvasReady]);

  const initializeCanvas = () => {
    setTimeout(() => {
      if (canvasRef.current) {
        initializeSignatureCanvas(canvasRef.current);
        setCanvasReady(true);
      }
    }, 100);
  };

  const startDrawing = (e) => {
    if (!drawingEnabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Ensure consistent drawing settings
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const coords = getCanvasCoordinates(canvas, e);

    setLastPosition(coords);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!drawingEnabled || !isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoordinates(canvas, e);

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setLastPosition(coords);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Convert canvas to base64 (API format) - consistent with Flutter approach
    const canvas = canvasRef.current;
    const base64Signature = getSignatureFromCanvas(canvas);

    // Always pass base64 format to parent (API format)
    // Parent components handle display conversion as needed
    onSignatureChange(base64Signature || "");
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    clearSignatureCanvas(canvas);
    // Send empty string in base64 format
    onSignatureChange("");
  };

  // Upload a signature as an image instead of drawing it. The picked image is
  // rendered onto the same canvas so it is exported/validated exactly like a
  // drawn signature (base64 PNG).
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl !== "string") return;
      // Draw the uploaded image onto the canvas, then export it back to base64
      // so it flows through the exact same submit path as a drawn signature.
      loadSignatureToCanvas(canvasRef.current, dataUrl);
      // loadSignatureToCanvas draws asynchronously (img.onload); give it a beat
      // before reading the canvas back.
      setTimeout(() => {
        const base64Signature = getSignatureFromCanvas(canvasRef.current);
        onSignatureChange(base64Signature || dataUrl.split(",")[1] || "");
      }, 150);
    };
    reader.readAsDataURL(file);
    // Allow re-selecting the same file later
    e.target.value = "";
  };

  // Touch event handlers for mobile support. When drawing is disabled we do NOT
  // preventDefault, so the page can still scroll through the signature area.
  const handleTouchStart = (e) => {
    if (!drawingEnabled) return;
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e) => {
    if (!drawingEnabled) return;
    e.preventDefault();
    draw(e);
  };

  const handleTouchEnd = (e) => {
    if (!drawingEnabled) return;
    e.preventDefault();
    stopDrawing();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            {/* Activation toggle — the pad only draws when this is ON. */}
            <button
              type="button"
              onClick={() => setDrawingEnabled((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
                drawingEnabled
                  ? "bg-brand text-white border-brand"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {drawingEnabled ? (
                <PenTool className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {drawingEnabled ? "Signing enabled" : "Tap to sign"}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload Image
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className={`border rounded block ${
              drawingEnabled
                ? "border-brand cursor-crosshair touch-none"
                : "border-gray-200 cursor-not-allowed"
            }`}
            style={{
              width: "100%",
              height: "200px",
              maxWidth: "100%",
              display: "block",
              // Let the page scroll over a locked pad; block it only while signing.
              touchAction: drawingEnabled ? "none" : "auto",
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <div className="mt-2 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {drawingEnabled
                ? "Draw the customer's signature above"
                : "Enable signing to draw, or upload a signature image"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
            >
              Clear Signature
            </Button>
          </div>
        </div>
        {/* {error && <p className="text-sm text-red-600">{error}</p>} */}
      </div>
    </div>
  );
};

export default SignatureCanvas;
