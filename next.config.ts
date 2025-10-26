import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  },
};

export default nextConfig;
