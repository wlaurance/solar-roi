import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projects";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user ?? data.session?.user;
      if (user) {
        await captureServerEvent({
          distinctId: user.id,
          event: "server_auth_callback_succeeded",
          properties: { next },
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    await captureServerEvent({
      distinctId: "anonymous",
      event: "server_auth_callback_failed",
      properties: { error: error.message },
    });
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
