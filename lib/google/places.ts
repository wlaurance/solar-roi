export type InstallerPlace = {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  mapsUri: string | null;
  distanceMeters: number | null;
};

export type InstallerSearchParams = {
  /** Full project street address used in the Places query */
  address: string;
  lat?: number | null;
  lng?: number | null;
  query?: string;
};

function getServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }
  return key;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type PlacesResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location: { lat: number; lng: number } };
};

function mapResults(
  results: PlacesResult[],
  originLat: number | null,
  originLng: number | null,
): InstallerPlace[] {
  return results.slice(0, 12).map((place) => {
    const placeLat = place.geometry?.location.lat ?? null;
    const placeLng = place.geometry?.location.lng ?? null;
    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address ?? place.vicinity ?? null,
      rating: place.rating ?? null,
      userRatingsTotal: place.user_ratings_total ?? null,
      lat: placeLat,
      lng: placeLng,
      phone: null,
      website: null,
      mapsUri: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      distanceMeters:
        originLat != null &&
        originLng != null &&
        placeLat != null &&
        placeLng != null
          ? Math.round(haversineMeters(originLat, originLng, placeLat, placeLng))
          : null,
    };
  });
}

async function enrichPlaces(
  mapped: InstallerPlace[],
  key: string,
): Promise<InstallerPlace[]> {
  const enriched = await Promise.all(
    mapped.slice(0, 8).map(async (place) => {
      try {
        const detailParams = new URLSearchParams({
          place_id: place.id,
          fields: "formatted_phone_number,website,url",
          key,
        });
        const detailRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?${detailParams.toString()}`,
          { next: { revalidate: 86400 } },
        );
        const detailBody = await detailRes.json();
        const result = detailBody.result ?? {};
        return {
          ...place,
          phone: result.formatted_phone_number ?? null,
          website: result.website ?? null,
          mapsUri: result.url ?? place.mapsUri,
        };
      } catch {
        return place;
      }
    }),
  );

  return [...enriched, ...mapped.slice(8)];
}

/**
 * Find solar contractors near a project address via Places Text Search,
 * biased to the project's geocoded lat/lng when available.
 */
export async function searchSolarInstallers(
  params: InstallerSearchParams,
): Promise<InstallerPlace[]> {
  const key = getServerKey();
  const address = params.address.trim();
  if (!address) {
    throw new Error("Project address is required for installer search");
  }

  const keyword = (params.query ?? "solar installer").trim() || "solar installer";
  const textQuery = `${keyword} near ${address}`;

  const textParams = new URLSearchParams({
    query: textQuery,
    key,
  });
  if (
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)
  ) {
    textParams.set("location", `${params.lat},${params.lng}`);
    textParams.set("radius", "25000");
  }

  const textRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams.toString()}`,
    { next: { revalidate: 3600 } },
  );
  const textBody = await textRes.json();

  if (textBody.status !== "OK" && textBody.status !== "ZERO_RESULTS") {
    throw new Error(textBody.error_message ?? `Places API error: ${textBody.status}`);
  }

  let results = (textBody.results ?? []) as PlacesResult[];

  // Fallback: Nearby Search around project coordinates if text search is empty
  if (
    results.length === 0 &&
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)
  ) {
    const nearbyParams = new URLSearchParams({
      location: `${params.lat},${params.lng}`,
      radius: "25000",
      keyword,
      key,
    });
    const nearbyRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nearbyParams.toString()}`,
      { next: { revalidate: 3600 } },
    );
    const nearbyBody = await nearbyRes.json();
    if (nearbyBody.status !== "OK" && nearbyBody.status !== "ZERO_RESULTS") {
      throw new Error(
        nearbyBody.error_message ?? `Places API error: ${nearbyBody.status}`,
      );
    }
    results = (nearbyBody.results ?? []) as PlacesResult[];
  }

  const originLat =
    params.lat != null && Number.isFinite(params.lat) ? params.lat : null;
  const originLng =
    params.lng != null && Number.isFinite(params.lng) ? params.lng : null;

  const mapped = mapResults(results, originLat, originLng).sort((a, b) => {
    if (a.distanceMeters == null && b.distanceMeters == null) return 0;
    if (a.distanceMeters == null) return 1;
    if (b.distanceMeters == null) return -1;
    return a.distanceMeters - b.distanceMeters;
  });

  return enrichPlaces(mapped, key);
}
