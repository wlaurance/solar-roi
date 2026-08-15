import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    path?: string;
    projectId?: string | null;
    clientId?: string;
  } | null;

  const path =
    typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim()
      ? body.projectId.trim()
      : null;
  const clientId =
    typeof body?.clientId === "string" ? body.clientId.slice(0, 120) : null;

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_presence").upsert(
    {
      user_id: user.id,
      last_seen_at: now,
      updated_at: now,
      last_path: path,
      project_id: projectId,
      client_id: clientId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: now });
}
