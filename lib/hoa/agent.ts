import {
  ToolLoopAgent,
  stepCountIs,
  hasToolCall,
  createAgentUIStreamResponse,
  type UIMessage,
} from "ai";
import { getLookupModel } from "@/lib/llm/client";
import { createHoaAgentTools, type HoaAgentContext } from "@/lib/hoa/agent-tools";
import { notifyAgentReplyIfAway } from "@/lib/hoa/presence-notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Project } from "@/lib/types";

export function buildHoaAgent(ctx: HoaAgentContext) {
  const { model } = getLookupModel();
  const tools = createHoaAgentTools(ctx);

  const address = [
    ctx.project.address,
    ctx.project.city,
    ctx.project.state,
    ctx.project.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return new ToolLoopAgent({
    model,
    instructions: `You are Solar bot, SolarFlow’s HOA solar approval assistant.

You help the homeowner build a complete HOA architectural review packet for rooftop solar at:
${address || "(address not set)"}

Project name: ${ctx.project.name}
System size baseline: ${ctx.project.system_kw_base} kW

Paid HOA package is unlocked for this project. Use tools to:
1) Inventory and parse uploaded HOA docs (CC&Rs, guidelines, templates, examples)
2) Extract a consolidated requirements checklist
3) Pull the Google Solar map / roof potential for the property
4) Fill the application draft fields and cover letter
5) Ask the user clarifying questions when data is missing (askUserQuestion)

Be concise, practical, and board-friendly. Never invent CC&R citations — extract them from documents or ask.
When you call askUserQuestion, keep your visible reply short and wait for their answer.
After meaningful progress, summarize what was saved on the project.`,
    tools,
    stopWhen: [stepCountIs(12), hasToolCall("askUserQuestion")],
  });
}

function textFromUIMessage(message: UIMessage): string {
  if (!message.parts?.length) return "";
  return message.parts
    .map((part) => {
      if (part.type === "text" && "text" in part) return String(part.text ?? "");
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function streamHoaAgentResponse(input: {
  userId: string;
  project: Project;
  messages: UIMessage[];
}): Promise<Response> {
  const agent = buildHoaAgent({
    userId: input.userId,
    project: input.project,
  });

  const admin = createAdminClient();
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const content = textFromUIMessage(lastUser);
    if (content) {
      await admin.from("hoa_agent_messages").insert({
        user_id: input.userId,
        project_id: input.project.id,
        role: "user",
        content,
        parts: lastUser.parts ?? null,
      });
    }
  }

  return createAgentUIStreamResponse({
    agent,
    uiMessages: input.messages,
    onFinish: async ({ responseMessage }) => {
      const content = textFromUIMessage(responseMessage);
      try {
        await admin.from("hoa_agent_messages").insert({
          user_id: input.userId,
          project_id: input.project.id,
          role: "assistant",
          content: content || "(tool-only reply)",
          parts: responseMessage.parts ?? null,
        });
      } catch (err) {
        console.error("Failed to persist assistant message", err);
      }

      try {
        await notifyAgentReplyIfAway({
          userId: input.userId,
          projectId: input.project.id,
          projectName: input.project.name,
          preview: content,
        });
      } catch (err) {
        console.error("Presence notify failed", err);
      }
    },
  });
}
