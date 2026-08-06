import { generateObject } from "ai";
import { z } from "zod";
import { getLookupModel } from "@/lib/llm/client";

export const countyLinkSchema = z.object({
  title: z.string().describe("Short link title"),
  url: z.string().url().describe("Official HTTPS URL"),
  description: z
    .string()
    .describe("One sentence on why this link helps a residential solar project"),
  category: z.enum([
    "building_permit",
    "planning",
    "fire",
    "utility_interconnection",
    "incentives",
    "other",
  ]),
});

export const countyLookupSchema = z.object({
  countyName: z.string(),
  state: z.string(),
  summary: z
    .string()
    .describe("2-3 sentences on how residential rooftop solar permitting works here"),
  links: z.array(countyLinkSchema).min(2).max(10),
});

export type CountyLookupResult = z.infer<typeof countyLookupSchema> & {
  model: string;
  provider: string;
  lookedUpAt: string;
};

export async function lookupCountySolarResources(input: {
  county: string;
  state: string;
  city?: string | null;
  address?: string | null;
}): Promise<CountyLookupResult> {
  const { model, route } = getLookupModel();

  const { object } = await generateObject({
    model,
    schema: countyLookupSchema,
    temperature: 0.2,
    prompt: `You are helping a homeowner install rooftop solar in the United States.

Property:
- County: ${input.county}
- State: ${input.state}
${input.city ? `- City: ${input.city}` : ""}
${input.address ? `- Address: ${input.address}` : ""}

Return official (or highly authoritative) web resources for:
1) County or city building / solar permitting
2) Planning / expedited solar if available
3) Fire department rooftop access / setbacks if relevant
4) Electric utility interconnection (infer likely utility, e.g. PG&E in much of Northern CA)
5) State / local incentives (e.g. GoSolarSF, CEC, or IRS ITC overview)

Rules:
- Prefer .gov / .ca.gov / official utility portals.
- Every URL must be a real, commonly known official site pattern — do not invent paths you are unsure about; prefer homepage / solar landing pages that exist.
- Include the county name in titles where useful.
- If the city has its own building department separate from the county, include both.
- Keep summary practical for a residential NEM / net billing solar + battery project.`,
  });

  return {
    ...object,
    model: route.modelId,
    provider: route.provider,
    lookedUpAt: new Date().toISOString(),
  };
}
