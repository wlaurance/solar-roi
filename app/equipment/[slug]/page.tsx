import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EquipmentLocalSearchCta } from "@/components/equipment/equipment-local-search-cta";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import {
  getManufacturer,
  listManufacturerIndex,
} from "@/lib/manufacturers/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listManufacturerIndex().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getManufacturer(slug);
  if (!item) return { title: "Equipment | SolarFlow" };
  return {
    title: `${item.name} solar equipment | SolarFlow`,
    description: item.summary.slice(0, 155),
    alternates: { canonical: `/equipment/${item.slug}` },
  };
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = getManufacturer(slug);
  if (!item) notFound();

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#local-search" ctaLabel="Find installers" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {item.categories.join(" · ")}
          {item.researched_detail === false ? " · overview" : ""}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {item.headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {item.summary}
        </p>

        {item.product_lines.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">Product lines</h2>
            <ul className="mt-4 space-y-4">
              {item.product_lines.map((p) => (
                <li key={p.name} className="border-b border-stone-2/80 pb-4">
                  <h3 className="font-semibold text-ink">{p.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
                    {p.category}
                    {p.warranty_years_product != null
                      ? ` · ${p.warranty_years_product}-yr product warranty`
                      : ""}
                    {p.warranty_years_performance != null
                      ? ` · ${p.warranty_years_performance}-yr performance`
                      : ""}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">{p.notes}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

        {item.questions_to_ask_installer.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">
              Questions to ask installers
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {item.questions_to_ask_installer.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.red_flags.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">Red flags</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {item.red_flags.map((q) => (
                <li key={q}>{q}</li>
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
              Official manufacturer site →
            </a>
          </p>
        ) : null}

        <EquipmentLocalSearchCta
          brandName={item.name}
          brandSlug={item.slug}
          ctaPrimary={item.cta.primary}
          ctaCopy={item.cta.copy}
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link href="/equipment" className="text-canopy hover:underline">
            All manufacturers
          </Link>
          {" · "}
          <Link href="/tools/quote-check" className="text-canopy hover:underline">
            Quote check
          </Link>
        </p>
      </article>
    </main>
  );
}
