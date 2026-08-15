import Stripe from "stripe";
import {
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
  formatHoaPackagePrice,
} from "@/lib/stripe/pricing";

export {
  HOA_PACKAGE_AMOUNT_CENTS,
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
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
