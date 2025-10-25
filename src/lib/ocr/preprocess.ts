import sharp, { type Sharp } from "sharp";

export type PreprocessOptions = {
  mimeType: string;
};

export type PreprocessResult = {
  buffer: Buffer;
  width: number;
  height: number;
  dataUrl: string;
};

function shouldUpscale(width?: number, height?: number) {
  if (!width || !height) return false;
  const longest = Math.max(width, height);
  return longest < 1700;
}

async function deskew(image: Sharp, metadata: Awaited<ReturnType<Sharp["metadata"]>>) {
  const orientation = metadata.orientation;
  if (orientation === 6) {
    return image.rotate(90);
  }
  if (orientation === 8) {
    return image.rotate(-90);
  }
  if (orientation === 3) {
    return image.rotate(180);
  }
  return image;
}

export async function preprocessInput(buffer: Buffer, options: PreprocessOptions): Promise<PreprocessResult> {
  const mime = options.mimeType;
  let pipeline: Sharp;
  if (mime === "application/pdf") {
    pipeline = sharp(buffer, { density: 260, page: 0 });
  } else {
    pipeline = sharp(buffer);
  }

  const metadata = await pipeline.metadata();
  if (metadata.pages && metadata.pages > 1) {
    throw new Error("Only single-page documents are supported");
  }

  const resized = shouldUpscale(metadata.width, metadata.height)
    ? pipeline.resize({
        width: metadata.width ? Math.round(metadata.width * 1.6) : undefined,
        height: metadata.height ? Math.round(metadata.height * 1.6) : undefined,
        kernel: sharp.kernel.lanczos3,
      })
    : pipeline;

  const adjusted = await deskew(resized, metadata)
    .greyscale()
    .normalize()
    .median(1)
    .linear(1.15, -8)
    .sharpen({ sigma: 1 })
    .gamma()
    .threshold(185)
    .toColorspace("b-w");

  const processedBuffer = await adjusted.png({ compressionLevel: 9 }).toBuffer();
  const finalMeta = await sharp(processedBuffer).metadata();
  const width = finalMeta.width ?? metadata.width ?? 0;
  const height = finalMeta.height ?? metadata.height ?? 0;
  const dataUrl = `data:image/png;base64,${processedBuffer.toString("base64")}`;

  return { buffer: processedBuffer, width, height, dataUrl };
}
