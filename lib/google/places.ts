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

function getServerKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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

type PlacesNearbyResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location: { lat: number; lng: number } };
  business_status?: string;
};

export async function searchSolarInstallers(
  lat: number,
  lng: number,
  query = "solar installer",
): Promise<InstallerPlace[]> {
  const key = getServerKey();
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: "25000",
    keyword: query,
    type: "electrician",
    key,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );
  const body = await res.json();

  if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
    throw new Error(body.error_message ?? `Places API error: ${body.status}`);
  }

  const results = (body.results ?? []) as PlacesNearbyResult[];

  const mapped: InstallerPlace[] = results.slice(0, 12).map((place) => {
    const placeLat = place.geometry?.location.lat ?? null;
    const placeLng = place.geometry?.location.lng ?? null;
    return {
      id: place.place_id,
      name: place.name,
      address: place.vicinity ?? place.formatted_address ?? null,
      rating: place.rating ?? null,
      userRatingsTotal: place.user_ratings_total ?? null,
      lat: placeLat,
      lng: placeLng,
      phone: null,
      website: null,
      mapsUri: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      distanceMeters:
        placeLat != null && placeLng != null
          ? Math.round(haversineMeters(lat, lng, placeLat, placeLng))
          : null,
    };
  });

  // Enrich top results with phone/website via Place Details (limit calls)
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
