import { NextResponse } from "next/server";
import { removeBackground } from "@imgly/background-removal-node";
import {
  ImageValidationError,
  bufferToBase64,
  fileToBuffer,
  getFilenameWithSuffix,
} from "@/lib/image";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image upload" }, { status: 400 });
    }

    const buffer = await fileToBuffer(file);

    const result = await removeBackground({
      input: buffer,
      mimeType: file.type || "image/png",
    });

    const outputBuffer = Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
    const filename = getFilenameWithSuffix(file.name, "background-removed", "png");

    return NextResponse.json({
      filename,
      mimeType: "image/png",
      data: bufferToBase64(outputBuffer),
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Background removal failed", error);
    return NextResponse.json({ error: "Failed to remove background" }, { status: 500 });
  }
}
