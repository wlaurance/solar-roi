import Stripe from "stripe";
import {
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
  HOA_PACKAGE_TAX_CODE,
  formatHoaPackagePrice,
} from "@/lib/stripe/pricing";

export {
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
  HOA_PACKAGE_TAX_CODE,
  formatHoaPackagePrice,
};

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

/** Reuse the Stripe Customer for this email so customer-locked promo codes apply. */
export async function findOrCreateStripeCustomer(input: {
  email: string;
  userId: string;
}): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({
    email: input.email,
    limit: 1,
  });
  if (existing.data[0]?.id) return existing.data[0].id;

  const created = await stripe.customers.create({
    email: input.email,
    metadata: { user_id: input.userId },
  });
  return created.id;
}
