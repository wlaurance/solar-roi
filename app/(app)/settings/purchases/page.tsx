import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PurchasesList } from "@/components/settings/purchases-list";
import {
  productNameForCode,
  purchaseHref,
  type Purchase,
  type PurchaseProject,
  type PurchaseStatus,
} from "@/lib/stripe/purchases";

export const metadata: Metadata = {
  title: "Purchases",
  robots: { index: false, follow: false },
};

type PaymentRow = {
  id: string;
  product_code: string;
  amount_cents: number;
  currency: string;
  status: PurchaseStatus;
  paid_at: string | null;
  created_at: string;
  project_id: string;
  projects: PurchaseProject | PurchaseProject[] | null;
};

function asProject(
  value: PaymentRow["projects"],
): PurchaseProject | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function SettingsPurchasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("project_payments")
    .select(
      "id, product_code, amount_cents, currency, status, paid_at, created_at, project_id, projects(id, name, address, city, state)",
    )
    .order("created_at", { ascending: false });

  const purchases: Purchase[] = ((data ?? []) as PaymentRow[]).map((row) => {
    const project = asProject(row.projects);
    return {
      id: row.id,
      productCode: row.product_code,
      productName: productNameForCode(row.product_code),
      amountCents: row.amount_cents,
      currency: row.currency,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      project,
      href: purchaseHref({
        productCode: row.product_code,
        projectId: project?.id ?? row.project_id,
      }),
    };
  });

  return <PurchasesList purchases={purchases} />;
}
