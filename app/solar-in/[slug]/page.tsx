import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icons } from "@/components/icons";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import {
  getLocationBySlug,
  locationDisplayName,
} from "@/lib/locations/catalog";
import { ensureGeoPageContent } from "@/lib/locations/ensure-content";
import { mixLocationFaqs } from "@/lib/locations/faq";

/** Lazy AI content — do not pre-render all ~700 pages at build time. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocationBySlug(slug);
  if (!location) return { title: "Solar locations | SolarFlow" };
  const place = locationDisplayName(location);
  return {
    title: `Solar in ${place} | SolarFlow`,
    description: `Rooftop solar guidance for ${place}: permitting overview, FAQs, and a free project teaser for your home address.`,
    alternates: { canonical: `/solar-in/${location.slug}` },
  };
}

export default async function SolarInLocationPage({ params }: Props) {
  const { slug } = await params;
  const location = getLocationBySlug(slug);
  if (!location) notFound();

  const place = locationDisplayName(location);
  let headline = `Solar in ${place}`;
  let summary =
    "Explore rooftop solar for this area, then create a project for your exact home address.";
  let sections: { heading: string; body: string }[] = [];
  let faqs = mixLocationFaqs(location, null);

  try {
    const { content } = await ensureGeoPageContent(location);
    headline = content.headline;
    summary = content.summary;
    sections = content.sections;
    faqs = mixLocationFaqs(location, content.faqs);
  } catch (err) {
    console.error("geo page content generation failed:", err);
  }

  return (
    <main className="flex-1">
      <header className="border-b border-stone-2/70 bg-surface/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canopy text-white">
              <Icons.sun className="h-4 w-4" />
            </span>
            <span className="font-display text-xl tracking-tight">SolarFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary px-3 py-2 text-xs">
              Sign in
            </Link>
            <a href="#start-project" className="btn-primary px-3 py-2 text-xs">
              Start my project
            </a>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {location.type === "county" ? "County guide" : "City guide"} ·{" "}
          {location.state_name}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">{summary}</p>
        <p className="mt-3 text-xs text-ink-muted">
          Population ~{location.population.toLocaleString("en-US")}
        </p>

        <div className="mt-8">
          <a href="#start-project" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Create your project for this home
          </a>
        </div>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl text-ink">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
          {!sections.length ? (
            <p className="text-sm text-ink-muted">
              Local solar details are generating. Use the form below to start your
              home project now — the full guide will appear on the next visit.
            </p>
          ) : null}
        </div>

        <LocationFaqSection faqs={faqs} />

        <LocationProjectCta
          locationLabel={place}
          sourceSlug={location.slug}
          defaultState={location.state}
          defaultCity={location.type === "city" ? location.name : ""}
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          Looking for another area?{" "}
          <Link href="/solar-in" className="text-canopy underline-offset-2 hover:underline">
            Browse solar location guides
          </Link>
        </p>
      </article>
    </main>
  );
}
