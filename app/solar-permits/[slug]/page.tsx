import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationProjectCta } from "@/components/solar-in/location-project-cta";
import { getPermitGuideBySlug } from "@/lib/permits/catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPermitGuideBySlug(slug);
  if (!guide) return { title: "Solar permits | SolarFlow" };
  return {
    title: `Solar permits: ${guide.name} | SolarFlow`,
    description: `Typical solar permitting and interconnection steps for ${guide.name} (${guide.region}). Know the process before you sign.`,
    alternates: { canonical: `/solar-permits/${guide.slug}` },
  };
}

function defaultStateFromRegion(region: string): string {
  if (/\bCA\b|California/i.test(region)) return "CA";
  if (/\bNY\b|New York/i.test(region)) return "NY";
  return "";
}

export default async function SolarPermitGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getPermitGuideBySlug(slug);
  if (!guide) notFound();

  const state = defaultStateFromRegion(guide.region);
  const isUtility = /interconnection/i.test(guide.name);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#start-project" ctaLabel="Start my project" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {isUtility ? "Utility interconnection" : "Permit timeline"} ·{" "}
          {guide.region}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {guide.name}: what happens after you say yes
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Soft costs and surprise process are why excited buyers ghost installers.
          This checklist is a planning overview — always confirm current rules with
          the authority having jurisdiction and your utility.
        </p>

        <ol className="mt-12 space-y-8">
          {guide.steps.map((step, i) => (
            <li key={step.id} className="relative pl-10">
              <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-canopy text-xs font-semibold text-white">
                {i + 1}
              </span>
              <h2 className="font-display text-2xl text-ink">{step.title}</h2>
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

        <div className="mt-10">
          <a href="#start-project" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Start a project for my address
          </a>
        </div>

        <LocationProjectCta
          locationLabel={guide.name}
          sourceSlug={`permit:${guide.slug}`}
          defaultState={state || "CA"}
          defaultCity={
            guide.slug === "walnut-creek"
              ? "Walnut Creek"
              : guide.slug === "contra-costa"
                ? ""
                : ""
          }
        />

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link
            href="/solar-permits"
            className="text-canopy underline-offset-2 hover:underline"
          >
            All permit guides
          </Link>
          {" · "}
          <Link
            href="/solar-for"
            className="text-canopy underline-offset-2 hover:underline"
          >
            Utility bill guides
          </Link>
        </p>
      </article>
    </main>
  );
}
