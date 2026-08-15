import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  isStripeEnabled,
  stripeWebhookSecret,
  HOA_PACKAGE_PRODUCT_CODE,
} from "@/lib/stripe/config";
import { unlockHoaPackage } from "@/lib/hoa/unlock";
import {
  captureServerEvent,
} from "@/lib/posthog-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe disabled" }, { status: 503 });
  }

  const secret = stripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.project_id;
    const userId = session.metadata?.user_id;
    const product = session.metadata?.product_code ?? HOA_PACKAGE_PRODUCT_CODE;

    if (projectId && userId && product === HOA_PACKAGE_PRODUCT_CODE) {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      await unlockHoaPackage({
        userId,
        projectId,
        checkoutSessionId: session.id,
        paymentIntentId,
        amountCents:
          typeof session.amount_total === "number"
            ? session.amount_total
            : undefined,
      });

      captureServerEvent({
        distinctId: userId,
        event: "hoa_package_unlocked",
        properties: {
          project_id: projectId,
          checkout_session_id: session.id,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
