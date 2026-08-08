import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processPowerBill } from "@/lib/power-bills/process-bill";

type Params = { params: Promise<{ id: string }> };

function authorized(request: Request, userId: string | null): boolean {
  const header = request.headers.get("authorization");
  const secret =
    process.env.BILL_PROCESS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (secret && header === `Bearer ${secret}`) return true;
  return Boolean(userId);
}

/**
 * Manual / internal processor. Authenticated owners can re-run; service secret
 * can process any bill (used by Netlify background fallbacks).
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!authorized(request, user?.id ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user) {
    const { data: owned } = await supabase
      .from("power_bills")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const secret =
      process.env.BILL_PROCESS_SECRET?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const isService =
      Boolean(secret) &&
      request.headers.get("authorization") === `Bearer ${secret}`;
    if (!owned && !isService) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const bill = await processPowerBill(id);
    return NextResponse.json({ bill });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Processing failed",
      },
      { status: 500 },
    );
  }
}
