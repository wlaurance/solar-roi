"use client";

import { useEffect, useState } from "react";
import type { InstallerPlace } from "@/lib/google/places";
import type { Project } from "@/lib/types";

export function InstallersView({ project }: { project: Project }) {
  const [installers, setInstallers] = useState<InstallerPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project.lat == null || project.lng == null) {
      setError("Project is missing coordinates.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/installers?lat=${project.lat}&lng=${project.lng}&q=${encodeURIComponent("solar installer")}`,
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load installers");
        if (!cancelled) setInstallers(body.installers ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load installers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.lat, project.lng]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
          Local partners
        </p>
        <h1 className="font-display mt-1 text-4xl text-ink">Find installers</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Google Places Nearby Search for solar installers near {project.address},{" "}
          {project.city}.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Searching nearby installers…</p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {!loading && !error && installers.length === 0 ? (
        <p className="text-sm text-ink-muted">No installers found in range.</p>
      ) : null}

      <ul className="space-y-3">
        {installers.map((place) => (
          <li
            key={place.id}
            className="rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-ink">{place.name}</h2>
                {place.address ? (
                  <p className="mt-0.5 text-sm text-ink-muted">{place.address}</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-muted">
                  {place.rating != null ? `${place.rating.toFixed(1)}★` : "No rating"}
                  {place.userRatingsTotal != null
                    ? ` (${place.userRatingsTotal})`
                    : ""}
                  {place.distanceMeters != null
                    ? ` · ${(place.distanceMeters / 1609.34).toFixed(1)} mi`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {place.phone ? (
                  <a className="btn-secondary px-3 py-2 text-xs" href={`tel:${place.phone}`}>
                    Call
                  </a>
                ) : null}
                {place.website ? (
                  <a
                    className="btn-secondary px-3 py-2 text-xs"
                    href={place.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website
                  </a>
                ) : null}
                <a
                  className="btn-primary px-3 py-2 text-xs"
                  href={
                    place.website
                      ? place.website
                      : `mailto:?subject=${encodeURIComponent(`Solar quote for ${project.address}`)}&body=${encodeURIComponent(`Hi ${place.name},\n\nI'm interested in a solar quote for ${project.address}, ${project.city} ${project.state} ${project.zip}.\n`)}`
                  }
                  target={place.website ? "_blank" : undefined}
                  rel={place.website ? "noreferrer" : undefined}
                >
                  Get quote
                </a>
                {place.mapsUri ? (
                  <a
                    className="btn-secondary px-3 py-2 text-xs"
                    href={place.mapsUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Maps
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
