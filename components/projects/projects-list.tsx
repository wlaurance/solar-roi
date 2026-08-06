"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import type { Project } from "@/lib/types";
import { track } from "@/lib/analytics";

export function ProjectsList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sage-deep/40 bg-surface/60 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-canopy">
          <Icons.projects className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl text-ink">No projects yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Create your first design to open the ROI dashboard, Google Solar roof view,
          permits, and installer search.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}/dashboard`}
            className="group block rounded-2xl border border-stone-2/80 bg-surface/90 p-5 shadow-sm transition hover:border-canopy/40 hover:shadow-md"
            onClick={() =>
              track("project_opened", {
                project_id: project.id,
                has_insights: Boolean(project.solar_insights),
              })
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-ink group-hover:text-canopy-deep">
                  {project.name}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {project.address}
                  {project.city ? `, ${project.city}` : ""}
                  {project.state ? ` ${project.state}` : ""}
                  {project.zip ? ` ${project.zip}` : ""}
                </p>
              </div>
              <Icons.chevron className="mt-1 h-5 w-5 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-canopy" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {project.solar ? (
                <span className="rounded-full bg-brass/15 px-2.5 py-1 text-brass">Solar</span>
              ) : null}
              {project.battery ? (
                <span className="rounded-full bg-canopy/10 px-2.5 py-1 text-canopy">Battery</span>
              ) : null}
              {project.hvac ? (
                <span className="rounded-full bg-stone-2 px-2.5 py-1 text-ink-muted">HVAC</span>
              ) : null}
              {project.water ? (
                <span className="rounded-full bg-stone-2 px-2.5 py-1 text-ink-muted">Water</span>
              ) : null}
              {project.solar_insights ? (
                <span className="rounded-full bg-sage px-2.5 py-1 text-canopy-deep">
                  Solar insights cached
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
