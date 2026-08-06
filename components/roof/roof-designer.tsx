"use client";

import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BuildingInsightsResponse, SolarPanel } from "@/lib/google/solar-types";
import {
  assessSolarCandidate,
  type SolarCandidateTier,
} from "@/lib/solar/candidate";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

type Props = {
  project: Project;
  mapsApiKey: string;
};

export function RoofDesigner({ project, mapsApiKey }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [insights, setInsights] = useState<BuildingInsightsResponse | null>(
    project.solar_insights,
  );
  const [configIndex, setConfigIndex] = useState(
    project.selected_panel_config_index ?? 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pot = insights?.solarPotential;
  const configs = pot?.solarPanelConfigs ?? [];
  const safeIndex = configs.length
    ? Math.max(0, Math.min(configIndex, configs.length - 1))
    : 0;
  const selectedConfig = configs[safeIndex];
  const panels = useMemo(() => {
    if (!pot || !selectedConfig) return [];
    return (pot.solarPanels ?? []).slice(0, selectedConfig.panelsCount);
  }, [pot, selectedConfig]);

  const dominantSegment = useMemo(() => {
    if (!selectedConfig?.roofSegmentSummaries?.length) {
      return pot?.roofSegmentStats?.[0] ?? null;
    }
    const best = [...selectedConfig.roofSegmentSummaries].sort(
      (a, b) => b.panelsCount - a.panelsCount,
    )[0];
    return pot?.roofSegmentStats?.[best.segmentIndex] ?? null;
  }, [selectedConfig, pot]);

  const solarCandidate = useMemo(
    () => assessSolarCandidate(pot?.maxSunshineHoursPerYear),
    [pot?.maxSunshineHoursPerYear],
  );

  const center = {
    lat: insights?.center?.latitude ?? project.lat ?? 37.9058,
    lng: insights?.center?.longitude ?? project.lng ?? -122.0654,
  };

  const fetchInsights = useCallback(async () => {
    if (project.lat == null || project.lng == null) {
      setError("Project is missing lat/lng. Recreate the project to geocode.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/solar/insights?lat=${project.lat}&lng=${project.lng}&projectId=${project.id}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Solar API failed");
      setInsights(body.insights as BuildingInsightsResponse);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Solar insights");
    } finally {
      setLoading(false);
    }
  }, [project.id, project.lat, project.lng, router]);

  useEffect(() => {
    if (!insights && project.lat != null && project.lng != null) {
      void fetchInsights();
    }
  }, [insights, project.lat, project.lng, fetchInsights]);

  function onConfigChange(next: number) {
    setConfigIndex(next);
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("projects")
        .update({ selected_panel_config_index: next })
        .eq("id", project.id);
      router.refresh();
    });
  }

  if (!mapsApiKey) {
    return (
      <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            Roof designer
          </p>
          <h1 className="font-display mt-1 text-4xl text-ink">Google Solar layout</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Pick a panel-count configuration from Google&apos;s{" "}
            <code className="text-canopy">solarPanelConfigs</code>. Panels are drawn from{" "}
            <code className="text-canopy">solarPanels</code> (first N) on satellite imagery —
            no manual place/drag.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={fetchInsights}
          disabled={loading}
        >
          {loading ? "Loading insights…" : insights ? "Refresh insights" : "Load insights"}
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {configs.length > 0 && selectedConfig ? (
        <div className="mb-4 rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className="label" htmlFor="panel-config">
                Panel configuration
              </label>
              <p className="text-sm text-ink">
                <strong>{selectedConfig.panelsCount}</strong> panels ·{" "}
                <strong>
                  {Math.round(selectedConfig.yearlyEnergyDcKwh).toLocaleString()} kWh/yr DC
                </strong>{" "}
                · {pot?.panelCapacityWatts ?? "—"} W modules
              </p>
            </div>
            {dominantSegment ? (
              <p className="text-sm text-ink-muted">
                Recommended tilt ~{" "}
                <span className="font-medium text-canopy">
                  {dominantSegment.pitchDegrees.toFixed(1)}°
                </span>{" "}
                · azimuth {dominantSegment.azimuthDegrees.toFixed(0)}°
              </p>
            ) : null}
          </div>
          <input
            id="panel-config"
            type="range"
            min={0}
            max={configs.length - 1}
            value={safeIndex}
            onChange={(e) => onConfigChange(Number(e.target.value))}
            disabled={pending}
            className="mt-4 w-full accent-canopy"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-muted">
            <span>{configs[0].panelsCount} panels</span>
            <span>{configs[configs.length - 1].panelsCount} panels</span>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-stone-2/80 shadow-sm">
        <APIProvider apiKey={mapsApiKey}>
          <Map
            style={{ width: "100%", height: "520px" }}
            defaultCenter={center}
            defaultZoom={20}
            mapTypeId="satellite"
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <PanelOverlays
              panels={panels}
              panelWidthM={pot?.panelWidthMeters ?? 1.045}
              panelHeightM={pot?.panelHeightMeters ?? 1.879}
              roofSegments={pot?.roofSegmentStats ?? []}
            />
          </Map>
        </APIProvider>
      </div>

      {insights ? (
        <>
          {solarCandidate ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-4 sm:px-5 ${candidateTone(solarCandidate.tier)}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.1em]">
                Solar candidate · {solarCandidate.label}
              </p>
              <p className="mt-1 text-lg font-medium text-ink">
                {solarCandidate.candidateAnswer}
              </p>
              <p className="mt-1 max-w-3xl text-sm text-ink-muted">
                {solarCandidate.sunshineHoursPerYear.toLocaleString()} sunshine
                hours / year on the best roof area. {solarCandidate.summary}
              </p>
              <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-canopy"
                  style={{ width: `${solarCandidate.score}%` }}
                />
              </div>
            </div>
          ) : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Meta
              label="Max array"
              value={`${pot?.maxArrayPanelsCount ?? "—"} panels`}
            />
            <Meta
              label="Sunshine hours / yr"
              value={
                pot?.maxSunshineHoursPerYear != null
                  ? `${Math.round(pot.maxSunshineHoursPerYear).toLocaleString()}${
                      solarCandidate ? ` · ${solarCandidate.label}` : ""
                    }`
                  : "—"
              }
            />
            <Meta
              label="Imagery quality"
              value={insights.imageryQuality ?? "—"}
            />
          </dl>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Loading Google Solar Building Insights for this address…
        </p>
      )}
    </div>
  );
}

function candidateTone(tier: SolarCandidateTier): string {
  switch (tier) {
    case "excellent":
      return "border-canopy/40 bg-canopy/10";
    case "good":
      return "border-brass/40 bg-brass/10";
    case "fair":
      return "border-stone-2 bg-stone/60";
    case "poor":
      return "border-danger/30 bg-danger/5";
  }
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-2/80 bg-surface/80 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.08em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function PanelOverlays({
  panels,
  panelWidthM,
  panelHeightM,
  roofSegments,
}: {
  panels: SolarPanel[];
  panelWidthM: number;
  panelHeightM: number;
  roofSegments: Array<{ azimuthDegrees: number; pitchDegrees: number }>;
}) {
  const map = useMap();
  const [overlays, setOverlays] = useState<google.maps.Polygon[]>([]);

  useEffect(() => {
    if (!map || !(window as unknown as { google?: typeof google }).google?.maps) return;

    overlays.forEach((p) => p.setMap(null));

    const next = panels.map((panel) => {
      const segmentAzimuth =
        roofSegments[panel.segmentIndex]?.azimuthDegrees ?? 180;
      // Portrait: height along roof pitch direction; landscape swaps
      const width =
        panel.orientation === "LANDSCAPE" ? panelHeightM : panelWidthM;
      const height =
        panel.orientation === "LANDSCAPE" ? panelWidthM : panelHeightM;
      const path = rectanglePath(
        panel.center.latitude,
        panel.center.longitude,
        width,
        height,
        segmentAzimuth,
      );
      return new google.maps.Polygon({
        paths: path,
        strokeColor: "#C4A035",
        strokeOpacity: 0.95,
        strokeWeight: 1,
        fillColor: "#C4A035",
        fillOpacity: 0.45,
        map,
        clickable: false,
      });
    });

    setOverlays(next);
    return () => {
      next.forEach((p) => p.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- overlays managed inside effect
  }, [map, panels, panelWidthM, panelHeightM, roofSegments]);

  return null;
}

/** Build a ground-projected rectangle around a lat/lng center. */
function rectanglePath(
  lat: number,
  lng: number,
  widthM: number,
  heightM: number,
  azimuthDeg: number,
): google.maps.LatLngLiteral[] {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const angle = ((azimuthDeg - 90) * Math.PI) / 180;
  const hx = widthM / 2;
  const hy = heightM / 2;
  const corners = [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy },
  ];
  return corners.map(({ x, y }) => {
    const rx = x * Math.cos(angle) - y * Math.sin(angle);
    const ry = x * Math.sin(angle) + y * Math.cos(angle);
    return {
      lat: lat + ry / metersPerDegLat,
      lng: lng + rx / metersPerDegLng,
    };
  });
}
