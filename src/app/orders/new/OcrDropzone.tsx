"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confidenceToBadge, formatConfidence, formatIsoForDisplay } from "@/lib/ocr/review";
import type { FieldConfidenceMap, OCREndpointResponse, PartialOrderFields } from "@/lib/ocr/types";
import { useToast, ToastViewport } from "@/components/useToast";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];

const FIELD_LABELS: { key: keyof PartialOrderFields; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "origin", label: "Origin" },
  { key: "destination", label: "Destination" },
  { key: "puWindowStart", label: "PU Window Start" },
  { key: "puWindowEnd", label: "PU Window End" },
  { key: "delWindowStart", label: "DEL Window Start" },
  { key: "delWindowEnd", label: "DEL Window End" },
  { key: "requiredTruck", label: "Required Truck" },
  { key: "notes", label: "Notes" },
];

type StepStatus = "idle" | "active" | "complete" | "error";

const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

type Props = {
  onApply: (fields: PartialOrderFields) => void;
};

type FetchState = {
  step: number;
  status: StepStatus[];
  live: string;
};

export function OcrDropzone({ onApply }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>({ step: 0, status: ["idle", "idle", "idle"], live: "Idle" });
  const [result, setResult] = useState<OCREndpointResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"review" | "preview">("review");
  const timers = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const resetTimers = () => {
    timers.current.forEach(id => window.clearTimeout(id));
    timers.current = [];
  };

  const resetState = useCallback(() => {
    resetTimers();
    setFetchState({ step: 0, status: ["idle", "idle", "idle"], live: "Idle" });
    setError(null);
  }, []);

  useEffect(() => () => resetTimers(), []);

  const updateStep = useCallback((nextStep: number, status: StepStatus[], live: string) => {
    setFetchState({ step: nextStep, status, live });
  }, []);

  const markProcessing = useCallback(() => {
    updateStep(1, ["active", "idle", "idle"], "Preprocessing document...");
    const id = window.setTimeout(() => {
      updateStep(2, ["complete", "active", "idle"], "Running OCR...");
    }, 500);
    timers.current.push(id);
  }, [updateStep]);

  const markParsing = useCallback(() => {
    resetTimers();
    updateStep(3, ["complete", "complete", "active"], "Parsing fields...");
  }, [updateStep]);

  const completeSuccess = useCallback(() => {
    updateStep(3, ["complete", "complete", "complete"], "Finished parsing.");
  }, [updateStep]);

  const markError = useCallback((message: string) => {
    resetTimers();
    setError(message);
    setFetchState({ step: 3, status: ["error", "error", "error"], live: message });
  }, []);

  const handleExtraction = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: "Unsupported file", description: "Please upload a PNG, JPG, or PDF", variant: "destructive" });
        return;
      }
      resetState();
      setResult(null);
      setSelected({});
      setActiveTab("review");
      markProcessing();

      try {
        const formData = new FormData();
        formData.append("file", file);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) formData.append("tz", tz);
        formData.append("locale", navigator.language ?? "en-US");

        const response = await fetch("/api/orders/ocr", {
          method: "POST",
          body: formData,
        });

        markParsing();

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          const message = data?.error ?? "Unable to process document";
          throw new Error(message);
        }

        const payload = (await response.json()) as OCREndpointResponse;
        setResult(payload);
        setSelected(() => {
          const defaults: Record<string, boolean> = {};
          FIELD_LABELS.forEach(field => {
            const value = (payload.fields as Record<string, unknown>)[field.key];
            if (value !== undefined && value !== null && value !== "") {
              defaults[field.key] = true;
            }
          });
          return defaults;
        });
        completeSuccess();
        if (payload.warnings?.length) {
          toast({ title: "Review recommended", description: payload.warnings.join("; "), variant: "warning" });
        }
        toast({ title: "OCR complete", variant: "success" });
      } catch (err: any) {
        const message = err?.message ?? "OCR failed";
        markError(message);
        toast({ title: "OCR failed", description: message, variant: "destructive" });
      }
    },
    [completeSuccess, markParsing, markProcessing, markError, resetState, toast],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void handleExtraction(file);
    },
    [handleExtraction],
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleExtraction(file);
      event.target.value = "";
    },
    [handleExtraction],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.files;
      if (!items || !items.length) return;
      const file = items[0];
      if (file) {
        event.preventDefault();
        void handleExtraction(file as File);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleExtraction]);

  const reviewFields = useMemo(() => {
    if (!result) return [];
    return FIELD_LABELS.map(({ key, label }) => {
      const value = (result.fields as Record<string, unknown>)[key];
      if (value === undefined || value === null || value === "") return null;
      return { key, label, value };
    }).filter(Boolean) as { key: keyof PartialOrderFields; label: string; value: unknown }[];
  }, [result]);

  const canApply = useMemo(() => {
    if (!result) return false;
    return reviewFields.some(field => selected[field.key as string]);
  }, [result, reviewFields, selected]);

  const onToggleField = (key: string) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    if (!result) return;
    const toApply: PartialOrderFields = {};
    reviewFields.forEach(({ key, value }) => {
      if (selected[key as string]) {
        (toApply as Record<string, unknown>)[key as string] = value;
      }
    });
    if (Object.keys(toApply).length === 0) {
      toast({ title: "Select fields", description: "Choose at least one field before applying" });
      return;
    }
    onApply(toApply);
    toast({ title: "Fields applied", variant: "success" });
  };

  const renderBadge = (fieldKey: keyof FieldConfidenceMap) => {
    const confidence = result?.confidence?.[fieldKey] ?? undefined;
    const badge = confidenceToBadge(confidence);
    const label = formatConfidence(confidence ?? undefined);
    const classes =
      badge === "success"
        ? "bg-emerald-100 text-emerald-900"
        : badge === "warning"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-700";
    const text = badge === "warning" ? `Needs review (${label})` : `Confidence ${label}`;
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{text}</span>
    );
  };

  const previewImage = result?.boxes?.previewDataUrl;
  const previewBoxes = result?.boxes;

  return (
    <div className="space-y-4">
      <ToastViewport />
      <div
        role="presentation"
        tabIndex={0}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
        aria-label="Order upload dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={onFileChange}
        />
        <p className="text-sm font-medium text-slate-800">Paste or drop an order screenshot</p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG, or PDF up to 8 MB</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Upload
        </button>
        <div aria-live="polite" className="sr-only">
          {fetchState.live}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {["Preprocess", "OCR", "Parse"].map((label, index) => {
          const status = fetchState.status[index];
          const isActive = status === "active";
          const isComplete = status === "complete";
          const isError = status === "error";
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isActive
                    ? "border-blue-500 text-blue-600"
                    : isError
                    ? "border-red-500 text-red-500"
                    : "border-slate-300 text-slate-500"
                }`}
              >
                {isComplete ? "✓" : isError ? "!" : index + 1}
              </div>
              <span className={`text-xs ${isActive ? "text-blue-600" : "text-slate-600"}`}>{label}</span>
              {index < 2 ? <span className="text-slate-300">/</span> : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  activeTab === "review" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => setActiveTab("review")}
              >
                Review
              </button>
              {previewImage ? (
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    activeTab === "preview" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => setActiveTab("preview")}
                >
                  Preview
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!canApply}
              onClick={handleApply}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                canApply ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              Apply fields
            </button>
          </div>

          {activeTab === "review" ? (
            <div className="space-y-3">
              {reviewFields.length === 0 ? (
                <p className="text-sm text-slate-500">No fields detected. Try a clearer capture.</p>
              ) : (
                reviewFields.map(({ key, label, value }) => {
                  const confidence = result?.confidence?.[key];
                  const formatted = typeof value === "string" && value.includes("T") && value.length >= 16
                    ? formatIsoForDisplay(value)
                    : typeof value === "string"
                    ? value
                    : JSON.stringify(value);
                  const isSelected = !!selected[key as string];
                  return (
                    <div key={key as string} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{formatted}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs">
                          {renderBadge(key)}
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={isSelected}
                              onChange={() => onToggleField(key as string)}
                            />
                            Use
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {activeTab === "preview" && previewImage ? (
            <div className="relative w-full overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="relative mx-auto max-w-full">
                <img src={previewImage} alt="OCR preview" className="max-h-[480px] w-full object-contain" />
                {previewBoxes?.words?.map(box => {
                  const left = (box.bbox.x / (previewBoxes.imageWidth || 1)) * 100;
                  const top = (box.bbox.y / (previewBoxes.imageHeight || 1)) * 100;
                  const width = (box.bbox.width / (previewBoxes.imageWidth || 1)) * 100;
                  const height = (box.bbox.height / (previewBoxes.imageHeight || 1)) * 100;
                  return (
                    <div
                      key={`${box.bbox.x}-${box.bbox.y}-${box.text}`}
                      className="pointer-events-none absolute rounded border border-blue-500/70 bg-blue-200/20"
                      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default OcrDropzone;
