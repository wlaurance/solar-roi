import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { listManufacturerIndex } from "@/lib/manufacturers/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Solar equipment manufacturers",
  description:
    "Residential solar modules, inverters, and batteries homeowners see on quotes — decode proposals, then search local installers with a free SolarFlow project.",
  path: "/equipment",
  image: "equipment",
  keywords: [
    "solar panels",
    "solar inverters",
    "home batteries",
    "solar equipment brands",
  ],
});

const CATEGORY_LABEL: Record<string, string> = {
  module: "Modules (panels)",
  battery: "Batteries",
  inverter: "Inverters",
};

export default function EquipmentIndexPage() {
  const all = listManufacturerIndex();
  const categories = ["module", "battery", "inverter"] as const;

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Create account" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Equipment · quote decoder companion
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          Solar equipment manufacturers
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">
          Use these guides to decode what’s on your proposal. We don’t publish
          national dealer directories — local installer search requires creating a
          free project for your address.
        </p>

        {categories.map((cat) => {
          const items = all.filter((m) => m.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="mt-12">
              <h2 className="font-display text-2xl text-ink">
                {CATEGORY_LABEL[cat] ?? cat}
              </h2>
              <ul className="mt-4 space-y-3">
                {items.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={`/equipment/${m.slug}`}
                      className="group flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-2/80 py-3"
                    >
                      <span className="font-display text-xl text-ink group-hover:text-canopy">
                        {m.name}
                      </span>
                      <span className="max-w-sm text-right text-xs text-ink-muted">
                        {m.blurb}
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
            Quote market check
          </Link>
          <Link
            href="/incentives/federal/domestic-content-and-manufacturing"
            className="text-canopy hover:underline"
          >
            Made-in-USA myths
          </Link>
          <Link href="/financing" className="text-canopy hover:underline">
            Financing
          </Link>
          <Link href="/solar-for" className="text-canopy hover:underline">
            Utility guides
          </Link>
        </p>
      </div>
    </main>
  );
}
