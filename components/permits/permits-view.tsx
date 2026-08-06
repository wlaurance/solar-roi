"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CountyLinksPayload,
  PermitJurisdictionWithSteps,
  Project,
} from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  building_permit: "Building permit",
  planning: "Planning",
  fire: "Fire / setbacks",
  utility_interconnection: "Utility interconnection",
  incentives: "Incentives",
  other: "Other",
};

export function PermitsView({
  project,
  jurisdictions,
}: {
  project: Project;
  jurisdictions: PermitJurisdictionWithSteps[];
}) {
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
    if (!project.county_links || !project.county) {
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
            Guided path for {project.name} at {fullAddress}.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => loadCountyResources(true)}
          disabled={loading}
        >
          {loading ? "Looking up…" : "Refresh county links"}
        </button>
      </div>

      <section className="mb-8 rounded-2xl border border-stone-2/80 bg-surface/90 p-5 shadow-sm">
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
          ). Official links looked up with Gemini 2.5 Flash-Lite via the AI SDK.
        </p>
        {error ? (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {pack ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-ink-muted">{pack.summary}</p>
            <ul className="space-y-3">
              {pack.links.map((link) => (
                <li
                  key={`${link.url}-${link.title}`}
                  className="rounded-xl border border-stone-2/70 bg-white/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
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
                      <p className="mt-1 text-sm text-ink-muted">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {pack.model ? (
              <p className="text-[10px] text-ink-muted">
                Lookup: {pack.provider}/{pack.model}
                {pack.lookedUpAt
                  ? ` · ${new Date(pack.lookedUpAt).toLocaleString()}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : loading ? (
          <p className="mt-3 text-sm text-ink-muted">
            Asking the model for official county & utility links…
          </p>
        ) : null}
      </section>

      <div className="mb-4">
        <h2 className="text-lg font-medium text-ink">Seeded checklist</h2>
        <p className="text-sm text-ink-muted">
          Static Contra Costa / Walnut Creek / PG&E steps from Supabase (editable in
          Studio).
        </p>
      </div>

      {jurisdictions.length === 0 ? (
        <p className="rounded-md bg-stone-2/60 px-4 py-3 text-sm text-ink-muted">
          No permit jurisdictions seeded yet. Run Supabase migrations.
        </p>
      ) : (
        <div className="space-y-8">
          {jurisdictions.map((j) => (
            <section key={j.id}>
              <div className="mb-3 border-b border-stone-2/80 pb-2">
                <h2 className="text-xl font-medium text-ink">{j.name}</h2>
                {j.region ? (
                  <p className="text-sm text-ink-muted">{j.region}</p>
                ) : null}
              </div>
              <ol className="space-y-4">
                {j.permit_steps.map((step, idx) => (
                  <li
                    key={step.id}
                    className="relative rounded-2xl border border-stone-2/80 bg-surface/90 p-4 pl-14 shadow-sm"
                  >
                    <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-canopy text-xs font-medium text-white">
                      {idx + 1}
                    </span>
                    <h3 className="font-medium text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                    {step.link_url ? (
                      <a
                        href={step.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-canopy hover:underline"
                      >
                        {step.link_label ?? "Learn more"} →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
