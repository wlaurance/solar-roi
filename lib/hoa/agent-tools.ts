import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBuildingInsights } from "@/lib/google/solar";
import { systemKwFromPanels } from "@/lib/roi/calculate";
import { extractHoaRequirementsFromDocs } from "@/lib/hoa/parse-with-llm";
import { processHoaDocument } from "@/lib/hoa/process-document";
import type { HoaApplicationPayload } from "@/lib/hoa/types";
import type { Project } from "@/lib/types";

export type HoaAgentContext = {
  userId: string;
  project: Project;
};

export function createHoaAgentTools(ctx: HoaAgentContext) {
  const projectId = ctx.project.id;

  return {
    listHoaDocuments: tool({
      description:
        "List HOA documents uploaded for this project (rules, examples, templates) and their parse status.",
      inputSchema: z.object({}),
      execute: async () => {
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("hoa_documents")
          .select(
            "id, kind, original_filename, status, extracted_summary, error_message, created_at, processed_at",
          )
          .eq("project_id", projectId)
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false });
        if (error) return { ok: false, error: error.message };
        return { ok: true, documents: data ?? [] };
      },
    }),

    parseHoaDocument: tool({
      description:
        "Parse (or re-parse) an uploaded HOA document by id to extract solar-relevant rules.",
      inputSchema: z.object({
        documentId: z.string().uuid(),
      }),
      execute: async ({ documentId }) => {
        const admin = createAdminClient();
        const { data: doc } = await admin
          .from("hoa_documents")
          .select("id, user_id, project_id, status")
          .eq("id", documentId)
          .eq("project_id", projectId)
          .eq("user_id", ctx.userId)
          .maybeSingle();
        if (!doc) return { ok: false, error: "Document not found on this project" };

        // Reset to queued if already completed so processHoaDocument can claim
        if (doc.status === "completed" || doc.status === "failed") {
          await admin
            .from("hoa_documents")
            .update({ status: "queued", error_message: null })
            .eq("id", documentId);
        } else if (doc.status === "processing") {
          return { ok: false, error: "Document is already processing" };
        }

        await processHoaDocument(documentId);
        const { data: updated } = await admin
          .from("hoa_documents")
          .select(
            "id, status, extracted_summary, parsed, error_message, processed_at",
          )
          .eq("id", documentId)
          .maybeSingle();
        return { ok: true, document: updated };
      },
    }),

    extractHoaRequirements: tool({
      description:
        "Consolidate parsed HOA documents into a structured requirements checklist stored on the project.",
      inputSchema: z.object({}),
      execute: async () => {
        const admin = createAdminClient();
        const { data: docs, error } = await admin
          .from("hoa_documents")
          .select("id, kind, original_filename, extracted_summary, parsed, status")
          .eq("project_id", projectId)
          .eq("user_id", ctx.userId);
        if (error) return { ok: false, error: error.message };

        const completed = (docs ?? []).filter((d) => d.status === "completed");
        if (!completed.length) {
          return {
            ok: false,
            error:
              "No completed HOA documents yet. Ask the user to upload CC&Rs / guidelines, or parse queued files first.",
          };
        }

        const address = [
          ctx.project.address,
          ctx.project.city,
          ctx.project.state,
          ctx.project.zip,
        ]
          .filter(Boolean)
          .join(", ");

        const { payload } = await extractHoaRequirementsFromDocs({
          address,
          documentSummaries: completed.map((d) => ({
            id: d.id,
            kind: d.kind,
            filename: d.original_filename,
            summary: d.extracted_summary,
            parsed: d.parsed,
          })),
        });

        const { error: upErr } = await admin
          .from("projects")
          .update({
            hoa_requirements: payload,
            hoa_package_status: "drafting",
          })
          .eq("id", projectId)
          .eq("user_id", ctx.userId);
        if (upErr) return { ok: false, error: upErr.message };

        return { ok: true, requirements: payload };
      },
    }),

    getSolarMapForProject: tool({
      description:
        "Fetch Google Solar building insights / roof solar map for the project address (lat/lng). Summarizes panel configs and max array size for the HOA packet.",
      inputSchema: z.object({
        refresh: z
          .boolean()
          .optional()
          .describe("If true, refetch from Google even when cached on the project"),
      }),
      execute: async ({ refresh }) => {
        const admin = createAdminClient();
        let insights = ctx.project.solar_insights;
        const lat = ctx.project.lat;
        const lng = ctx.project.lng;

        if ((!insights || refresh) && lat != null && lng != null) {
          insights = await fetchBuildingInsights(lat, lng);
          await admin
            .from("projects")
            .update({ solar_insights: insights })
            .eq("id", projectId)
            .eq("user_id", ctx.userId);
        }

        if (!insights) {
          return {
            ok: false,
            error:
              lat == null || lng == null
                ? "Project is missing lat/lng. Ask the user to confirm the address on the project."
                : "No solar insights available for this location.",
          };
        }

        const configs = insights.solarPotential?.solarPanelConfigs ?? [];
        const watts = insights.solarPotential?.panelCapacityWatts ?? 400;
        const idx = Math.min(
          Math.max(ctx.project.selected_panel_config_index ?? 0, 0),
          Math.max(configs.length - 1, 0),
        );
        const selected = configs[idx];
        const systemKw = selected?.panelsCount
          ? systemKwFromPanels(selected.panelsCount, watts)
          : ctx.project.system_kw_base;

        return {
          ok: true,
          address: ctx.project.address,
          lat,
          lng,
          maxArrayUnits: insights.solarPotential?.maxArrayPanelsCount ?? null,
          maxSunshineHoursPerYear:
            insights.solarPotential?.maxSunshineHoursPerYear ?? null,
          selectedConfigIndex: idx,
          selectedPanels: selected?.panelsCount ?? null,
          systemKw,
          panelCapacityWatts: watts,
          imageryDate: insights.imageryDate ?? null,
          note: "Use these figures in the HOA application roof/system description. The interactive roof map lives on the Roof Designer page.",
        };
      },
    }),

    getProjectHoaState: tool({
      description:
        "Read current HOA package status, unlocked flag, stored requirements, and application draft.",
      inputSchema: z.object({}),
      execute: async () => {
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("projects")
          .select(
            "hoa_package_unlocked_at, hoa_package_status, hoa_requirements, hoa_application, address, city, state, zip, system_kw_base",
          )
          .eq("id", projectId)
          .eq("user_id", ctx.userId)
          .maybeSingle();
        if (error) return { ok: false, error: error.message };
        return { ok: true, project: data };
      },
    }),

    fillHoaApplication: tool({
      description:
        "Draft or update the HOA architectural application fields and cover letter using project + requirements data.",
      inputSchema: z.object({
        title: z.string().default("Architectural Application — Rooftop Solar"),
        coverLetter: z.string().optional(),
        checklist: z.array(z.string()).optional(),
        fields: z
          .array(
            z.object({
              key: z.string(),
              label: z.string(),
              value: z.string(),
              source: z.enum(["project", "user", "agent", "document"]),
              confidence: z.enum(["high", "medium", "low"]),
            }),
          )
          .min(1),
        markReady: z.boolean().optional(),
      }),
      execute: async (input) => {
        const admin = createAdminClient();
        const application: HoaApplicationPayload = {
          title: input.title,
          status: input.markReady ? "ready" : "draft",
          fields: input.fields,
          coverLetter: input.coverLetter,
          checklist: input.checklist,
          updatedAt: new Date().toISOString(),
        };

        const { error } = await admin
          .from("projects")
          .update({
            hoa_application: application,
            hoa_package_status: input.markReady ? "ready" : "drafting",
          })
          .eq("id", projectId)
          .eq("user_id", ctx.userId);
        if (error) return { ok: false, error: error.message };
        return { ok: true, application };
      },
    }),

    askUserQuestion: tool({
      description:
        "Ask the homeowner a clarifying question when information is missing (HOA name, fee amount, neighbor notice, preferred hearing date, etc.). Prefer this over guessing.",
      inputSchema: z.object({
        question: z.string().min(5),
        choices: z
          .array(z.string())
          .max(6)
          .optional()
          .describe("Optional short multiple-choice options"),
        reason: z
          .string()
          .optional()
          .describe("Why this answer is needed for the packet"),
      }),
      execute: async ({ question, choices, reason }) => {
        const admin = createAdminClient();
        await admin
          .from("projects")
          .update({ hoa_package_status: "awaiting_user" })
          .eq("id", projectId)
          .eq("user_id", ctx.userId);

        return {
          ok: true,
          status: "awaiting_user_reply" as const,
          question,
          choices: choices ?? [],
          reason: reason ?? null,
          instruction:
            "Stop and wait for the homeowner’s next chat message answering this question.",
        };
      },
    }),
  };
}

export type HoaAgentTools = ReturnType<typeof createHoaAgentTools>;
