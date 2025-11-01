const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  if (!file) {
    throw new ImageValidationError("Missing image file upload");
  }

  if (file.size === 0) {
    throw new ImageValidationError("Uploaded file is empty");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Image exceeds 15MB limit");
  }

  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function inferMimeType(format?: string | null): string {
  switch (format) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export function getFilenameWithSuffix(originalName: string | undefined, suffix: string, extension?: string): string {
  const base = originalName ? originalName.replace(/\.[^.]+$/, "") : "image";
  const ext = extension ? `.${extension}` : "";
  return `${base}-${suffix}${ext}`;
}
