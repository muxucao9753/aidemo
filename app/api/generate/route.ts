import { NextResponse } from "next/server";
import { getHfClient } from "@/lib/hf";

export const runtime = "nodejs";

const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

function parsePositivePrompt(entry: FormDataEntryValue | null): string {
  if (typeof entry !== "string" || entry.trim().length === 0) {
    throw new Error("Prompt is required");
  }
  return entry;
}

function parseNegativePrompt(entry: FormDataEntryValue | null): string | undefined {
  if (typeof entry !== "string" || entry.trim().length === 0) {
    return undefined;
  }
  return entry;
}

function parseSteps(entry: FormDataEntryValue | null): number | undefined {
  if (typeof entry !== "string") {
    return undefined;
  }
  const value = Number.parseInt(entry, 10);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, 10), 50);
}

function parseGuidance(entry: FormDataEntryValue | null): number | undefined {
  if (typeof entry !== "string") {
    return undefined;
  }
  const value = Number.parseFloat(entry);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, 1), 20);
}

function parseSeed(entry: FormDataEntryValue | null): number | undefined {
  if (typeof entry !== "string") {
    return undefined;
  }
  const value = Number.parseInt(entry, 10);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return value;
}

function parseModel(entry: FormDataEntryValue | null): string {
  if (typeof entry !== "string" || entry.trim().length === 0) {
    return DEFAULT_MODEL;
  }
  return entry;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const prompt = parsePositivePrompt(formData.get("prompt"));
    const negativePrompt = parseNegativePrompt(formData.get("negativePrompt"));
    const steps = parseSteps(formData.get("steps"));
    const guidance = parseGuidance(formData.get("guidance"));
    const seed = parseSeed(formData.get("seed"));
    const model = parseModel(formData.get("model"));

    const client = getHfClient();
    const response = await client.textToImage({
      model,
      input: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        num_inference_steps: steps,
        guidance_scale: guidance,
        seed,
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=generated.png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Image generation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate image" }, { status: 500 });
  }
}
