import type { InstallerPlace } from "@/lib/google/places";
import { solarDriveFromInsights } from "@/lib/roi/calculate";
import type { CountyLinksPayload, Project } from "@/lib/types";
import { posthogRequestHeaders } from "@/lib/analytics";

function projectFullAddress(project: Project) {
  return [project.address, project.city, `${project.state} ${project.zip}`]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:${blob.type || "image/png"};base64,${b64}`;
}

/**
 * Satellite Static Map with tiny markers at Google Solar panel centers.
 */
export async function fetchRoofMapDataUrl(
  project: Project,
): Promise<string | null> {
  if (project.lat == null || project.lng == null) return null;

  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const drive = solarDriveFromInsights(
    project.solar_insights,
    project.selected_panel_config_index,
  );
  const panels = (
    project.solar_insights?.solarPotential?.solarPanels ?? []
  ).slice(0, drive?.panelsCount ?? 0);

  const params = new URLSearchParams({
    center: `${project.lat},${project.lng}`,
    zoom: "20",
    size: "640x400",
    scale: "2",
    maptype: "satellite",
    key,
  });

  // Cap markers to keep Static Maps URL under length limits
  const markerPanels = panels.slice(0, 40);
  if (markerPanels.length > 0) {
    const locs = markerPanels
      .map((p) => `${p.center.latitude},${p.center.longitude}`)
      .join("|");
    params.append("markers", `size:tiny|color:0x3F6B4F|${locs}`);
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`,
  );
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size) return null;
  return blobToDataUrl(blob);
}

export async function fetchInstallersForProject(
  project: Project,
): Promise<InstallerPlace[]> {
  const address = projectFullAddress(project);
  if (!address) return [];

  const params = new URLSearchParams({
    address,
    q: "solar installer",
  });
  if (project.lat != null && project.lng != null) {
    params.set("lat", String(project.lat));
    params.set("lng", String(project.lng));
  }

  const res = await fetch(`/api/installers?${params.toString()}`, {
    headers: posthogRequestHeaders(),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Could not load installers for PDF");
  }
  return (body.installers ?? []) as InstallerPlace[];
}

/**
 * Ensure county permitting content exists (generate + persist if missing).
 */
export async function ensureCountyForProject(project: Project): Promise<{
  county: string | null;
  countyLinks: CountyLinksPayload | null;
  error?: string;
}> {
  const needsLookup =
    !project.county ||
    !project.county_links ||
    !(project.county_links.steps?.length || project.county_links.links?.length);

  if (!needsLookup) {
    return {
      county: project.county,
      countyLinks: project.county_links,
    };
  }

  try {
    const res = await fetch("/api/county/resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...posthogRequestHeaders(),
      },
      body: JSON.stringify({ projectId: project.id, force: false }),
    });
    const body = await res.json();
    if (!res.ok) {
      return {
        county: project.county,
        countyLinks: project.county_links,
        error: typeof body.error === "string" ? body.error : "County lookup failed",
      };
    }

    return {
      county: (body.county as string | null) ?? project.county,
      countyLinks:
        (body.links as CountyLinksPayload | null) ?? project.county_links,
    };
  } catch (err) {
    return {
      county: project.county,
      countyLinks: project.county_links,
      error: err instanceof Error ? err.message : "County lookup failed",
    };
  }
}
