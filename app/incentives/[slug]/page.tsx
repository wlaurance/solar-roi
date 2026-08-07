import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import {
  getStateIncentive,
  listStateIncentiveIndex,
} from "@/lib/incentives/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listStateIncentiveIndex().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getStateIncentive(slug);
  if (!item) return { title: "State incentives | SolarFlow" };
  return {
    title: `${item.state_name} solar incentives | SolarFlow`,
    description: item.summary.slice(0, 155),
    alternates: { canonical: `/incentives/${item.slug}` },
  };
}

export default async function StateIncentivePage({ params }: Props) {
  const { slug } = await params;
  const item = getStateIncentive(slug);
  if (!item) notFound();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#start-project" ctaLabel="Start my project" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          State incentives · {item.state}
          {item.researched_detail === false ? " · overview" : ""}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {item.headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {item.summary}
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">
            Net metering / export overview
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {item.net_metering_or_billing_overview}
          </p>
        </section>

        {item.programs.length ? (
          <section className="mt-10 space-y-6">
            <h2 className="font-display text-2xl text-ink">Programs</h2>
            {item.programs.map((p) => (
              <div key={p.name} className="border-b border-stone-2/80 pb-6">
                <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
                  {p.status}
                </p>
                <p className="mt-2 text-sm text-ink-muted">{p.summary}</p>
                <p className="mt-2 text-sm text-ink-muted">
                  <span className="font-medium text-ink">Amounts: </span>
                  {p.dollar_amounts}
                </p>
                {p.official_url ? (
                  <a
                    href={p.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-canopy hover:underline"
                  >
                    Official program page →
                  </a>
                ) : null}
              </div>
            ))}
          </section>
        ) : (
          <p className="mt-8 rounded-lg bg-sage/40 px-4 py-3 text-sm text-ink-muted">
            Detailed program list for this state is still being verified. Use
            official state energy office sources, and start with your utility
            guide for export rules.
          </p>
        )}

        <div className="mt-10 space-y-8">
          {item.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-10 space-y-3 text-sm text-ink-muted">
          <p>
            <span className="font-medium text-ink">Tax notes: </span>
            {item.property_tax_sales_tax_notes}
          </p>
          <p>
            <span className="font-medium text-ink">HOA / solar access: </span>
            {item.hoa_solar_access_law}
          </p>
        </section>

        {item.related_utility_slugs.length ? (
          <p className="mt-8 flex flex-wrap gap-x-3 gap-y-2 text-sm">
            {item.related_utility_slugs.map((u) => (
              <Link
                key={u}
                href={`/solar-for/${u}`}
                className="text-canopy hover:underline"
              >
                {u} utility guide
              </Link>
            ))}
          </p>
        ) : null}

        <LocationFaqSection faqs={item.faqs} />

        <LocationProjectCta
          locationLabel={item.state_name}
          sourceSlug={`incentive:${item.slug}`}
          defaultState={item.state}
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/incentives" className="text-canopy hover:underline">
            All incentives
          </Link>
        </p>
      </article>
    </main>
  );
}
