import { siteOrigin } from "@/lib/seo";
import { findOrCreateStripeCustomer, getStripe } from "@/lib/stripe/config";

export type CardOnFile = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export async function findStripeCustomerByEmail(
  email: string,
): Promise<string | null> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  return existing.data[0]?.id ?? null;
}

export async function listCustomerCards(
  customerId: string,
): Promise<CardOnFile[]> {
  const stripe = getStripe();
  const list = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 5,
  });
  return list.data.flatMap((pm) => {
    if (!pm.card) return [];
    return [
      {
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      },
    ];
  });
}

async function billingPortalConfigurationId(): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ limit: 1 });
  if (existing.data[0]?.id) return existing.data[0].id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your SolarFlow billing",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["name", "address"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: false },
    },
  });
  return created.id;
}

export async function createBillingPortalUrl(input: {
  email: string;
  userId: string;
  returnPath?: string;
}): Promise<string> {
  const customerId = await findOrCreateStripeCustomer({
    email: input.email,
    userId: input.userId,
  });
  const stripe = getStripe();
  const configuration = await billingPortalConfigurationId();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration,
    return_url: `${siteOrigin()}${input.returnPath ?? "/settings"}`,
  });
  if (!session.url) {
    throw new Error("Stripe did not return a customer portal URL.");
  }
  return session.url;
}
