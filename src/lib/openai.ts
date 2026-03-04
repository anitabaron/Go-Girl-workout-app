import OpenAI from "openai";
import { ServiceError } from "@/lib/service-utils";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ServiceError(
      "INTERNAL",
      "Brak konfiguracji OPENAI_API_KEY po stronie serwera.",
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}
