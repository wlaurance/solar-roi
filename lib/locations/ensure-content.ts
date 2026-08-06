import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateGeoPageContent } from "@/lib/llm/geo-page-content";
import type {
  GeoPageContent,
  GeoPageRow,
  LocationRecord,
} from "@/lib/locations/types";

function rowToContent(row: GeoPageRow): GeoPageContent | null {
  if (!row.summary || !row.sections?.length) return null;
  return {
    headline: row.headline ?? `Solar in ${row.name}, ${row.state}`,
    summary: row.summary,
    sections: row.sections,
    faqs: row.faqs ?? [],
    model: row.model ?? undefined,
    provider: row.provider ?? undefined,
    generatedAt: row.generated_at ?? undefined,
  };
}

async function ensureCatalogRow(location: LocationRecord): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("geo_pages").upsert(
      {
        slug: location.slug,
        kind: location.type,
        name: location.name,
        state: location.state,
        state_name: location.state_name,
        population: location.population,
        lat: location.lat ?? null,
        lng: location.lng ?? null,
        fips: location.fips ?? null,
      },
      { onConflict: "slug", ignoreDuplicates: true },
    );
  } catch {
    // Catalog upsert is best-effort when service role is missing
  }
}

/**
 * Load cached AI content for a location page, generating + persisting on first hit.
 */
export async function ensureGeoPageContent(
  location: LocationRecord,
  options?: { force?: boolean },
): Promise<{ content: GeoPageContent; cached: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("geo_pages")
    .select("*")
    .eq("slug", location.slug)
    .maybeSingle();

  const existing = data as GeoPageRow | null;
  if (!options?.force && existing) {
    const cached = rowToContent(existing);
    if (cached) return { content: cached, cached: true };
  }

  await ensureCatalogRow(location);
  const content = await generateGeoPageContent(location);

  try {
    const admin = createAdminClient();
    await admin.from("geo_pages").upsert(
      {
        slug: location.slug,
        kind: location.type,
        name: location.name,
        state: location.state,
        state_name: location.state_name,
        population: location.population,
        lat: location.lat ?? null,
        lng: location.lng ?? null,
        fips: location.fips ?? null,
        headline: content.headline,
        summary: content.summary,
        sections: content.sections,
        faqs: content.faqs,
        model: content.model ?? null,
        provider: content.provider ?? null,
        generated_at: content.generatedAt ?? new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
  } catch (err) {
    console.warn("geo_pages cache write failed:", err);
  }

  return { content, cached: false };
}
