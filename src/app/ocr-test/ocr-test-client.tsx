"use client";

import { useActionState } from "react";

import { analyzeOcr } from "./actions";
import type { OcrTestState } from "./types";
import { FLEET_APP_OCR_MODEL_ID } from "@/lib/azure-document-intelligence/shared";

const INITIAL_STATE: OcrTestState = {
  status: "idle",
  modelId: FLEET_APP_OCR_MODEL_ID,
  content: "",
  analyzeResult: null,
  error: null,
};

export function OcrTestClient() {
  const [state, formAction, pending] = useActionState(analyzeOcr, INITIAL_STATE);

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6">
      <form action={formAction} className="space-y-4" encType="multipart/form-data">
        <div className="flex flex-col gap-2 text-sm">
          <label className="font-medium text-zinc-200" htmlFor="ocr-file">
            Upload document
          </label>
          <input
            id="ocr-file"
            name="file"
            type="file"
            accept="image/*,application/pdf"
            required
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
          <p className="text-xs text-zinc-500">
            The document will be analyzed with Azure Document Intelligence model {FLEET_APP_OCR_MODEL_ID}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Analyzing…" : "Analyze document"}
          </button>
          <span className="text-xs text-zinc-500">Model: {FLEET_APP_OCR_MODEL_ID}</span>
        </div>
        {state.status === "error" && state.error ? (
          <p className="text-sm text-rose-400">{state.error}</p>
        ) : null}
      </form>

      {state.status === "success" ? (
        <div className="space-y-4 rounded-md border border-emerald-700/60 bg-emerald-950/20 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-emerald-200">
              Analysis complete using model {state.modelId}.
            </p>
            {state.content ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-200">Extracted text</h3>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-200">
                  {state.content}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No text was returned by the model.</p>
            )}
          </div>
          <details className="group space-y-2">
            <summary className="cursor-pointer text-sm font-medium text-zinc-200">
              Raw analyze result
            </summary>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-300">
              {JSON.stringify(state.analyzeResult, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
