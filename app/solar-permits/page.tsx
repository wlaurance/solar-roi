import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { listPermitGuides } from "@/lib/permits/catalog";

export const metadata: Metadata = {
  title: "Solar permit & interconnection guides | SolarFlow",
  description:
    "What happens after you say yes to solar — local building permits, fire setbacks, and utility interconnection steps before Permission to Operate.",
};

export const dynamic = "force-dynamic";

export default async function SolarPermitsIndexPage() {
  const guides = await listPermitGuides();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Create account" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Process before the pitch
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar permits & interconnection
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Deals often die after a great quote — when HOA reviews, fire setbacks,
          or utility timelines show up late. Read the typical steps for your area
          before you commit emotionally.
        </p>

        <ul className="mt-10 space-y-3">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/solar-permits/${g.slug}`}
                className="group flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-2/80 py-3"
              >
                <span className="font-display text-xl text-ink group-hover:text-canopy">
                  {g.name}
                </span>
                <span className="text-xs text-ink-muted">
                  {g.region} · {g.steps.length} steps
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-ink-muted">
          Need address-level permit lookup after signup? Create a project and open
          the Permits tab — it builds a checklist for your county.{" "}
          <Link href="/solar-for" className="text-canopy hover:underline">
            Utility bill guides
          </Link>
          {" · "}
          <Link href="/solar-in" className="text-canopy hover:underline">
            City guides
          </Link>
        </p>
      </div>
    </main>
  );
}
