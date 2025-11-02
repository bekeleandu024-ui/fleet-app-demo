import { OcrTestClient } from "./ocr-test-client";

export const metadata = {
  title: "OCR test",
};

export default function OcrTestPage() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">OCR test</h1>
        <p className="text-sm text-zinc-400">
          Upload a shipping document to run Azure Document Intelligence using the fleetappocr2 model.
        </p>
      </div>
      <OcrTestClient />
    </section>
  );
}
