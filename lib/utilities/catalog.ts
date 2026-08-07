import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { UtilityIndexEntry, UtilityRecord } from "@/lib/utilities/types";

let indexCache: UtilityIndexEntry[] | null = null;
const detailCache = new Map<string, UtilityRecord>();

function detailsDir() {
  return join(process.cwd(), "data", "utilities", "details");
}

export function listUtilityIndex(): UtilityIndexEntry[] {
  if (indexCache) return indexCache;
  const path = join(process.cwd(), "data", "utilities", "index.json");
  indexCache = JSON.parse(readFileSync(path, "utf8")) as UtilityIndexEntry[];
  return indexCache;
}

/** Sorted by priority_score desc for SEO index pages. */
export function listUtilities(): UtilityRecord[] {
  return listUtilityIndex()
    .slice()
    .sort((a, b) => b.priority_score - a.priority_score)
    .map((e) => getUtilityBySlug(e.slug))
    .filter((u): u is UtilityRecord => Boolean(u));
}

export function getUtilityBySlug(slug: string): UtilityRecord | null {
  if (detailCache.has(slug)) return detailCache.get(slug)!;
  const path = join(detailsDir(), `${slug}.json`);
  if (!existsSync(path)) return null;
  const record = JSON.parse(readFileSync(path, "utf8")) as UtilityRecord;
  detailCache.set(slug, record);
  return record;
}

export function utilityDisplayName(u: UtilityRecord): string {
  return `${u.name} (${u.full_name})`;
}

export function listUtilitySlugs(): string[] {
  return listUtilityIndex().map((u) => u.slug);
}
