import type { DocumentIntelligenceAnalyzeResult } from "@/lib/azure-document-intelligence/shared";

export type OcrTestStatus = "idle" | "success" | "error";

export type OcrTestState = {
  status: OcrTestStatus;
  modelId: string;
  content: string;
  analyzeResult: DocumentIntelligenceAnalyzeResult | null;
  error: string | null;
};
