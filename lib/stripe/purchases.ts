import {
  HOA_PACKAGE_PRODUCT_CODE,
  HOA_PACKAGE_PRODUCT_NAME,
} from "@/lib/stripe/pricing";

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded";

export type PurchaseProject = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
};

export type Purchase = {
  id: string;
  productCode: string;
  productName: string;
  amountCents: number;
  currency: string;
  status: PurchaseStatus;
  paidAt: string | null;
  createdAt: string;
  project: PurchaseProject | null;
  href: string | null;
};

const PRODUCT_NAMES: Record<string, string> = {
  [HOA_PACKAGE_PRODUCT_CODE]: HOA_PACKAGE_PRODUCT_NAME,
};

export function productNameForCode(productCode: string): string {
  return PRODUCT_NAMES[productCode] ?? productCode;
}

export function purchaseHref(input: {
  productCode: string;
  projectId: string | null;
}): string | null {
  if (!input.projectId) return null;
  if (input.productCode === HOA_PACKAGE_PRODUCT_CODE) {
    return `/projects/${input.projectId}/hoa`;
  }
  return `/projects/${input.projectId}/dashboard`;
}

export function formatMoneyCents(
  amountCents: number,
  currency = "usd",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function formatCardBrand(brand: string): string {
  const known: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return known[brand.toLowerCase()] ?? brand;
}

export function formatCardExpiry(expMonth: number, expYear: number): string {
  return `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`;
}

export function projectLocationLine(project: PurchaseProject): string {
  return [project.address, project.city, project.state]
    .filter((part) => Boolean(part?.trim()))
    .join(", ");
}
