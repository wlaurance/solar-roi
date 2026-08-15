import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalUrl } from "@/lib/stripe/billing";
import { isStripeEnabled } from "@/lib/stripe/config";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: "Payments are not available in this environment." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Your account needs an email to open billing." },
      { status: 400 },
    );
  }

  try {
    const url = await createBillingPortalUrl({
      email: user.email,
      userId: user.id,
    });
    captureServerEvent({
      distinctId: distinctIdFromRequest(request, user.id),
      event: "billing_portal_opened",
    });
    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open the Stripe portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
