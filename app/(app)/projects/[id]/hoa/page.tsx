import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { HoaPackageView } from "@/components/hoa/hoa-package-view";
import { isStripeEnabled } from "@/lib/stripe/config";

export default async function HoaPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-muted">Loading…</div>}>
      <HoaPackageView
        project={project as Project}
        stripeEnabled={isStripeEnabled()}
      />
    </Suspense>
  );
}
