import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, X, AlertCircle } from "lucide-react";

const CameraCaptureModal = ({
  open,
  onOpenChange,
  onCapture,
  onFallbackUpload,
  title = "Take Photo",
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState("");
  const [capturedBlob, setCapturedBlob] = useState(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    setError("");
    setStarting(true);
    try {
      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        throw new Error(
          "Your browser does not support camera access. Please upload an image instead."
        );
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback: any camera (laptop webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay policies — video tag has autoPlay */
        }
      }
    } catch (err) {
      const name = err?.name || "";
      let msg = err?.message || "Unable to access camera.";
      if (name === "NotAllowedError" || name === "SecurityError") {
        msg =
          "Camera permission was denied. Enable camera access in your browser settings or upload a file instead.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = "No camera was found on this device.";
      } else if (name === "NotReadableError") {
        msg = "The camera is already in use by another application.";
      }
      setError(msg);
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setCapturedUrl("");
      setCapturedBlob(null);
      startStream();
    } else {
      stopStream();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl("");
      setCapturedBlob(null);
      setError("");
    }
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
        stopStream();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl("");
    setCapturedBlob(null);
    startStream();
  };

  const handleUsePhoto = () => {
    if (!capturedBlob) return;
    const file = new File(
      [capturedBlob],
      `stove-photo-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );
    onCapture?.(file);
    onOpenChange?.(false);
  };

  const handleClose = () => {
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <p>{error}</p>
                {onFallbackUpload && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange?.(false);
                      onFallbackUpload();
                    }}
                  >
                    Choose file instead
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              {capturedUrl ? (
                <img
                  src={capturedUrl}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              )}
              {starting && !capturedUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                  Starting camera…
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          {!error && !capturedUrl && (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={starting}
              >
                <Camera className="h-4 w-4 mr-2" /> Capture
              </Button>
            </>
          )}
          {!error && capturedUrl && (
            <>
              <Button type="button" variant="outline" onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retake
              </Button>
              <Button type="button" onClick={handleUsePhoto}>
                <Check className="h-4 w-4 mr-2" /> Use Photo
              </Button>
            </>
          )}
          {error && (
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCaptureModal;
