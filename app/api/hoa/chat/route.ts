import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { projectHasHoaPackage } from "@/lib/hoa/entitlements";
import { streamHoaAgentResponse } from "@/lib/hoa/agent";
import type { Project } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    messages?: UIMessage[];
  } | null;

  const projectId = body?.projectId?.trim();
  const messages = body?.messages;
  if (!projectId || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "projectId and messages are required" },
      { status: 400 },
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!projectHasHoaPackage(project as Project)) {
    return NextResponse.json(
      { error: "Unlock the HOA package to use Solar bot.", code: "payment_required" },
      { status: 402 },
    );
  }

  // Validate messages can convert (throws on malformed parts)
  try {
    await convertToModelMessages(messages);
  } catch {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  return streamHoaAgentResponse({
    userId: user.id,
    project: project as Project,
    messages,
  });
}
