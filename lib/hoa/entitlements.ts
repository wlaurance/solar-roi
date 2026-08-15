import type { Project } from "@/lib/types";
import { isStripeEnabled } from "@/lib/stripe/config";

/** Paid HOA features are available when Stripe is configured and the project is unlocked. */
export function projectHasHoaPackage(project: Pick<Project, "hoa_package_unlocked_at">): boolean {
  if (!isStripeEnabled()) return false;
  return Boolean(project.hoa_package_unlocked_at);
}

/** Marketing / checkout CTAs only when Stripe keys exist. */
export function hoaCommerceAvailable(): boolean {
  return isStripeEnabled();
}
