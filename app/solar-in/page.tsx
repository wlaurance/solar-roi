import type { Metadata } from "next";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { listLocations, locationDisplayName } from "@/lib/locations/catalog";

export const metadata: Metadata = {
  title: "Solar by city & county | SolarFlow",
  description:
    "Rooftop solar guides for the largest U.S. cities and counties — start a free project for your home address.",
};

export default function SolarInIndexPage() {
  const locations = listLocations();
  const counties = locations
    .filter((l) => l.type === "county")
    .slice(0, 40);
  const cities = locations.filter((l) => l.type === "city").slice(0, 40);

  return (
    <main className="flex-1">
      <header className="border-b border-stone-2/70 bg-surface/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canopy text-white">
              <Icons.sun className="h-4 w-4" />
            </span>
            <span className="font-display text-xl">SolarFlow</span>
          </Link>
          <a href="/signup" className="btn-primary px-3 py-2 text-xs">
            Create account
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">
          Solar in your city or county
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Guides for the {locations.length.toLocaleString("en-US")} largest U.S.
          counties and cities by population. Pick your area, then create a project
          for your home.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">Top cities</h2>
          <ul className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {cities.map((loc) => (
              <li key={loc.slug} className="mb-2 break-inside-avoid">
                <Link
                  href={`/solar-in/${loc.slug}`}
                  className="text-sm text-canopy hover:underline"
                >
                  Solar in {locationDisplayName(loc)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">Top counties</h2>
          <ul className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {counties.map((loc) => (
              <li key={loc.slug} className="mb-2 break-inside-avoid">
                <Link
                  href={`/solar-in/${loc.slug}`}
                  className="text-sm text-canopy hover:underline"
                >
                  Solar in {locationDisplayName(loc)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Showing a sample on this index — every city and county page is in the{" "}
            <Link href="/sitemap.xml" className="underline">
              sitemap
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
