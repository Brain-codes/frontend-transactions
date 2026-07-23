import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

// Render PDF blob URL as page images using pdfjs-dist
const PdfImagePreview = ({ url, scale = 1.5 }) => {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPages([]);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Use worker from CDN matching version to avoid bundler config
        try {
          const workerUrl = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        }

        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        const imgs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          imgs.push(canvas.toDataURL("image/png"));
          if (cancelled) return;
        }
        if (!cancelled) setPages(imgs);
      } catch (e) {
        console.error("PDF render failed:", e);
        if (!cancelled) setError(e?.message || "Failed to render PDF preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, scale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Rendering document preview…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 border-t border-red-200">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      className="max-h-[75vh] overflow-auto bg-gray-200 p-3 space-y-3"
    >
      {pages.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt={`Agreement page ${idx + 1}`}
          className="w-full h-auto bg-white shadow-md mx-auto block"
        />
      ))}
    </div>
  );
};

export default PdfImagePreview;
