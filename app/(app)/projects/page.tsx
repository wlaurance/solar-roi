import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { ProjectsList } from "@/components/projects/projects-list";
import { CreateProjectButton } from "@/components/projects/create-project-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            Portfolio
          </p>
          <h1 className="font-display mt-1 text-4xl text-ink">Projects</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Each project holds an address, ROI toggles, cached Google Solar insights,
            and permit/installer context.
          </p>
        </div>
        <CreateProjectButton />
      </div>
      <ProjectsList projects={(projects ?? []) as Project[]} />
    </div>
  );
}
