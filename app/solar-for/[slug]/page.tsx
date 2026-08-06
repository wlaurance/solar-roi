import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import { getUtilityBySlug, listUtilities } from "@/lib/utilities/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listUtilities().map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) return { title: "Solar by utility | SolarFlow" };
  return {
    title: `Solar with ${utility.name} | SolarFlow`,
    description: `${utility.summary.slice(0, 155)}…`,
    alternates: { canonical: `/solar-for/${utility.slug}` },
  };
}

export default async function SolarForUtilityPage({ params }: Props) {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) notFound();

  const rateLabel = `$${utility.illustrative_rate_usd_per_kwh.toFixed(2)}/kWh`;

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#start-project" ctaLabel="Start my project" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Utility guide · {utility.state_name}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {utility.headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {utility.summary}
        </p>

        <aside className="mt-8 border-l-2 border-brass pl-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            Illustrative blended rate ({utility.rate_as_of})
          </p>
          <p className="font-display mt-1 text-3xl text-ink">{rateLabel}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {utility.rate_note} Always enter your bill’s actual $/kWh in the
            project dashboard.
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#start-project" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Model my {utility.name} bill
          </a>
          <Link href="/tools/quote-check" className="btn-secondary">
            Check a solar quote
          </Link>
        </div>

        <div className="mt-12 space-y-10">
          {utility.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <LocationFaqSection faqs={utility.faqs} />

        <LocationProjectCta
          locationLabel={`${utility.name} territory`}
          sourceSlug={`utility:${utility.slug}`}
          defaultState={utility.state}
          defaultCity={utility.default_city}
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          Serving another utility?{" "}
          <Link
            href="/solar-for"
            className="text-canopy underline-offset-2 hover:underline"
          >
            Browse all utility guides
          </Link>
          {" · "}
          <Link
            href="/solar-in"
            className="text-canopy underline-offset-2 hover:underline"
          >
            City & county guides
          </Link>
        </p>
      </article>
    </main>
  );
}
