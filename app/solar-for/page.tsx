import Link from "next/link";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { pageMetadata } from "@/lib/seo";
import { listUtilityIndex } from "@/lib/utilities/catalog";

export const metadata = pageMetadata({
  title: "Solar by electric utility",
  description:
    "Utility-specific solar guidance for top U.S. IOUs — rates, export rules, interconnection steps, and a free address teaser. Updated for 2026 (no federal 25D for new completes).",
  path: "/solar-for",
  image: "solar-for",
  keywords: [
    "solar by utility",
    "net metering",
    "solar interconnection",
    "utility solar rates",
  ],
});

export default function SolarForIndexPage() {
  const utilities = listUtilityIndex()
    .slice()
    .sort((a, b) => b.priority_score - a.priority_score);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#utilities" ctaLabel="Browse utilities" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Bill shock research · 2026
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar by electric utility
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          People search by the name on their bill. Each guide covers illustrative
          rates, export compensation regime, interconnection / PTO steps, and a
          path to model your address. Federal residential 25D generally does not
          apply to systems completed after Dec 31, 2025 —{" "}
          <Link
            href="/incentives/federal/residential-clean-energy-credit"
            className="text-canopy hover:underline"
          >
            read why
          </Link>
          .
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
                    {u.state}
                  </span>
                </span>
                <span className="max-w-md text-right text-xs text-ink-muted">
                  {u.why}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
          <Link href="/incentives" className="text-canopy hover:underline">
            Federal & state incentives
          </Link>
          <Link href="/solar-permits" className="text-canopy hover:underline">
            Permit guides
          </Link>
          <Link href="/equipment" className="text-canopy hover:underline">
            Equipment manufacturers
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
