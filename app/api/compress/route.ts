import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  ImageValidationError,
  bufferToBase64,
  fileToBuffer,
  getFilenameWithSuffix,
  inferMimeType,
} from "@/lib/image";

export const runtime = "nodejs";

const SUPPORTED_FORMATS = ["jpeg", "png", "webp", "avif"] as const;
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

function parseFormat(entry: FormDataEntryValue | null): SupportedFormat {
  if (typeof entry !== "string") {
    return "jpeg";
  }

  const normalized = entry.toLowerCase();
  if ((SUPPORTED_FORMATS as readonly string[]).includes(normalized)) {
    return normalized as SupportedFormat;
  }

  return "jpeg";
}

function parseQuality(entry: FormDataEntryValue | null, format: SupportedFormat): number | undefined {
  if (typeof entry !== "string") {
    return format === "jpeg" ? 80 : undefined;
  }

  const value = Number.parseInt(entry, 10);
  if (Number.isNaN(value)) {
    return format === "jpeg" ? 80 : undefined;
  }

  return Math.min(Math.max(value, 40), 95);
}

function parseDimension(entry: FormDataEntryValue | null): number | undefined {
  if (typeof entry !== "string") {
    return undefined;
  }

  const value = Number.parseInt(entry, 10);
  if (Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image upload" }, { status: 400 });
    }

    const buffer = await fileToBuffer(file);
    const format = parseFormat(formData.get("format"));
    const quality = parseQuality(formData.get("quality"), format);
    const width = parseDimension(formData.get("width"));
    const height = parseDimension(formData.get("height"));

    let transformer = sharp(buffer, { failOnError: false });

    if (width || height) {
      transformer = transformer.resize({
        width: width ?? undefined,
        height: height ?? undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    switch (format) {
      case "jpeg":
        transformer = transformer.jpeg({
          quality: quality ?? 80,
          mozjpeg: true,
        });
        break;
      case "png":
        transformer = transformer.png({ compressionLevel: 9 });
        break;
      case "webp":
        transformer = transformer.webp({ quality: quality ?? 80 });
        break;
      case "avif":
        transformer = transformer.avif({ quality: quality ?? 45 });
        break;
      default:
        break;
    }

    const outputBuffer = await transformer.toBuffer();
    const mimeType = inferMimeType(format);
    const filename = getFilenameWithSuffix(
      file.name,
      "compressed",
      format === "jpeg" ? "jpg" : format
    );

    return NextResponse.json({
      filename,
      mimeType,
      data: bufferToBase64(outputBuffer),
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Image compression failed", error);
    return NextResponse.json({ error: "Failed to compress image" }, { status: 500 });
  }
}
