"use client";

import { useEffect, useMemo, useState } from "react";
import type { InstallerPlace } from "@/lib/google/places";
import type { Project } from "@/lib/types";
import { posthogRequestHeaders, track, trackException } from "@/lib/analytics";

function projectFullAddress(project: Project) {
  return [project.address, project.city, `${project.state} ${project.zip}`]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

export function InstallersView({
  project,
  brandSlug,
}: {
  project: Project;
  brandSlug?: string | null;
}) {
  const [installers, setInstallers] = useState<InstallerPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullAddress = useMemo(() => projectFullAddress(project), [project]);
  const searchQuery = brandSlug
    ? `${brandSlug.replaceAll("-", " ")} solar installer`
    : "solar installer";

  useEffect(() => {
    let cancelled = false;

    if (!fullAddress) {
      queueMicrotask(() => {
        if (!cancelled) {
          setError("Project is missing an address.");
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      track("installers_search_started", {
        project_id: project.id,
        brand: brandSlug ?? null,
      });
      try {
        const params = new URLSearchParams({
          address: fullAddress,
          q: searchQuery,
        });
        if (project.lat != null && project.lng != null) {
          params.set("lat", String(project.lat));
          params.set("lng", String(project.lng));
        }
        const res = await fetch(`/api/installers?${params.toString()}`, {
          headers: posthogRequestHeaders(),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load installers");
        if (!cancelled) {
          const list = (body.installers ?? []) as InstallerPlace[];
          setInstallers(list);
          track("installers_search_completed", {
            project_id: project.id,
            count: list.length,
            brand: brandSlug ?? null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          track("installers_search_failed", {
            project_id: project.id,
            error: err instanceof Error ? err.message : "Failed",
          });
          trackException(err, {
            context: "installers_search",
            project_id: project.id,
          });
          setError(err instanceof Error ? err.message : "Failed to load installers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fullAddress, project.id, project.lat, project.lng, searchQuery, brandSlug]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
          Local partners
        </p>
        <h1 className="font-display mt-1 text-4xl text-ink">Find installers</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Searching Google Places near your project address
          {brandSlug ? (
            <>
              {" "}
              for{" "}
              <span className="font-medium text-ink">
                {brandSlug.replaceAll("-", " ")}
              </span>
              -related solar installers
            </>
          ) : (
            " for solar installers"
          )}
          :
        </p>
        <p className="mt-1 text-sm font-medium text-ink">{fullAddress || "—"}</p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">
          Searching contractors near {fullAddress}…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {!loading && !error && installers.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No installers found near this address.
        </p>
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
                    ? ` · ${(place.distanceMeters / 1609.34).toFixed(1)} mi from project`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {place.phone ? (
                  <a
                    className="btn-secondary px-3 py-2 text-xs"
                    href={`tel:${place.phone}`}
                    onClick={() =>
                      track("installer_contact_clicked", {
                        project_id: project.id,
                        action: "call",
                        installer_id: place.id,
                      })
                    }
                  >
                    Call
                  </a>
                ) : null}
                {place.website ? (
                  <a
                    className="btn-secondary px-3 py-2 text-xs"
                    href={place.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      track("installer_contact_clicked", {
                        project_id: project.id,
                        action: "website",
                        installer_id: place.id,
                      })
                    }
                  >
                    Website
                  </a>
                ) : null}
                <a
                  className="btn-primary px-3 py-2 text-xs"
                  href={
                    place.website
                      ? place.website
                      : `mailto:?subject=${encodeURIComponent(`Solar quote for ${fullAddress}`)}&body=${encodeURIComponent(`Hi ${place.name},\n\nI'm interested in a solar quote for ${fullAddress}.\n`)}`
                  }
                  target={place.website ? "_blank" : undefined}
                  rel={place.website ? "noreferrer" : undefined}
                  onClick={() =>
                    track("installer_contact_clicked", {
                      project_id: project.id,
                      action: "get_quote",
                      installer_id: place.id,
                    })
                  }
                >
                  Get quote
                </a>
                {place.mapsUri ? (
                  <a
                    className="btn-secondary px-3 py-2 text-xs"
                    href={place.mapsUri}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      track("installer_contact_clicked", {
                        project_id: project.id,
                        action: "maps",
                        installer_id: place.id,
                      })
                    }
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
