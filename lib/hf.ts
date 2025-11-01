import { HfInference } from "@huggingface/inference";

let cachedClient: HfInference | null = null;

function ensureApiKey(): string {
  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGING_FACE_API_KEY environment variable is missing");
  }
  return apiKey;
}

export function getHfClient(): HfInference {
  if (!cachedClient) {
    cachedClient = new HfInference(ensureApiKey());
  }
  return cachedClient;
}
