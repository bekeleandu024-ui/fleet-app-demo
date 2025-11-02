import "server-only";

import { Buffer } from "node:buffer";

import {
  FLEET_APP_OCR_MODEL_ID,
  type DocumentIntelligenceAnalyzeResult,
} from "./shared";

const API_VERSION = "2024-07-31";
const INITIAL_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 12;

type OperationStatus = "notStarted" | "running" | "succeeded" | "failed" | "canceled";

type OperationError = {
  code?: string;
  message?: string;
  details?: Array<{ code?: string; message?: string }>;
};

type OperationResponse = {
  status?: OperationStatus;
  analyzeResult?: DocumentIntelligenceAnalyzeResult;
  error?: OperationError;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} required for Azure Document Intelligence.`);
  }
  return value;
}

function sanitizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function buildAnalyzeUrl(endpoint: string): string {
  const base = sanitizeEndpoint(endpoint);
  return `${base}/documentintelligence/documentModels/${encodeURIComponent(FLEET_APP_OCR_MODEL_ID)}:analyze?api-version=${API_VERSION}`;
}

function resolveOperationLocation(location: string, endpoint: string): string {
  try {
    return new URL(location, sanitizeEndpoint(endpoint)).toString();
  } catch {
    return location;
  }
}

async function readOptionalJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function analyzeDocumentWithFleetModel(file: File): Promise<{
  analyzeResult: DocumentIntelligenceAnalyzeResult | null;
  modelId: typeof FLEET_APP_OCR_MODEL_ID;
}> {
  const endpoint = getEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  const key = getEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");

  const buffer = Buffer.from(await file.arrayBuffer());
  const analyzeUrl = buildAnalyzeUrl(endpoint);

  let submitResponse: Response;
  try {
    submitResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Ocp-Apim-Subscription-Key": key,
        "api-key": key,
        Accept: "application/json",
      },
      body: buffer,
    });
  } catch (error) {
    throw new Error(`Unable to reach Azure Document Intelligence: ${(error as Error)?.message ?? String(error)}`);
  }

  if (submitResponse.status !== 202) {
    const errorBody = await readOptionalJson(submitResponse);
    const message =
      (errorBody?.error?.message as string | undefined) ?? `${submitResponse.status} ${submitResponse.statusText}`.trim();
    throw new Error(`Document Intelligence analyze request failed: ${message}`);
  }

  const operationLocation = submitResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Document Intelligence response missing operation-location header.");
  }

  const operationUrl = resolveOperationLocation(operationLocation, endpoint);

  await delay(INITIAL_DELAY_MS);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    let pollResponse: Response;
    try {
      pollResponse = await fetch(operationUrl, {
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "api-key": key,
          Accept: "application/json",
        },
      });
    } catch (error) {
      throw new Error(`Failed to poll Document Intelligence operation: ${(error as Error)?.message ?? String(error)}`);
    }

    if (!pollResponse.ok) {
      const errorBody = await readOptionalJson(pollResponse);
      const message =
        (errorBody?.error?.message as string | undefined) ?? `${pollResponse.status} ${pollResponse.statusText}`.trim();
      throw new Error(`Failed to poll Document Intelligence operation: ${message}`);
    }

    const payload = (await pollResponse.json()) as OperationResponse;

    if (payload.status === "succeeded") {
      return {
        analyzeResult: payload.analyzeResult ?? null,
        modelId: FLEET_APP_OCR_MODEL_ID,
      };
    }

    if (payload.status === "failed") {
      const detailMessage =
        payload.error?.message ??
        payload.error?.details?.map(detail => detail?.message).filter(Boolean).join("; ");
      throw new Error(detailMessage || "Document Intelligence analysis failed.");
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await delay(POLL_INTERVAL_MS);
    }
  }

  throw new Error("Document Intelligence analysis timed out before completion.");
}
