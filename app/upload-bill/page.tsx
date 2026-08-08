import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { pageMetadata } from "@/lib/seo";
import { listUtilityIndex } from "@/lib/utilities/catalog";

export const metadata = pageMetadata({
  title: "Upload your power bill",
  description:
    "Upload a PDF electric bill from PG&E, SCE, FPL, and other utilities — SolarFlow extracts usage and dollars to model solar ROI.",
  path: "/upload-bill",
  image: "solar-for",
  keywords: [
    "upload power bill",
    "utility bill PDF",
    "PG&E bill upload",
    "solar usage data",
  ],
});

export default function UploadBillIndexPage() {
  const utilities = listUtilityIndex()
    .slice()
    .sort((a, b) => b.priority_score - a.priority_score);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="#utilities" ctaLabel="Choose utility" />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px 420px at 15% 0%, color-mix(in srgb, var(--sage) 70%, transparent), transparent 60%), radial-gradient(700px 380px at 90% 10%, color-mix(in srgb, var(--brass-soft) 45%, transparent), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
            SolarFlow · bill import
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-6xl">
            Upload your power bill
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
            Pick your utility, attach a PDF statement, and we&apos;ll pull usage
            and dollars into a solar project — after you create a free account.
          </p>
        </div>
      </section>

      <section id="utilities" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl text-ink">Utilities</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Same parser for every territory — PDF to structured bill data.
        </p>
        <ul className="mt-8 divide-y divide-stone-2/80 border-y border-stone-2/80">
          {utilities.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/upload-bill/${u.slug}`}
                className="group flex items-center justify-between gap-4 py-4 transition hover:bg-sage/20"
              >
                <div>
                  <p className="font-medium text-ink group-hover:text-canopy-deep">
                    Upload your {u.name} bill
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {u.state} · {u.why}
                  </p>
                </div>
                <span className="text-sm font-medium text-canopy">Upload →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
