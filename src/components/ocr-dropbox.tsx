"use client";

import { useEffect, useRef, useState } from "react";

import { parseOrderFromText } from "@/lib/parse-order";

export type OcrResult = {
  ok?: boolean;
  ocrConfidence?: number;
  text?: string;
  parsed?: unknown;
  error?: string;
};

type TesseractModule = typeof import("tesseract.js") extends { default: infer D }
  ? D
  : never;

type LoggerMessage = { status: string; progress?: number };

let tesseractPromise: Promise<TesseractModule> | null = null;

const toneClass = {
  info: "text-gray-500",
  error: "text-red-600",
  success: "text-green-600",
} as const;

async function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import("tesseract.js").then(mod => mod.default ?? (mod as unknown as TesseractModule));
  }
  return tesseractPromise;
}

export default function OcrDropBox({
  onParsed,
}: {
  onParsed: (r: OcrResult) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"info" | "error" | "success">("info");
  const [progress, setProgress] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const previewUrl = useRef<string | null>(null);

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
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) upload(f);
  }

  async function upload(file: File) {
    if (busy) return;
    setBusy(true);
    setStatus("Loading OCR engine…");
    setStatusTone("info");
    setProgress(0);
    const url = URL.createObjectURL(file);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = url;
    setPreview(url);
    try {
      const tesseract = await loadTesseract();
      const { data } = await tesseract.recognize(file, "eng", {
        logger: (message: LoggerMessage) => {
          if (!message?.status) return;
          setStatusTone("info");
          if (message.status === "recognizing text") {
            const pct = Math.round((message.progress ?? 0) * 100);
            setProgress(message.progress ?? 0);
            setStatus(`Reading text… ${pct}%`);
          } else if (message.status === "initializing api") {
            setStatus("Preparing reader…");
          } else if (message.status === "loading language traineddata") {
            setStatus("Loading language data…");
          } else if (message.status === "loading tesseract core") {
            setStatus("Loading OCR engine…");
          } else {
            setStatus(`${message.status.charAt(0).toUpperCase()}${message.status.slice(1)}…`);
          }
        },
      });
      const text = data.text ?? "";
      const parsed = parseOrderFromText(text);
      onParsed({ ok: true, ocrConfidence: data.confidence, text, parsed });
      setProgress(1);
      setStatus("Text captured from image.");
      setStatusTone("success");
    } catch (e: any) {
      const message = e?.message || "OCR failed";
      onParsed({ ok: false, error: message });
      setStatus(message);
      setStatusTone("error");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => () => {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
    }
  }, []);

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
        {busy && (
          <div className="flex items-center gap-2 text-sm text-gray-500" aria-live="polite">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400" aria-hidden />
            <span>{status ?? "Reading…"}</span>
          </div>
        )}
      </div>

      {status && (
        <div className={`mt-3 text-sm ${toneClass[statusTone]}`} aria-live="polite">
          {status}
          {busy && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-gray-200">
              <div
                className="h-full rounded bg-blue-500 transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, Math.round(progress * 100))) || 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Preview</div>
          <img src={preview} alt="preview" className="max-h-48 rounded border" />
        </div>
      )}
    </div>
  );
}
