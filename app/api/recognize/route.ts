import { NextResponse } from "next/server";
import {
  ImageValidationError,
  bufferToBase64,
  fileToBuffer,
  inferMimeType,
} from "@/lib/image";

export const runtime = "nodejs";

const API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const MODEL_ID = "doubao-1.5-vision-lite-250315";

type VolcengineContent =
  | { type?: string; text?: string }
  | string
  | undefined;

type VolcengineMessage = {
  content?: VolcengineContent[] | string;
};

type VolcengineResponse = {
  choices?: Array<{
    message?: VolcengineMessage;
  }>;
  error?: unknown;
};

function inferMimeTypeFromFile(file: File): string {
  if (file.type && file.type.trim().length > 0) {
    return file.type;
  }

  const extension = file.name?.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "image/jpeg";
  }

  return inferMimeType(extension) || "image/jpeg";
}

function extractTextFromResponse(payload: VolcengineResponse): string {
  if (!payload || !Array.isArray(payload.choices)) {
    return "";
  }

  for (const choice of payload.choices) {
    const content = choice?.message?.content;
    if (!content) {
      continue;
    }

    if (Array.isArray(content)) {
      const parts = content
        .map((item) =>
          typeof item === "string"
            ? item.trim()
            : item?.type === "text" && typeof item.text === "string"
            ? item.text.trim()
            : ""
        )
        .filter((item) => item.length > 0);

      if (parts.length > 0) {
        return parts.join("\n");
      }
    }

    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim();
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      console.error("Missing ARK_API_KEY environment variable");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image upload" }, { status: 400 });
    }

    const buffer = await fileToBuffer(file);
    const base64 = bufferToBase64(buffer);
    const mimeType = inferMimeTypeFromFile(file);

    const payload = {
      model: MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "识别图片",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as VolcengineResponse | null;
      const message =
        (Array.isArray(errorPayload?.choices) && errorPayload?.choices?.[0]?.message?.content?.toString()) ||
        (typeof errorPayload?.error === "string" ? errorPayload.error : undefined) ||
        response.statusText ||
        "Volcengine API request failed";
      throw new Error(message);
    }

    const data = (await response.json()) as VolcengineResponse;
    const resultText = extractTextFromResponse(data);

    return NextResponse.json({
      result: resultText || "",
      preview: base64,
      mimeType,
      raw: data,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Image recognition failed", error);
    const message = error instanceof Error ? error.message : "Failed to recognize image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
