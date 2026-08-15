import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LocationFaqSection } from "@/components/solar-in/location-faq";
import { getHoaTopic, listHoaTopics } from "@/lib/hoa/faq";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return listHoaTopics().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getHoaTopic(slug);
  if (!topic) return {};
  return pageMetadata({
    title: `${topic.title} — HOA solar`,
    description: topic.summary,
    path: `/hoa/${topic.slug}`,
    image: "permits",
    keywords: ["HOA solar", topic.title, "architectural review"],
  });
}

export default async function HoaTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getHoaTopic(slug);
  if (!topic) notFound();

  const faqs = topic.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
  }));

  return (
    <main className="flex-1">
      <MarketingHeader
        ctaHref="/signup?next=/projects&from=hoa"
        ctaLabel="Start your package"
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/hoa"
          className="text-sm text-ink-muted hover:text-canopy"
        >
          ← All HOA topics
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-brass">
          HOA solar
        </p>
        <h1 className="font-display mt-3 text-4xl text-ink sm:text-5xl">
          {topic.title}
        </h1>
        <p className="mt-4 max-w-2xl text-ink-muted">{topic.summary}</p>

        <LocationFaqSection faqs={faqs} />

        <section className="mt-14 border-t border-stone-2/80 pt-10">
          <h2 className="font-display text-2xl text-ink">
            Ready to build your packet?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Create a SolarFlow account, add your home as a project, and unlock
            the HOA package to upload docs and work with Solar bot.
          </p>
          <Link
            href="/signup?next=/projects&from=hoa"
            className="btn-primary mt-5 inline-flex"
          >
            Create account
          </Link>
        </section>
      </div>
    </main>
  );
}
