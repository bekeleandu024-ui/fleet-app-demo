import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  outputFileTracingIncludes: {
    "src/app/api/orders/ocr/route.ts": [
      "node_modules/tesseract.js/dist/worker.min.js",
      "node_modules/tesseract.js-core/tesseract-core.wasm",
      "node_modules/tesseract.js-core/tesseract-core.wasm.js",
    ],
  },
};

export default nextConfig;
