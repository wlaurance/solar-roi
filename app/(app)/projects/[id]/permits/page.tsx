import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermitJurisdictionWithSteps } from "@/lib/types";
import { PermitsView } from "@/components/permits/permits-view";

export default async function PermitsPage({
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
    .select("id, name, city")
    .eq("id", id)
    .maybeSingle();

  if (!project) redirect("/projects");

  const { data: jurisdictions } = await supabase
    .from("permit_jurisdictions")
    .select("*, permit_steps(*)")
    .order("name");

  const normalized = ((jurisdictions ?? []) as PermitJurisdictionWithSteps[]).map(
    (j) => ({
      ...j,
      permit_steps: [...(j.permit_steps ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    }),
  );

  return (
    <PermitsView
      projectName={project.name}
      projectCity={project.city}
      jurisdictions={normalized}
    />
  );
}
