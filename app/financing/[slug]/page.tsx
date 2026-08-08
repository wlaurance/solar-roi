import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import {
  getFinancingPage,
  listFinancingIndex,
} from "@/lib/financing/catalog";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listFinancingIndex().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getFinancingPage(slug);
  if (!item) {
    return pageMetadata({
      title: "Solar financing",
      description:
        "Guides to solar loans, lender APIs, and marketplace widgets for homeowners comparing proposals.",
      path: "/financing",
      image: "financing",
    });
  }
  return pageMetadata({
    title: item.name,
    description: item.summary,
    path: `/financing/${item.slug}`,
    image: "financing",
    ogType: item.category === "guide" ? "article" : "website",
    keywords: [
      item.name,
      "solar financing",
      "solar loans",
      item.category_label,
    ],
  });
}

export default async function FinancingDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = getFinancingPage(slug);
  if (!item) notFound();

  const related = item.related_slugs
    .map((relatedSlug) => getFinancingPage(relatedSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#start-project" ctaLabel="Start my project" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {item.category_label}
          {item.researched_detail === false ? " · overview" : ""}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {item.headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {item.summary}
        </p>

        {item.key_facts.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">At a glance</h2>
            <dl className="mt-4 divide-y divide-stone-2/80 border-y border-stone-2/80">
              {item.key_facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <dt className="text-sm font-medium text-ink">{fact.label}</dt>
                  <dd className="text-sm text-ink-muted sm:text-right">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <div className="mt-10 space-y-8">
          {item.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {section.body}
              </p>
              {section.table ? (
                <div className="mt-4 overflow-x-auto">
                  {section.table.caption ? (
                    <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
                      {section.table.caption}
                    </p>
                  ) : null}
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-2/80">
                        {section.table.headers.map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="py-2 pr-3 font-semibold text-ink"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr
                          key={row.join("|")}
                          className="border-b border-stone-2/60 align-top"
                        >
                          {row.map((cell, i) => (
                            <td
                              key={`${row[0]}-${i}`}
                              className="py-2.5 pr-3 text-ink-muted"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {item.questions_to_ask.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">
              Questions to ask
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {item.questions_to_ask.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.red_flags.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">Red flags</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {item.red_flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <LocationFaqSection faqs={item.faqs} />

        {item.official_url ? (
          <p className="mt-8 text-sm">
            <a
              href={item.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-canopy hover:underline"
            >
              Official site →
            </a>
          </p>
        ) : null}

        {related.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">Related</h2>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {related.map((rel) => (
                <li key={rel.slug}>
                  <Link
                    href={`/financing/${rel.slug}`}
                    className="text-canopy hover:underline"
                  >
                    {rel.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.sources.length ? (
          <section className="mt-10">
            <h2 className="font-display text-xl text-ink">Sources</h2>
            <ul className="mt-3 space-y-2 text-xs text-ink-muted">
              {item.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-canopy hover:underline"
                  >
                    {source.title}
                  </a>
                  <span>
                    {" "}
                    · accessed {source.accessed}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div id="start-project">
          <LocationProjectCta
            locationLabel="your home"
            sourceSlug={`financing:${item.slug}`}
            defaultState=""
          />
        </div>

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/financing" className="text-canopy hover:underline">
            All financing guides
          </Link>
          {" · "}
          <Link href="/tools/quote-check" className="text-canopy hover:underline">
            Quote check
          </Link>
          {" · "}
          <Link href="/incentives" className="text-canopy hover:underline">
            Incentives
          </Link>
        </p>
      </article>
    </main>
  );
}
