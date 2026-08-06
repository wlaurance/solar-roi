export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

function getServerKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }
  return key;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = getServerKey();
  const params = new URLSearchParams({ address, key });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { next: { revalidate: 86400 } },
  );
  const body = await res.json();
  if (body.status !== "OK" || !body.results?.[0]) {
    return null;
  }
  const result = body.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address as string,
  };
}
