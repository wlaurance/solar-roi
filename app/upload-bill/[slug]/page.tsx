import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { BillUploadForm } from "@/components/power-bills/bill-upload-form";
import { ClaimPendingBill } from "@/components/power-bills/claim-pending-bill";
import { pageMetadata } from "@/lib/seo";
import {
  getUtilityBySlug,
  listUtilitySlugs,
} from "@/lib/utilities/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listUtilitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) {
    return pageMetadata({
      title: "Upload your power bill",
      description: "Upload a utility PDF bill to model solar ROI.",
      path: "/upload-bill",
      image: "solar-for",
    });
  }
  return pageMetadata({
    title: `Upload your ${utility.name} bill`,
    description: `Attach a ${utility.name} PDF statement. Create a free SolarFlow account to submit — we extract kWh and dollars for your solar model.`,
    path: `/upload-bill/${utility.slug}`,
    image: "solar-for",
    keywords: [
      `${utility.name} bill upload`,
      `upload ${utility.name} bill`,
      "utility bill PDF",
      "solar usage",
    ],
  });
}

export default async function UploadBillUtilityPage({ params }: Props) {
  const { slug } = await params;
  const utility = getUtilityBySlug(slug);
  if (!utility) notFound();

  return (
    <main className="flex-1">
      <MarketingHeader
        ctaHref="#upload"
        ctaLabel={`Upload ${utility.name} bill`}
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={null}>
          <ClaimPendingBill />
        </Suspense>

        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {utility.state_name} · {utility.name}
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          Upload your {utility.name} bill
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Drop a recent PDF statement. You can attach the file now — when you
          hit submit we&apos;ll ask you to create a free account, then send the
          bill to secure storage and parse usage into your project.
        </p>

        <aside className="mt-8 border-l-2 border-brass pl-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            What we extract
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Billing period, amount due, kWh usage, rate schedule hints, and
            service address when the PDF includes them — powered by layout-aware
            PDF→HTML prep plus Gemini Flash.
          </p>
        </aside>

        <div id="upload">
          <BillUploadForm
            utilitySlug={utility.slug}
            utilityName={utility.name}
            variant="marketing"
          />
        </div>

        <p className="mt-10 text-center text-xs text-ink-muted">
          <Link
            href="/upload-bill"
            className="text-canopy underline-offset-2 hover:underline"
          >
            All utilities
          </Link>
          {" · "}
          <Link
            href={`/solar-for/${utility.slug}`}
            className="text-canopy underline-offset-2 hover:underline"
          >
            {utility.name} solar guide
          </Link>
        </p>
      </article>
    </main>
  );
}
