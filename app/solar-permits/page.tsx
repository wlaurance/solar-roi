import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { listPermitGuides } from "@/lib/permits/catalog";
import { pageMetadata } from "@/lib/seo";
import { listUtilityIndex } from "@/lib/utilities/catalog";

export const metadata = pageMetadata({
  title: "Solar permit & interconnection guides",
  description:
    "What happens after you say yes to solar — local building permits and utility interconnection / PTO steps before you energize. Know the process before you sign.",
  path: "/solar-permits",
  image: "permits",
  keywords: [
    "solar permits",
    "solar interconnection",
    "permission to operate",
    "PTO solar",
  ],
});

export const dynamic = "force-dynamic";

export default async function SolarPermitsIndexPage() {
  const guides = await listPermitGuides();
  const utilities = listUtilityIndex()
    .slice()
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 24);

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
          or utility PTO timelines show up late. Passing a municipal inspection
          is not the same as Permission to Operate.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">
            Local AHJ / seeded guides
          </h2>
          <ul className="mt-4 space-y-3">
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
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">
            Utility interconnection (IOUs)
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Full interconnect + PTO steps live on each utility guide.
          </p>
          <ul className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {utilities.map((u) => (
              <li key={u.slug} className="mb-2 break-inside-avoid">
                <Link
                  href={`/solar-for/${u.slug}#interconnection`}
                  className="text-sm text-canopy hover:underline"
                >
                  {u.name} ({u.state}) interconnect
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            <Link href="/solar-for" className="underline">
              Browse all utility guides
            </Link>
          </p>
        </section>

        <p className="mt-10 text-sm text-ink-muted">
          Need address-level permit lookup after signup? Create a project and open
          the Permits tab.{" "}
          <Link href="/incentives" className="text-canopy hover:underline">
            Incentives
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
