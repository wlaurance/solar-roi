import { generateObject } from "ai";
import { z } from "zod";
import { getLookupModel } from "@/lib/llm/client";

const hoaDocParseSchema = z.object({
  summary: z
    .string()
    .describe("2-4 sentence summary of what this HOA document covers for solar"),
  documentType: z.enum([
    "ccrs",
    "design_guidelines",
    "application_form",
    "example_packet",
    "other",
  ]),
  solarRelevantSections: z
    .array(
      z.object({
        heading: z.string(),
        excerpt: z.string(),
        implication: z.string(),
      }),
    )
    .max(20),
  requiredAttachments: z.array(z.string()).max(30),
  feesMentioned: z.array(z.string()).max(10),
  timelineNotes: z.array(z.string()).max(10),
  openQuestions: z.array(z.string()).max(10),
});

export type HoaDocParseResult = z.infer<typeof hoaDocParseSchema>;

export async function parseHoaDocumentText(input: {
  filename: string;
  kind: string;
  text: string;
}): Promise<{
  parsed: HoaDocParseResult;
  summary: string;
  model: string;
  provider: string;
}> {
  const { model, route } = getLookupModel();
  const clipped = input.text.slice(0, 120_000);

  const { object } = await generateObject({
    model,
    schema: hoaDocParseSchema,
    temperature: 0.2,
    prompt: `You extract HOA solar approval requirements from homeowner association documents.

Document kind (user-labeled): ${input.kind}
Filename: ${input.filename}

Focus on architectural review, aesthetics, placement, fees, forms, neighbor notice, and anything that would block rooftop solar.

Document text:
---
${clipped}
---`,
  });

  return {
    parsed: object,
    summary: object.summary,
    model: route.modelId,
    provider: route.provider,
  };
}

const requirementsSchema = z.object({
  summary: z.string(),
  requirements: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        detail: z.string(),
        category: z.enum([
          "aesthetic",
          "placement",
          "structural",
          "application",
          "neighbor",
          "fee",
          "other",
        ]),
        mandatory: z.boolean(),
      }),
    )
    .max(40),
});

export async function extractHoaRequirementsFromDocs(input: {
  address: string;
  documentSummaries: Array<{
    id: string;
    kind: string;
    filename: string;
    summary: string | null;
    parsed: unknown;
  }>;
}): Promise<{
  payload: z.infer<typeof requirementsSchema> & {
    extractedAt: string;
    model: string;
    provider: string;
  };
}> {
  const { model, route } = getLookupModel();
  const docsJson = JSON.stringify(input.documentSummaries).slice(0, 100_000);

  const { object } = await generateObject({
    model,
    schema: requirementsSchema,
    temperature: 0.2,
    prompt: `Create a consolidated checklist of HOA requirements for rooftop solar at:
${input.address}

Use stable ids like "req-1". Prefer concrete, actionable requirements.

Parsed documents JSON:
${docsJson}`,
  });

  return {
    payload: {
      ...object,
      extractedAt: new Date().toISOString(),
      model: route.modelId,
      provider: route.provider,
    },
  };
}
