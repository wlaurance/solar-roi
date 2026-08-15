import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStripe,
  isStripeEnabled,
  findOrCreateStripeCustomer,
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
  HOA_PACKAGE_TAX_CODE,
} from "@/lib/stripe/config";
import { siteOrigin } from "@/lib/seo";
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

  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
  } | null;
  const projectId = body?.projectId?.trim();
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, hoa_package_unlocked_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.hoa_package_unlocked_at) {
    return NextResponse.json({
      alreadyUnlocked: true,
      url: `${siteOrigin()}/projects/${projectId}/hoa`,
    });
  }

  const stripe = getStripe();
  const origin = siteOrigin();
  const customerId = user.email
    ? await findOrCreateStripeCustomer({
        email: user.email,
        userId: user.id,
      })
    : undefined;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    allow_promotion_codes: true,
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email ?? undefined }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: HOA_PACKAGE_AMOUNT_CENTS,
          product_data: {
            name: HOA_PACKAGE_PRODUCT_NAME,
            description:
              "Upload HOA docs and unlock Solar bot tools for one project’s approval packet.",
            tax_code: HOA_PACKAGE_TAX_CODE,
          },
        },
      },
    ],
    success_url: `${origin}/projects/${projectId}/hoa?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/projects/${projectId}/hoa?checkout=cancelled`,
    metadata: {
      project_id: projectId,
      user_id: user.id,
      product_code: HOA_PACKAGE_PRODUCT_CODE,
    },
    payment_intent_data: {
      metadata: {
        project_id: projectId,
        user_id: user.id,
        product_code: HOA_PACKAGE_PRODUCT_CODE,
      },
    },
  });

  const admin = createAdminClient();
  await admin.from("project_payments").insert({
    user_id: user.id,
    project_id: projectId,
    product_code: HOA_PACKAGE_PRODUCT_CODE,
    amount_cents: HOA_PACKAGE_AMOUNT_CENTS,
    currency: "usd",
    status: "pending",
    stripe_checkout_session_id: session.id,
  });

  captureServerEvent({
    distinctId: distinctIdFromRequest(request, user.id),
    event: "hoa_checkout_started",
    properties: { project_id: projectId, amount_cents: HOA_PACKAGE_AMOUNT_CENTS },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
