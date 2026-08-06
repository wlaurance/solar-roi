"use client";

import type { LocationFaq } from "@/lib/locations/types";

export function LocationFaqSection({ faqs }: { faqs: LocationFaq[] }) {
  if (!faqs.length) return null;

  return (
    <section className="mt-14" aria-labelledby="location-faq-heading">
      <h2
        id="location-faq-heading"
        className="font-display text-3xl tracking-tight text-ink"
      >
        Frequently asked questions
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Common solar questions for this area — start a project for answers tied to
        your roof and utility bill.
      </p>
      <div className="mt-6 divide-y divide-stone-2/80 border-y border-stone-2/80">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-4">
            <summary className="cursor-pointer list-none font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-4">
                <span>{faq.question}</span>
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-brass transition group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
