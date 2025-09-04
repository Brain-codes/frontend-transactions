"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenTool } from "lucide-react";

const SignatureCanvas = ({ signature, onSignatureChange, error }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    initializeCanvas();
  }, []);

  useEffect(() => {
    // Load existing signature if provided
    if (signature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = signature;
    }
  }, [signature]);

  const initializeCanvas = () => {
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
      }
    }, 100);
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoordinates(e);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Convert canvas to base64
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    onSignatureChange(signatureData);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Customer Signature *</Label>
        <div className="border border-gray-300 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="border border-gray-200 rounded cursor-crosshair w-full"
            style={{ maxWidth: "100%", height: "auto" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <div className="mt-2 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Draw the customer&apos;s signature above
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
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export default SignatureCanvas;
