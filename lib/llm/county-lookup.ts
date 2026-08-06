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

export const countyPermitStepSchema = z.object({
  title: z.string().describe("Checklist step title"),
  body: z
    .string()
    .describe("2-4 sentences explaining what to do for this locality"),
  linkUrl: z
    .string()
    .url()
    .nullable()
    .describe("Optional official URL for this step, or null"),
  linkLabel: z.string().nullable().describe("Link label, or null"),
});

export const countyLookupSchema = z.object({
  countyName: z.string(),
  state: z.string(),
  summary: z
    .string()
    .describe("2-3 sentences on how residential rooftop solar permitting works here"),
  steps: z
    .array(countyPermitStepSchema)
    .min(4)
    .max(10)
    .describe("Ordered permitting checklist for this property's locality"),
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

Produce:
A) An ordered permitting CHECKLIST (steps) tailored to this county/city — e.g. building permit / expedited solar, structural/electrical plans, fire setbacks, utility interconnection / PTO, inspection. Be specific to the locality when possible.
B) Official (or highly authoritative) LINKS for building/solar permitting, planning, fire, utility interconnection, and incentives.

Rules:
- Prefer .gov / .ca.gov / official utility portals.
- Every URL must be a real, commonly known official site pattern — do not invent deep paths you are unsure about; prefer known homepages / solar landing pages.
- If the city has its own building department separate from the county, cover both in steps and links.
- Keep content practical for a residential NEM / net billing solar + battery project.`,
  });

  return {
    ...object,
    model: route.modelId,
    provider: route.provider,
    lookedUpAt: new Date().toISOString(),
  };
}
