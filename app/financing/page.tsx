import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  FINANCING_CATEGORY_LABEL,
  listFinancingByCategory,
  type FinancingCategory,
} from "@/lib/financing/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Solar financing guides",
  description:
    "How embedded solar loans, lender APIs, and marketplace widgets work — GoodLeap, Sunlight, Wisetack, EnergySage, and what to demand on your proposal before you sign.",
  path: "/financing",
  image: "financing",
  keywords: [
    "solar financing",
    "solar loans",
    "GoodLeap",
    "Sunlight Financial",
    "solar loan dealer fees",
    "embedded solar finance",
  ],
});

const CATEGORIES: FinancingCategory[] = [
  "guide",
  "lender",
  "marketplace",
  "aggregator",
];

export default function FinancingIndexPage() {
  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Create account" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Financing · kitchen-table reality check
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar financing for homeowners
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Today’s solar loan is usually an API decision inside the proposal — soft
          pulls, dealer fees, and multi-tier payments — not a separate bank trip.
          Use these guides to decode GoodLeap, Sunlight, marketplaces, and the
          widgets that sent you here. For 2026 cash/loan buys, do not assume a
          federal 25D tax-credit payment drop still applies.
        </p>

        {CATEGORIES.map((cat) => {
          const items = listFinancingByCategory(cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="mt-12">
              <h2 className="font-display text-2xl text-ink">
                {FINANCING_CATEGORY_LABEL[cat]}
              </h2>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/financing/${item.slug}`}
                      className="group flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-2/80 py-3"
                    >
                      <span className="font-display text-xl text-ink group-hover:text-canopy">
                        {item.name}
                      </span>
                      <span className="max-w-sm text-right text-xs text-ink-muted">
                        {item.blurb}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
          <Link href="/tools/quote-check" className="text-canopy hover:underline">
            Quote check
          </Link>
          <Link href="/incentives" className="text-canopy hover:underline">
            Incentives
          </Link>
          <Link href="/equipment" className="text-canopy hover:underline">
            Equipment
          </Link>
        </p>
      </div>
    </main>
  );
}
