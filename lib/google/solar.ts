import type { BuildingInsightsResponse } from "@/lib/google/solar-types";

function getServerKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }
  return key;
}

export async function fetchBuildingInsights(
  lat: number,
  lng: number,
): Promise<BuildingInsightsResponse> {
  const key = getServerKey();
  const params = new URLSearchParams({
    "location.latitude": lat.toFixed(5),
    "location.longitude": lng.toFixed(5),
    requiredQuality: "HIGH",
    key,
  });

  const res = await fetch(
    `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params.toString()}`,
    { next: { revalidate: 86400 } },
  );

  const body = await res.json();
  if (!res.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Solar API error (${res.status})`;
    throw new Error(message);
  }

  return body as BuildingInsightsResponse;
}
