export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  /** administrative_area_level_2 (e.g. "Contra Costa County") */
  county: string | null;
  /** administrative_area_level_1 short (e.g. "CA") */
  state: string | null;
  /** locality / postal_town */
  city: string | null;
  postalCode: string | null;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function getServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }
  return key;
}

function findComponent(
  components: AddressComponent[],
  type: string,
): AddressComponent | undefined {
  return components.find((c) => c.types.includes(type));
}

/**
 * Geocode via Google Geocoding API (v3) and extract county from address_components.
 * @see https://developers.google.com/maps/documentation/geocoding/guides-v3/overview
 */
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
  const components = (result.address_components ?? []) as AddressComponent[];

  const county =
    findComponent(components, "administrative_area_level_2")?.long_name ?? null;
  const state =
    findComponent(components, "administrative_area_level_1")?.short_name ?? null;
  const city =
    findComponent(components, "locality")?.long_name ??
    findComponent(components, "postal_town")?.long_name ??
    findComponent(components, "sublocality")?.long_name ??
    null;
  const postalCode = findComponent(components, "postal_code")?.long_name ?? null;

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address as string,
    county,
    state,
    city,
    postalCode,
  };
}
