import type { Metadata } from "next";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { listUtilities } from "@/lib/utilities/catalog";

export const metadata: Metadata = {
  title: "Solar bill calculator by utility | SolarFlow",
  description:
    "Utility-specific solar guidance for PG&E, SCE, SDG&E, and more — model your bill and roof with transparent assumptions.",
};

export default function SolarForIndexPage() {
  const utilities = listUtilities();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#utilities" ctaLabel="Browse utilities" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Bill shock research
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar by electric utility
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          People search by the name on their bill — not by “solar software.” Pick
          your utility for rate-aware guidance, then start a free project for your
          home address.
        </p>

        <ul id="utilities" className="mt-10 space-y-4">
          {utilities.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/solar-for/${u.slug}`}
                className="group flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-2/80 py-3"
              >
                <span className="font-display text-xl text-ink group-hover:text-canopy">
                  {u.name}
                  <span className="ml-2 text-sm font-sans font-normal text-ink-muted">
                    {u.full_name}
                  </span>
                </span>
                <span className="text-xs text-ink-muted">
                  {u.region} · ~${u.illustrative_rate_usd_per_kwh.toFixed(2)}/kWh
                  illustrative
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
          <Link href="/solar-in" className="text-canopy hover:underline">
            Solar by city & county
          </Link>
          <Link href="/solar-permits" className="text-canopy hover:underline">
            Permit & interconnection guides
          </Link>
          <Link href="/tools/quote-check" className="text-canopy hover:underline">
            Quote market check
          </Link>
        </p>

        <div className="mt-8">
          <Link href="/signup" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Create free account
          </Link>
        </div>
      </div>
    </main>
  );
}
