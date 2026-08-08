import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { RoiDashboard } from "@/components/dashboard/roi-dashboard";
import { listUtilityIndex } from "@/lib/utilities/catalog";

export default async function DashboardPage({
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

  const typed = project as Project;
  const utilities = listUtilityIndex()
    .slice()
    .sort((a, b) => {
      if (typed.state && a.state === typed.state && b.state !== typed.state) return -1;
      if (typed.state && b.state === typed.state && a.state !== typed.state) return 1;
      return b.priority_score - a.priority_score;
    })
    .map((u) => ({ slug: u.slug, name: u.name, state: u.state }));

  const defaultUtilitySlug =
    utilities.find((u) => u.state === typed.state)?.slug ?? utilities[0]?.slug ?? null;

  return (
    <RoiDashboard
      project={typed}
      utilities={utilities}
      defaultUtilitySlug={defaultUtilitySlug}
    />
  );
}
