import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import { listStateIncentiveIndex } from "@/lib/incentives/catalog";
import { pageMetadata } from "@/lib/seo";
import {
  getUtilityBySlug,
  listUtilitySlugs,
} from "@/lib/utilities/catalog";

type Props = { params: Promise<{ slug: string }> };

function stateIncentivePath(stateCode: string): string | null {
  const match = listStateIncentiveIndex().find((s) => s.state === stateCode);
  return match ? `/incentives/${match.slug}` : null;
}

export function generateStaticParams() {
  return listUtilitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) {
    return pageMetadata({
      title: "Solar by utility",
      description:
        "Utility-specific solar guidance — rates, export rules, interconnection, and a free address project.",
      path: "/solar-for",
      image: "solar-for",
    });
  }
  return pageMetadata({
    title: `Solar with ${utility.name}`,
    description: utility.summary,
    path: `/solar-for/${utility.slug}`,
    image: "solar-for",
    keywords: [
      `${utility.name} solar`,
      "solar interconnection",
      "utility solar rates",
      utility.state,
    ],
  });
}

export default async function SolarForUtilityPage({ params }: Props) {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) notFound();

  const rateLabel = `$${utility.illustrative_rate_usd_per_kwh.toFixed(2)}/kWh`;
  const steps = utility.interconnection?.steps ?? [];
  const stateIncentiveHref = stateIncentivePath(utility.state);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#start-project" ctaLabel="Start my project" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Utility guide · {utility.state_name}
          {utility.researched_detail === false ? " · overview" : ""}
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
            {utility.rate_note}
          </p>
          {utility.export_compensation ? (
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-medium text-ink">Export regime: </span>
              {utility.export_compensation.regime.replaceAll("_", " ")} —{" "}
              {utility.export_compensation.summary}
            </p>
          ) : null}
        </aside>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#start-project" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Model my {utility.name} bill
          </a>
          <Link href={`/upload-bill/${utility.slug}`} className="btn-secondary">
            Upload {utility.name} bill PDF
          </Link>
          <Link href="/tools/quote-check" className="btn-secondary">
            Check a solar quote
          </Link>
          <Link
            href="/incentives/federal/residential-clean-energy-credit"
            className="btn-secondary"
          >
            2026 federal credit status
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

        {steps.length ? (
          <section className="mt-12" id="interconnection">
            <h2 className="font-display text-2xl text-ink">
              Interconnection &amp; PTO
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {utility.interconnection?.program_name}
              {utility.interconnection?.pto_notes
                ? ` — ${utility.interconnection.pto_notes}`
                : ""}
            </p>
            <ol className="mt-8 space-y-8">
              {steps.map((step, i) => (
                <li key={step.title} className="relative pl-10">
                  <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-canopy text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-xl text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                  {step.link_url ? (
                    <a
                      href={step.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-canopy hover:underline"
                    >
                      {step.link_label || "Official link"} →
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
            {utility.interconnection?.application_url ? (
              <p className="mt-6 text-sm">
                <a
                  href={utility.interconnection.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-canopy hover:underline"
                >
                  Utility interconnection portal →
                </a>
              </p>
            ) : null}
            {utility.local_permitting_notes ? (
              <p className="mt-4 text-sm text-ink-muted">
                {utility.local_permitting_notes}{" "}
                <Link href="/solar-permits" className="text-canopy hover:underline">
                  Local permit guides
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        <LocationFaqSection faqs={utility.faqs} />

        <LocationProjectCta
          locationLabel={`${utility.name} territory`}
          sourceSlug={`utility:${utility.slug}`}
          defaultState={utility.state}
          defaultCity={utility.default_city}
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link
            href="/solar-for"
            className="text-canopy underline-offset-2 hover:underline"
          >
            All utility guides
          </Link>
          {stateIncentiveHref ? (
            <>
              {" · "}
              <Link
                href={stateIncentiveHref}
                className="text-canopy underline-offset-2 hover:underline"
              >
                {utility.state_name} incentives
              </Link>
            </>
          ) : null}
          {" · "}
          <Link
            href="/solar-permits"
            className="text-canopy underline-offset-2 hover:underline"
          >
            Permits
          </Link>
        </p>
      </article>
    </main>
  );
}
