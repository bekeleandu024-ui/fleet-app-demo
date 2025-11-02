"use server";

import { analyzeDocumentWithFleetModel } from "@/lib/azure-document-intelligence/analyze";
import {
  FLEET_APP_OCR_MODEL_ID,
  type DocumentIntelligenceAnalyzeResult,
} from "@/lib/azure-document-intelligence/shared";

import type { OcrTestState } from "./types";

function extractText(result?: DocumentIntelligenceAnalyzeResult | null): string {
  if (!result) return "";

  if (typeof result.content === "string" && result.content.trim()) {
    return result.content.trim();
  }

  if (Array.isArray(result.paragraphs)) {
    const paragraphs = result.paragraphs
      .map(paragraph => (typeof paragraph?.content === "string" ? paragraph.content.trim() : ""))
      .filter(Boolean);
    if (paragraphs.length) {
      return paragraphs.join("\n\n");
    }
  }

  if (Array.isArray(result.pages)) {
    const lines: string[] = [];
    for (const page of result.pages) {
      const pageLines = (page as { lines?: Array<{ content?: string }> }).lines;
      if (!Array.isArray(pageLines)) continue;
      for (const line of pageLines) {
        if (typeof line?.content === "string") {
          const trimmed = line.content.trim();
          if (trimmed) lines.push(trimmed);
        }
      }
    }
    if (lines.length) {
      return lines.join("\n");
    }
  }

  return "";
}

export async function analyzeOcr(_: OcrTestState, formData: FormData): Promise<OcrTestState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      modelId: FLEET_APP_OCR_MODEL_ID,
      content: "",
      analyzeResult: null,
      error: "Please select an image or PDF to analyze.",
    };
  }

  try {
    const { analyzeResult } = await analyzeDocumentWithFleetModel(file);
    return {
      status: "success",
      modelId: FLEET_APP_OCR_MODEL_ID,
      content: extractText(analyzeResult),
      analyzeResult: analyzeResult ?? null,
      error: null,
    };
  } catch (error) {
    return {
      status: "error",
      modelId: FLEET_APP_OCR_MODEL_ID,
      content: "",
      analyzeResult: null,
      error: error instanceof Error ? error.message : "Document analysis failed.",
    };
  }
}
