import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOOKUP_MODEL,
  type LlmRoute,
} from "@/lib/llm/client";
import type { PowerBillParsed, RegexCandidates } from "@/lib/power-bills/types";
import { formatCandidatesForPrompt } from "@/lib/power-bills/regex-prep";

/** Prefer full Flash for bill OCR/structure accuracy (override via env). */
export const DEFAULT_BILL_MODEL_OPENROUTER = "google/gemini-3.5-flash";
export const DEFAULT_BILL_MODEL_GOOGLE = "gemini-3.5-flash";

export const powerBillParsedSchema = z.object({
  utilityName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  customerName: z.string().nullable(),
  serviceAddress: z.string().nullable(),
  serviceCity: z.string().nullable(),
  serviceState: z.string().nullable(),
  serviceZip: z.string().nullable(),
  billingPeriodStart: z
    .string()
    .nullable()
    .describe("ISO date YYYY-MM-DD when possible"),
  billingPeriodEnd: z.string().nullable(),
  dueDate: z.string().nullable(),
  amountDueUsd: z.number().nullable().describe("Total amount due in USD"),
  totalKwh: z
    .number()
    .nullable()
    .describe("Total kWh for the billing period"),
  peakKwh: z.number().nullable(),
  rateSchedule: z.string().nullable(),
  blendedRateUsdPerKwh: z
    .number()
    .nullable()
    .describe("amountDueUsd / totalKwh when both known, else printed rate"),
  previousBalanceUsd: z.number().nullable(),
  notes: z
    .string()
    .nullable()
    .describe("Short caveat if fields are ambiguous"),
  confidence: z.number().min(0).max(1),
});

function resolveBillRoute(): LlmRoute {
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return {
      provider: "openrouter",
      modelId:
        process.env.OPENROUTER_BILL_MODEL?.trim() ||
        process.env.OPENROUTER_MODEL?.trim() ||
        DEFAULT_BILL_MODEL_OPENROUTER ||
        DEFAULT_LOOKUP_MODEL,
    };
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    return {
      provider: "google",
      modelId:
        process.env.GEMINI_BILL_MODEL?.trim() ||
        process.env.GEMINI_MODEL?.trim() ||
        DEFAULT_BILL_MODEL_GOOGLE ||
        DEFAULT_GEMINI_MODEL,
    };
  }
  throw new Error(
    "Missing LLM credentials. Set OPENROUTER_API_KEY or GEMINI_API_KEY.",
  );
}

function getBillModel(): { model: LanguageModel; route: LlmRoute } {
  const route = resolveBillRoute();
  if (route.provider === "openrouter") {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "https://solarflow.app",
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

function truncateHtml(html: string, maxChars = 48_000): string {
  if (html.length <= maxChars) return html;
  return `${html.slice(0, maxChars)}\n<!-- truncated -->`;
}

export async function parseBillWithGemini(input: {
  html: string;
  candidates: RegexCandidates;
  utilitySlug?: string | null;
  utilityNameHint?: string | null;
}): Promise<{ parsed: PowerBillParsed; model: string; provider: string }> {
  const { model, route } = getBillModel();
  const candidateBlock = formatCandidatesForPrompt(input.candidates);

  const { object } = await generateObject({
    model,
    schema: powerBillParsedSchema,
    temperature: 0.1,
    prompt: `You extract structured fields from a residential electric utility bill.

Utility hint slug: ${input.utilitySlug ?? "unknown"}
Utility name hint: ${input.utilityNameHint ?? "unknown"}

Regex pre-extraction candidates (use as hints; verify against the HTML):
${candidateBlock}

Bill HTML (layout-preserving extract from PDF):
${truncateHtml(input.html)}

Rules:
- Prefer labeled values over bare numbers.
- amountDueUsd is the current amount due / total charges for this period when clear.
- totalKwh is period usage in kilowatt-hours (not demand kW).
- Dates should be YYYY-MM-DD when you can normalize them; otherwise null.
- If blendedRateUsdPerKwh is not printed, compute amountDueUsd/totalKwh when both look trustworthy.
- Never invent account numbers or addresses not supported by the text.
- confidence reflects how complete/clear the extract is (0-1).`,
  });

  return {
    parsed: object,
    model: route.modelId,
    provider: route.provider,
  };
}
