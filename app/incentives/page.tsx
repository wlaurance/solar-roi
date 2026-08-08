import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  listFederalIncentiveIndex,
  listStateIncentiveIndex,
  getStateIncentive,
} from "@/lib/incentives/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Solar incentives 2026",
  description:
    "Federal residential solar tax credit status after OBBBA, plus state-by-state incentive overviews for homeowners researching rooftop solar in 2026 — then model your address.",
  path: "/incentives",
  image: "incentives",
  keywords: [
    "solar tax credit 2026",
    "solar incentives",
    "residential clean energy credit",
    "state solar rebates",
  ],
});

export default function IncentivesIndexPage() {
  const federal = listFederalIncentiveIndex();
  const states = listStateIncentiveIndex();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Create account" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Incentives · 2026 reality check
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar incentives for homeowners
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Neighbor stories still assume a 30% federal rebate and 1:1 net metering.
          For systems completed after Dec 31, 2025, Section 25D generally does not
          apply. State programs and utility export rules now drive most of the math.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">Federal</h2>
          <ul className="mt-4 space-y-3">
            {federal.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/incentives/federal/${f.slug}`}
                  className="group flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-2/80 py-3"
                >
                  <span className="font-display text-xl text-ink group-hover:text-canopy">
                    {f.name}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-ink-muted">
                    {f.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">States</h2>
          <ul className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {states.map((s) => {
              const detail = getStateIncentive(s.slug);
              return (
                <li key={s.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/incentives/${s.slug}`}
                    className="text-sm text-canopy hover:underline"
                  >
                    {detail?.state_name ?? s.slug} solar incentives
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
          <Link href="/solar-for" className="text-canopy hover:underline">
            Utility guides
          </Link>
          <Link href="/equipment" className="text-canopy hover:underline">
            Equipment
          </Link>
          <Link href="/tools/quote-check" className="text-canopy hover:underline">
            Quote check
          </Link>
        </p>
      </div>
    </main>
  );
}
