"use client";

import { useEffect, useRef, useState } from "react";

export type OcrResult = {
  ok?: boolean;
  ocrConfidence?: number;
  text?: string;
  parsed?: unknown;
  error?: string;
};

export default function OcrDropBox({
  onParsed,
}: {
  onParsed: (r: OcrResult) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Paste handler
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!boxRef.current) return;
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      const img = Array.from(files).find(f => f.type.startsWith("image/"));
      if (img) {
        e.preventDefault();
        upload(img);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) upload(f);
  }

  async function upload(file: File) {
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ocr/order", { method: "POST", body: fd });
      const j = (await res.json()) as OcrResult;
      onParsed(res.ok ? j : { ...j, ok: false });
    } catch (e: any) {
      onParsed({ error: e?.message || "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  const base = "border-2 border-dashed rounded p-4 text-sm text-gray-600";
  return (
    <div
      ref={boxRef}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      className={base}
      aria-busy={busy}
      role="region"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-800">Paste or drop an order screenshot</div>
          <div>
            • Press <kbd>PrtScn</kbd> / <kbd>Win+Shift+S</kbd> then <kbd>Ctrl+V</kbd> here
            <br />• or drag an image file onto this box
          </div>
        </div>
        {busy && <div className="animate-pulse">Reading…</div>}
      </div>

      {preview && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Preview</div>
          <img src={preview} alt="preview" className="max-h-48 rounded border" />
        </div>
      )}
    </div>
  );
}
