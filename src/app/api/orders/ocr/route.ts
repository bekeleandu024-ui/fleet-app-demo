import { NextRequest, NextResponse } from "next/server";
import { createWorker, type Worker } from "tesseract.js";
import { preprocessImage } from "@/lib/ocr/preprocess";
import { parseOrderFromOCR } from "@/lib/ocr/parse";
import type { OCRLine, OCRWord, OCREndpointResult } from "@/lib/ocr/types";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "application/pdf"]);
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_COUNT = 12;

const rateLimiter = new Map<string, { count: number; expires: number }>();
let workerPromise: Promise<Worker> | null = null;
let workerReady: Worker | null = null;
let currentTask: Promise<void> = Promise.resolve();

async function getWorker() {
  if (workerReady) return workerReady;
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  workerReady = await workerPromise;
  return workerReady;
}

function limitRequest(request: NextRequest) {
  const ip = request.ip ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const now = Date.now();
  const bucket = rateLimiter.get(ip);
  if (!bucket || bucket.expires < now) {
    rateLimiter.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (bucket.count >= RATE_LIMIT_COUNT) {
    return true;
  }
  bucket.count += 1;
  return false;
}

function toWord(word: any): OCRWord {
  const bbox = word?.bbox ?? word?.boundingBox ?? {};
  const x = bbox.x0 ?? bbox.left ?? 0;
  const y = bbox.y0 ?? bbox.top ?? 0;
  const x1 = bbox.x1 ?? bbox.right ?? x;
  const y1 = bbox.y1 ?? bbox.bottom ?? y;
  return {
    text: String(word.text ?? "").trim(),
    confidence: typeof word.confidence === "number" ? word.confidence / 100 : 0,
    bbox: {
      x,
      y,
      width: Math.max(0, x1 - x),
      height: Math.max(0, y1 - y),
      confidence: typeof word.confidence === "number" ? word.confidence / 100 : undefined,
      text: String(word.text ?? ""),
      level: "word",
    },
  };
}

function toLine(line: any): OCRLine {
  const bbox = line?.bbox ?? line?.boundingBox ?? {};
  const x = bbox.x0 ?? bbox.left ?? 0;
  const y = bbox.y0 ?? bbox.top ?? 0;
  const x1 = bbox.x1 ?? bbox.right ?? x;
  const y1 = bbox.y1 ?? bbox.bottom ?? y;
  const words = Array.isArray(line.words) ? line.words.map(toWord) : [];
  return {
    text: String(line.text ?? "").trim(),
    confidence: typeof line.confidence === "number" ? line.confidence / 100 : 0,
    bbox: {
      x,
      y,
      width: Math.max(0, x1 - x),
      height: Math.max(0, y1 - y),
      confidence: typeof line.confidence === "number" ? line.confidence / 100 : undefined,
      text: String(line.text ?? ""),
      level: "line",
    },
    words,
  };
}

async function recognizeImage(buffer: Buffer) {
  const worker = await getWorker();
  await currentTask;
  let resolveTask: () => void = () => {};
  currentTask = new Promise<void>(resolve => {
    resolveTask = resolve;
  });
  try {
    const { data } = await worker.recognize(buffer);
    return data;
  } finally {
    resolveTask();
  }
}

export async function POST(request: NextRequest) {
  let stage: "Preprocess" | "OCR" | "Parse" = "Preprocess";

  try {
    if (limitRequest(request)) {
      return NextResponse.json<OCREndpointResult>({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json<OCREndpointResult>({ ok: false, error: "File missing" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json<OCREndpointResult>({ ok: false, error: "File too large" }, { status: 413 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json<OCREndpointResult>({ ok: false, error: "Unsupported file type" }, { status: 415 });
    }

    const tz = formData.get("tz")?.toString();
    const locale = formData.get("locale")?.toString();
    const buffer = Buffer.from(await file.arrayBuffer());

    const preprocessed = await preprocessImage(buffer, mimeType);
    stage = "OCR";
    const data = await recognizeImage(preprocessed.buffer);

    const text = String(data?.text ?? "");
    const lines: OCRLine[] = Array.isArray(data?.lines) ? data.lines.map(toLine) : [];

    stage = "Parse";
    const parsed = parseOrderFromOCR({ text, lines }, { tz, locale });

    const previewMime = mimeType === "application/pdf" ? "image/png" : mimeType;
    const previewDataUrl = `data/${previewMime};base64,${preprocessed.buffer.toString("base64")}`;

    const response: OCREndpointResult = {
      ok: true,
      fields: parsed.fields,
      confidence: parsed.confidence,
      warnings: parsed.warnings,
      boxes: {
        imageHeight: preprocessed.meta.height,
        imageWidth: preprocessed.meta.width,
        previewDataUrl,
        lines,
        words: Array.isArray(data?.words) ? data.words.map(toWord) : [],
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error(`OCR failure during ${stage}`, error);
    const message = error?.message ? `${stage} failed: ${error.message}` : `Unable to process document (${stage})`;
    return NextResponse.json<OCREndpointResult>({ ok: false, error: message }, { status: 500 });
  }
}
