import sharp from "sharp";

export type PreprocessResult = {
  buffer: Buffer;
  meta: { width: number; height: number };
};

function shouldUpscale(width?: number, height?: number) {
  if (!width || !height) return false;
  const longest = Math.max(width, height);
  return longest < 1700;
}

export async function deskew(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, { failOnError: false });
    const metadata = await image.metadata();
    const orientation = metadata.orientation;

    let angle = 0;
    if (orientation === 6) angle = 90;
    else if (orientation === 8) angle = -90;
    else if (orientation === 3) angle = 180;

    if (angle !== 0) {
      return await image.rotate(angle).toBuffer();
    }
  } catch (error) {
    console.warn("deskew failed, falling back to original buffer", error);
  }

  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

export async function preprocessImage(
  input: Buffer | Uint8Array,
  mime: string,
): Promise<PreprocessResult> {
  let workingBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  try {
    if (mime === "application/pdf") {
      const pdfImage = sharp(workingBuffer, { density: 300, page: 0, failOnError: false });
      const rendered = await pdfImage.png().toBuffer();
      workingBuffer = rendered;
    }
  } catch (error) {
    console.warn("PDF rasterization failed, using original buffer", error);
  }

  let metadata = await sharp(workingBuffer, { failOnError: false }).metadata();

  if (metadata.pages && metadata.pages > 1) {
    throw new Error("Only single-page documents are supported");
  }

  if (shouldUpscale(metadata.width, metadata.height)) {
    const width = metadata.width ? Math.round(metadata.width * 1.6) : undefined;
    const height = metadata.height ? Math.round(metadata.height * 1.6) : undefined;
    workingBuffer = await sharp(workingBuffer, { failOnError: false })
      .resize({ width, height, kernel: sharp.kernel.lanczos3 })
      .toBuffer();
    metadata = await sharp(workingBuffer, { failOnError: false }).metadata();
  }

  const deskewed = await deskew(workingBuffer);

  let img = sharp(deskewed, { failOnError: false });
  img = img
    .grayscale()
    .normalize()
    .linear(1.1, -10)
    .threshold(180, { grayscale: true })
    .removeAlpha();

  const { data, info } = await img.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    meta: {
      width: info.width ?? metadata.width ?? 0,
      height: info.height ?? metadata.height ?? 0,
    },
  };
}
