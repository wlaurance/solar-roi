import { readFileSync } from "fs";
import { join } from "path";
import type { UtilityRecord } from "@/lib/utilities/types";

type CatalogFile = { utilities: UtilityRecord[] };

let cached: UtilityRecord[] | null = null;
let bySlug: Map<string, UtilityRecord> | null = null;

function loadCatalog(): UtilityRecord[] {
  if (cached) return cached;
  const path = join(process.cwd(), "data", "utilities.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as CatalogFile;
  cached = raw.utilities;
  return cached;
}

function index(): Map<string, UtilityRecord> {
  if (bySlug) return bySlug;
  bySlug = new Map(loadCatalog().map((u) => [u.slug, u]));
  return bySlug;
}

export function listUtilities(): UtilityRecord[] {
  return loadCatalog();
}

export function getUtilityBySlug(slug: string): UtilityRecord | null {
  return index().get(slug) ?? null;
}

export function utilityDisplayName(u: UtilityRecord): string {
  return `${u.name} (${u.full_name})`;
}
