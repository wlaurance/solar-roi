/**
 * Upsert catalog rows from data/locations.json into geo_pages.
 * Usage: npx tsx scripts/seed-geo-pages.ts  (or node --experimental-strip-types)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

type Loc = {
  type: "county" | "city";
  name: string;
  state: string;
  state_name: string;
  population: number;
  slug: string;
  fips?: string;
  lat?: number;
  lng?: number;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "data", "locations.json"), "utf8"),
  ) as { counties: Loc[]; cities: Loc[] };

  const rows = [...raw.counties, ...raw.cities].map((loc) => ({
    slug: loc.slug,
    kind: loc.type,
    name: loc.name,
    state: loc.state,
    state_name: loc.state_name,
    population: loc.population,
    lat: loc.lat ?? null,
    lng: loc.lng ?? null,
    fips: loc.fips ?? null,
  }));

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from("geo_pages").upsert(slice, {
      onConflict: "slug",
      ignoreDuplicates: true,
    });
    if (error) throw error;
    console.log(`upserted ${Math.min(i + chunk, rows.length)} / ${rows.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
