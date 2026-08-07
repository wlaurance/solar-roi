import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import {
  getFederalIncentive,
  listFederalIncentiveIndex,
} from "@/lib/incentives/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listFederalIncentiveIndex().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getFederalIncentive(slug);
  if (!item) return { title: "Federal incentives | SolarFlow" };
  return {
    title: `${item.title} | SolarFlow`,
    description: item.summary.slice(0, 155),
    alternates: { canonical: `/incentives/federal/${item.slug}` },
  };
}

export default async function FederalIncentivePage({ params }: Props) {
  const { slug } = await params;
  const item = getFederalIncentive(slug);
  if (!item) notFound();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Model my home" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Federal · {item.status}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {item.headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {item.summary}
        </p>

        <aside className="mt-8 border-l-2 border-brass pl-4 text-sm text-ink-muted">
          <p>
            <span className="font-medium text-ink">Amount: </span>
            {item.percent_or_amount}
          </p>
          <p className="mt-2">
            <span className="font-medium text-ink">Dates: </span>
            {item.effective_dates.notes}
          </p>
          <p className="mt-2">{item.homeowner_eligibility_notes}</p>
        </aside>

        <div className="mt-12 space-y-10">
          {item.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {item.common_myths?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-ink">Common myths</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {item.common_myths.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <LocationFaqSection faqs={item.faqs} />

        <p className="mt-8 text-sm text-ink-muted">{item.claim_howto}</p>

        {item.official_urls[0] ? (
          <p className="mt-4 text-sm">
            <a
              href={item.official_urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-canopy hover:underline"
            >
              Official IRS / source →
            </a>
          </p>
        ) : null}

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/incentives" className="text-canopy hover:underline">
            All incentives
          </Link>
          {" · "}
          <Link href="/solar-for" className="text-canopy hover:underline">
            Utility guides
          </Link>
        </p>
      </article>
    </main>
  );
}
