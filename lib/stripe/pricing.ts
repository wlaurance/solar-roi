/** Shared pricing constants safe for client + server bundles (no Stripe SDK). */

/** One-time HOA approval package price in USD cents ($29.97). */
export const HOA_PACKAGE_AMOUNT_CENTS = 2997;
export const HOA_PACKAGE_PRODUCT_CODE = "hoa_package" as const;
export const HOA_PACKAGE_PRODUCT_NAME = "HOA Solar Approval Package";

export function formatHoaPackagePrice(): string {
  return `$${(HOA_PACKAGE_AMOUNT_CENTS / 100).toFixed(2)}`;
}
