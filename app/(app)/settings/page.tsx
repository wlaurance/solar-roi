import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { BillingCard } from "@/components/settings/billing-card";
import {
  findStripeCustomerByEmail,
  listCustomerCards,
} from "@/lib/stripe/billing";
import { isStripeEnabled } from "@/lib/stripe/config";

export default async function SettingsProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  let cards: Awaited<ReturnType<typeof listCustomerCards>> = [];
  if (isStripeEnabled() && user.email) {
    try {
      const customerId = await findStripeCustomerByEmail(user.email);
      if (customerId) {
        cards = await listCustomerCards(customerId);
      }
    } catch {
      cards = [];
    }
  }

  return (
    <div className="space-y-6">
      <ProfileForm email={user.email ?? ""} initialName={fullName} />
      <BillingCard cards={cards} stripeEnabled={isStripeEnabled()} />
    </div>
  );
}
