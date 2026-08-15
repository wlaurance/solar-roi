import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { allHoaFaqs, listHoaTopics } from "@/lib/hoa/faq";
import { hoaCommerceAvailable } from "@/lib/hoa/entitlements";
import { formatHoaPackagePrice } from "@/lib/stripe/pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "HOA solar approval — what boards want & how to get ready",
  description:
    "Homeowners planning rooftop solar often need HOA architectural approval first. Learn what associations ask for, then build your packet with SolarFlow.",
  path: "/hoa",
  image: "permits",
  keywords: [
    "HOA solar approval",
    "architectural review solar",
    "HOA solar packet",
    "CC&R solar",
    "homeowners association solar",
  ],
});

export default function HoaMarketingPage() {
  const topics = listHoaTopics();
  const faqs = allHoaFaqs().map((f) => ({
    question: f.question,
    answer: f.answer,
  }));
  const commerce = hoaCommerceAvailable();
  const price = formatHoaPackagePrice();

  return (
    <main className="flex-1">
      <MarketingHeader
        ctaHref="/signup?next=/projects&from=hoa"
        ctaLabel="Start your package"
      />

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 420px at 15% 0%, color-mix(in srgb, var(--sage) 70%, transparent), transparent 55%), radial-gradient(700px 380px at 90% 10%, color-mix(in srgb, var(--brass-soft) 45%, transparent), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="font-display text-5xl tracking-tight text-ink sm:text-6xl">
            SolarFlow
          </p>
          <h1 className="mt-4 max-w-xl text-2xl font-medium leading-snug text-ink sm:text-3xl">
            Get HOA approval for rooftop solar — without guessing what the board
            wants.
          </h1>
          <p className="mt-4 max-w-lg text-ink-muted">
            Public answers to the questions associations actually ask. Then
            create an account and build your approval package for one project
            {commerce ? ` (${price})` : ""}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup?next=/projects&from=hoa"
              className="btn-primary"
            >
              Create account
            </Link>
            <a href="#hoa-faqs" className="btn-secondary">
              Browse HOA FAQs
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <section className="mt-4">
          <h2 className="font-display text-3xl text-ink">Topics boards care about</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dive into the questions HOAs raise before they stamp solar.
          </p>
          <ul className="mt-6 space-y-3">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/hoa/${t.slug}`}
                  className="group flex flex-col border-b border-stone-2/80 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className="font-display text-xl text-ink group-hover:text-canopy">
                    {t.title}
                  </span>
                  <span className="mt-1 text-sm text-ink-muted sm:mt-0 sm:max-w-xs sm:text-right">
                    {t.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {commerce ? (
          <section className="mt-14 border-y border-stone-2/80 py-10">
            <h2 className="font-display text-3xl text-ink">
              One project. {price}. Full HOA toolkit.
            </h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              After you sign up and create a project for your address, unlock
              document uploads (rules, examples, templates), Solar bot with tool
              access to parse CC&Rs, pull your solar roof map, draft the
              application, and email you when a reply is ready if you’re away.
            </p>
            <Link
              href="/signup?next=/projects&from=hoa"
              className="btn-primary mt-6 inline-flex"
            >
              Get started
            </Link>
          </section>
        ) : null}

        <div id="hoa-faqs">
          <LocationFaqSection faqs={faqs} />
        </div>
      </div>
    </main>
  );
}
