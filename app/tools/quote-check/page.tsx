import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { QuoteCheckForm } from "@/components/tools/quote-check-form";
import { COST_PER_KW } from "@/lib/roi/calculate";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How to compare solar quotes",
  description:
    "Normalize installer quotes to $/W, spot battery bundling tricks, and check pricing against transparent planning benchmarks — without another sales call.",
  path: "/tools/quote-check",
  image: "quote-check",
  keywords: [
    "compare solar quotes",
    "solar cost per watt",
    "solar quote checklist",
    "solar battery bundling",
  ],
});

const QUESTIONS = [
  {
    q: "What is the cash price before incentives?",
    a: "Ignore payment-factor marketing. Get the gross installed price and system size in kW so you can compute $/W.",
  },
  {
    q: "Is battery included, and at what line-item cost?",
    a: "Bundles hide PV pricing. Separate battery so you can compare solar $/W apples-to-apples.",
  },
  {
    q: "What rate and export credit assumptions drive the savings chart?",
    a: "Ask for your rate schedule and Net Billing / export assumptions in writing. If they won’t show work, treat savings as soft.",
  },
  {
    q: "What is excluded (main panel upgrade, roof work, trenching)?",
    a: "Change orders after signature are a common pain. Get exclusions in the proposal.",
  },
  {
    q: "What are equipment brands, warranties, and workmanship terms?",
    a: "Cheapest isn’t always best — but premium needs a reason beyond glossy savings.",
  },
  {
    q: "If financing, what is the dealer fee, APR, and payment tier schedule?",
    a: "Payment-factor marketing hides cost. Get cash price, financed amount, dealer fee, and any re-amortization in writing — see our financing guides.",
  },
];

export default function QuoteCheckPage() {
  const benchmarkW = (COST_PER_KW / 1000).toFixed(2);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#decoder" ctaLabel="Check a quote" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Almost-buyer toolkit
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          How to compare solar quotes without a 90-minute pitch
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Finding installers is easy. Evaluating three PDFs without trusting any of
          them is the hard part. Normalize to dollars per watt, separate battery,
          and pressure-test against a planning benchmark (~${benchmarkW}/W before
          incentives in SolarFlow’s model).
        </p>

        <section className="mt-12 space-y-8">
          <h2 className="font-display text-2xl text-ink">
            Questions that surface real numbers
          </h2>
          {QUESTIONS.map((item) => (
            <div key={item.q}>
              <h3 className="text-base font-semibold text-ink">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {item.a}
              </p>
            </div>
          ))}
        </section>

        <section id="decoder">
          <QuoteCheckForm />
        </section>

        <p className="mt-12 text-sm text-ink-muted">
          After the market check,{" "}
          <Link href="/signup" className="text-canopy hover:underline">
            model your roof
          </Link>{" "}
          so the kW on the quote matches your layout — then share a spouse-ready
          report. Also see{" "}
          <Link href="/solar-for" className="text-canopy hover:underline">
            utility bill guides
          </Link>
          ,{" "}
          <Link href="/financing" className="text-canopy hover:underline">
            financing guides
          </Link>
          , and{" "}
          <Link href="/solar-permits" className="text-canopy hover:underline">
            permit timelines
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
