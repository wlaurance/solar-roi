import type { LocationFaq, LocationRecord } from "@/lib/locations/types";
import { locationDisplayName } from "@/lib/locations/catalog";

/**
 * Mix locality-aware FAQ stock with any AI-generated FAQs for the page.
 * Generated items win on question uniqueness (case-insensitive).
 */
export function mixLocationFaqs(
  location: LocationRecord,
  generated: LocationFaq[] | null | undefined,
): LocationFaq[] {
  const place = locationDisplayName(location);
  const short =
    location.type === "county" ? location.name : `${location.name}, ${location.state}`;

  const stock: LocationFaq[] = [
    {
      question: `Is solar worth it in ${short}?`,
      answer: `Most homeowners in ${place} see value when their roof gets decent sun, their utility rates are rising, and they can use federal tax credits plus any local incentives. SolarFlow models payback for your exact address using Google Solar roof data — not county averages.`,
    },
    {
      question: `How much does a residential solar system cost in ${short}?`,
      answer: `Installed cost usually scales with system size (kW), roof complexity, and whether you add a battery. National ballparks often land around several dollars per watt before incentives; your PDF report and dashboard use your modeled layout for a tighter number.`,
    },
    {
      question: `Do I need a permit to install solar in ${place}?`,
      answer: `Yes — residential rooftop solar almost always needs a building/electrical permit and utility interconnection approval. ${
        location.type === "county"
          ? `${location.name} (or the city within it) publishes the checklist.`
          : `The city of ${location.name} and/or ${location.state} county typically review plans.`
      } SolarFlow’s permit tools summarize typical steps for your locality.`,
    },
    {
      question: `What incentives are available for solar in ${location.state}?`,
      answer: `Most homeowners can claim the federal residential clean energy credit when eligible. ${location.state} may also have state, utility, or local programs that change over time. Always confirm current rules with a tax advisor and your installer.`,
    },
    {
      question: `How long does solar installation take in ${short}?`,
      answer: `Design and permitting often take longer than the physical install. Many homes go from contract to permission-to-operate in a few months, depending on inspection backlog and the utility. Your dashboard tracks the permitting side so the timeline is clearer.`,
    },
    {
      question: `Should I add a battery with solar in ${place}?`,
      answer: `Batteries help with backup power and, in some rate structures, shifting usage off-peak. They raise upfront cost. SolarFlow’s ROI tools let you toggle battery so you can compare paths before you commit.`,
    },
  ];

  const seen = new Set<string>();
  const out: LocationFaq[] = [];

  for (const faq of [...(generated ?? []), ...stock]) {
    const key = faq.question.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      question: faq.question.trim(),
      answer: faq.answer.trim(),
    });
    if (out.length >= 8) break;
  }

  return out;
}
