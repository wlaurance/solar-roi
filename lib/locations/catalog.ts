import { readFileSync } from "fs";
import { join } from "path";
import type { LocationRecord } from "@/lib/locations/types";

type CatalogFile = {
  counties: LocationRecord[];
  cities: LocationRecord[];
};

let cached: LocationRecord[] | null = null;
let bySlug: Map<string, LocationRecord> | null = null;

function loadCatalog(): LocationRecord[] {
  if (cached) return cached;
  const path = join(process.cwd(), "data", "locations.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as CatalogFile;
  cached = [
    ...raw.counties.map((c) => ({ ...c, type: "county" as const })),
    ...raw.cities.map((c) => ({ ...c, type: "city" as const })),
  ];
  return cached;
}

function index(): Map<string, LocationRecord> {
  if (bySlug) return bySlug;
  bySlug = new Map(loadCatalog().map((loc) => [loc.slug, loc]));
  return bySlug;
}

export function listLocations(): LocationRecord[] {
  return loadCatalog();
}

export function getLocationBySlug(slug: string): LocationRecord | null {
  return index().get(slug) ?? null;
}

export function locationDisplayName(loc: LocationRecord): string {
  return `${loc.name}, ${loc.state}`;
}

export function locationSearchPhrase(loc: LocationRecord): string {
  if (loc.type === "county") {
    return `solar in ${loc.name} ${loc.state}`;
  }
  return `solar in ${loc.name} ${loc.state}`;
}
