import { generateObject } from "ai";
import { z } from "zod";
import { getLookupModel } from "@/lib/llm/client";
import type { GeoPageContent, LocationRecord } from "@/lib/locations/types";
import { locationDisplayName } from "@/lib/locations/catalog";

const geoPageSchema = z.object({
  headline: z
    .string()
    .describe("SEO-friendly H1-style headline mentioning solar and the place"),
  summary: z
    .string()
    .describe("2-3 sentence intro for homeowners considering rooftop solar here"),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string().describe("120-220 words, practical and specific"),
      }),
    )
    .min(3)
    .max(5),
  faqs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().describe("2-4 sentences"),
      }),
    )
    .min(4)
    .max(6),
});

export async function generateGeoPageContent(
  location: LocationRecord,
): Promise<GeoPageContent> {
  const { model, route } = getLookupModel();
  const place = locationDisplayName(location);
  const kindLabel = location.type === "county" ? "U.S. county" : "U.S. city";

  const { object } = await generateObject({
    model,
    schema: geoPageSchema,
    temperature: 0.35,
    prompt: `Write helpful, accurate rooftop solar guidance for a homeowner in ${place} (${kindLabel}, approx. population ${location.population.toLocaleString("en-US")}).

Audience: people searching "solar in ${location.name} ${location.state}" or similar.

Include sections such as: why solar here (climate / rates / housing stock at a high level), permitting & interconnection overview, incentives to look for, and how to evaluate installers. Do not invent specific dollar rebate amounts or obscure ordinance numbers — stay general when unsure and point readers to official .gov / utility sources.

Tone: confident, clear, not salesy. No markdown fences.`,
  });

  return {
    ...object,
    model: route.modelId,
    provider: route.provider,
    generatedAt: new Date().toISOString(),
  };
}
