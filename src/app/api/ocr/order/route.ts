import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { parseOcrToOrder } from "@/lib/ocr";

export const runtime = "nodejs";

// POST multipart/form-data with "file": image
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image 'file'" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    const { data } = await Tesseract.recognize(buf, "eng");
    const text = data.text || "";
    const parsed = parseOcrToOrder(text);

    return NextResponse.json({
      ok: true,
      ocrConfidence: data.confidence,
      text,
      parsed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "OCR failed" }, { status: 500 });
  }
}
