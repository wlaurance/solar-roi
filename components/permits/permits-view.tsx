"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CountyLinksPayload, Project } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  building_permit: "Building permit",
  planning: "Planning",
  fire: "Fire / setbacks",
  utility_interconnection: "Utility interconnection",
  incentives: "Incentives",
  other: "Other",
};

export function PermitsView({ project }: { project: Project }) {
  const router = useRouter();
  const [county, setCounty] = useState(project.county);
  const [pack, setPack] = useState<CountyLinksPayload | null>(
    project.county_links,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCountyResources = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/county/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, force }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Lookup failed");
        setCounty(body.county ?? null);
        setPack(body.links ?? null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lookup failed");
      } finally {
        setLoading(false);
      }
    },
    [project.id, router],
  );

  useEffect(() => {
    const missingSteps = !project.county_links?.steps?.length;
    if (!project.county_links || !project.county || missingSteps) {
      void loadCountyResources(false);
    }
  }, [project.county, project.county_links, loadCountyResources]);

  const fullAddress = `${project.address}, ${project.city}, ${project.state} ${project.zip}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            Permitting
          </p>
          <h1 className="font-display mt-1 text-4xl text-ink">
            County & utility steps
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            AI-generated checklist for {project.name} at {fullAddress}, saved on
            this project.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => loadCountyResources(true)}
          disabled={loading}
        >
          {loading ? "Looking up…" : "Regenerate"}
        </button>
      </div>

      <section className="mb-6 rounded-2xl border border-stone-2/80 bg-surface/90 p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-brass">
          Detected county
        </p>
        <p className="mt-1 text-xl font-medium text-ink">
          {county ?? (loading ? "Detecting…" : "Unknown")}
          {project.state ? (
            <span className="text-base font-normal text-ink-muted">
              {" "}
              · {project.state}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          County from Google Geocoding (
          <code className="text-canopy">administrative_area_level_2</code>
          ). Content generated with Gemini 3.5 Flash-Lite and stored in{" "}
          <code className="text-canopy">projects.county_links</code>.
        </p>
        {error ? (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {pack?.summary ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {pack.summary}
          </p>
        ) : null}
      </section>

      {loading && !pack ? (
        <p className="mb-6 text-sm text-ink-muted">
          Generating and saving permitting content for this county…
        </p>
      ) : null}

      {pack?.steps && pack.steps.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-ink">Permit checklist</h2>
          <ol className="space-y-4">
            {pack.steps.map((step, idx) => (
              <li
                key={`${step.title}-${idx}`}
                className="relative rounded-2xl border border-stone-2/80 bg-surface/90 p-4 pl-14 shadow-sm"
              >
                <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-canopy text-xs font-medium text-white">
                  {idx + 1}
                </span>
                <h3 className="font-medium text-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
                {step.linkUrl ? (
                  <a
                    href={step.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-canopy hover:underline"
                  >
                    {step.linkLabel ?? "Learn more"} →
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {pack?.links && pack.links.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium text-ink">Official links</h2>
          <ul className="space-y-3">
            {pack.links.map((link) => (
              <li
                key={`${link.url}-${link.title}`}
                className="rounded-xl border border-stone-2/70 bg-white/70 px-4 py-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  {CATEGORY_LABEL[link.category] ?? link.category}
                </p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block font-medium text-canopy hover:underline"
                >
                  {link.title} →
                </a>
                <p className="mt-1 text-sm text-ink-muted">{link.description}</p>
              </li>
            ))}
          </ul>
          {pack.model ? (
            <p className="mt-4 text-[10px] text-ink-muted">
              Saved lookup: {pack.provider}/{pack.model}
              {pack.lookedUpAt
                ? ` · ${new Date(pack.lookedUpAt).toLocaleString()}`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
