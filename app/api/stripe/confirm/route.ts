import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unlockHoaPackage } from "@/lib/hoa/unlock";
import {
  getStripe,
  isStripeEnabled,
  HOA_PACKAGE_PRODUCT_CODE,
} from "@/lib/stripe/config";

/**
 * Confirm Checkout success when webhooks are slow/unavailable (local/dev).
 * Verifies the session with Stripe, then unlocks the project.
 */
export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe disabled" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
  } | null;
  const sessionId = body?.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
  }

  const projectId = session.metadata?.project_id;
  if (!projectId) {
    return NextResponse.json({ error: "Missing project" }, { status: 400 });
  }

  if (
    session.payment_status !== "paid" &&
    session.status !== "complete"
  ) {
    return NextResponse.json(
      { error: "Payment not completed", status: session.payment_status },
      { status: 402 },
    );
  }

  if (
    session.metadata?.product_code &&
    session.metadata.product_code !== HOA_PACKAGE_PRODUCT_CODE
  ) {
    return NextResponse.json({ error: "Wrong product" }, { status: 400 });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await unlockHoaPackage({
    userId: user.id,
    projectId,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountCents:
      typeof session.amount_total === "number"
        ? session.amount_total
        : undefined,
  });

  return NextResponse.json({ unlocked: true, projectId });
}
