import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  return <PermitsView project={project as Project} />;
}
