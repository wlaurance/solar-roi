/** Shared pricing constants safe for client + server bundles (no Stripe SDK). */

/** One-time HOA approval package price in USD cents ($29.97). */
export const HOA_PACKAGE_AMOUNT_CENTS = 2997;
export const HOA_PACKAGE_PRODUCT_CODE = "hoa_package" as const;
export const HOA_PACKAGE_PRODUCT_NAME = "HOA Solar Approval Package";

/**
 * Stripe tax category for Managed Payments (required when creating inline products).
 * SaaS — personal use: cloud software for homeowners, no download.
 * @see https://docs.stripe.com/tax/tax-codes
 */
export const HOA_PACKAGE_TAX_CODE = "txcd_10103000";

export function formatHoaPackagePrice(): string {
  return `$${(HOA_PACKAGE_AMOUNT_CENTS / 100).toFixed(2)}`;
}
