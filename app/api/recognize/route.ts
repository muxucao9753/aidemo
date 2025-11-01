import { NextResponse } from "next/server";
import { getHfClient } from "@/lib/hf";
import { ImageValidationError, bufferToBase64, fileToBuffer } from "@/lib/image";

export const runtime = "nodejs";

const DEFAULT_MODEL = "google/vit-base-patch16-224";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const modelEntry = formData.get("model");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image upload" }, { status: 400 });
    }

    const buffer = await fileToBuffer(file);
    const model = typeof modelEntry === "string" && modelEntry.trim().length > 0 ? modelEntry : DEFAULT_MODEL;

    const client = getHfClient();
    const result = await client.imageClassification({
      model,
      data: buffer,
    });

    return NextResponse.json({
      model,
      labels: result.map((item) => ({
        label: item.label,
        score: item.score,
      })),
      preview: bufferToBase64(buffer),
      mimeType: file.type || "image/jpeg",
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Image recognition failed", error);
    return NextResponse.json({ error: "Failed to recognize image" }, { status: 500 });
  }
}
