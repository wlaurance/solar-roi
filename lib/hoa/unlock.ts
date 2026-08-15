import { createAdminClient } from "@/lib/supabase/admin";
import {
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
} from "@/lib/stripe/pricing";

/** Mark project HOA package unlocked after a successful Stripe payment. */
export async function unlockHoaPackage(input: {
  userId: string;
  projectId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  amountCents?: number;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const amount = input.amountCents ?? HOA_PACKAGE_AMOUNT_CENTS;

  const { data: existing } = await admin
    .from("project_payments")
    .select("id, status")
    .eq("stripe_checkout_session_id", input.checkoutSessionId)
    .maybeSingle();

  if (existing?.status === "paid") {
    await admin
      .from("projects")
      .update({
        hoa_package_unlocked_at: now,
        hoa_package_status: "gathering_docs",
      })
      .eq("id", input.projectId)
      .eq("user_id", input.userId)
      .is("hoa_package_unlocked_at", null);
    return;
  }

  if (existing) {
    await admin
      .from("project_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: input.paymentIntentId ?? null,
        paid_at: now,
        amount_cents: amount,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("project_payments").insert({
      user_id: input.userId,
      project_id: input.projectId,
      product_code: HOA_PACKAGE_PRODUCT_CODE,
      amount_cents: amount,
      currency: "usd",
      status: "paid",
      stripe_checkout_session_id: input.checkoutSessionId,
      stripe_payment_intent_id: input.paymentIntentId ?? null,
      paid_at: now,
    });
  }

  const { error } = await admin
    .from("projects")
    .update({
      hoa_package_unlocked_at: now,
      hoa_package_status: "gathering_docs",
    })
    .eq("id", input.projectId)
    .eq("user_id", input.userId);

  if (error) throw error;
}
