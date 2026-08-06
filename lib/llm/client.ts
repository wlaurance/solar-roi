import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/** Default inexpensive model for county / permit resource lookups */
export const DEFAULT_LOOKUP_MODEL = "google/gemini-3.5-flash-lite";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export type LlmRoute = {
  provider: "openrouter" | "google";
  modelId: string;
};

/**
 * Multi-provider model resolver:
 * - Prefer OpenRouter when OPENROUTER_API_KEY is set (routes to Gemini Flash-Lite)
 * - Else use Google AI Studio with GEMINI_API_KEY
 */
export function resolveLookupRoute(): LlmRoute {
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return {
      provider: "openrouter",
      modelId: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_LOOKUP_MODEL,
    };
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    return {
      provider: "google",
      modelId: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    };
  }
  throw new Error(
    "Missing LLM credentials. Set OPENROUTER_API_KEY or GEMINI_API_KEY.",
  );
}

export function getLookupModel(): { model: LanguageModel; route: LlmRoute } {
  const route = resolveLookupRoute();

  if (route.provider === "openrouter") {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "https://solarflow.local",
        "X-Title": "SolarFlow",
      },
    });
    return { model: openrouter(route.modelId), route };
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  return { model: google(route.modelId), route };
}
