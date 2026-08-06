import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";

type Body = { enabled?: boolean };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const enabled = body.enabled !== false;

  const { data: existing, error: loadError } = await supabase
    .from("projects")
    .select("id, share_token, share_enabled")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = existing.share_token ?? crypto.randomUUID();
  const { data, error } = await supabase
    .from("projects")
    .update({
      share_token: token,
      share_enabled: enabled,
      share_enabled_at: enabled ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("share_token, share_enabled, share_enabled_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    try {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: "server_project_share_toggled",
        properties: { project_id: id, enabled },
      });
      await posthog.shutdown();
    } catch {
      // analytics best-effort
    }
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;

  return NextResponse.json({
    share_token: data.share_token,
    share_enabled: data.share_enabled,
    share_enabled_at: data.share_enabled_at,
    share_url: data.share_enabled
      ? `${origin}/r/${data.share_token}`
      : null,
  });
}
