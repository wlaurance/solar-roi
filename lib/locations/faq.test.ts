import { describe, expect, it } from "vitest";
import { mixLocationFaqs } from "@/lib/locations/faq";
import type { LocationRecord } from "@/lib/locations/types";

const sample: LocationRecord = {
  type: "county",
  name: "Contra Costa County",
  state: "CA",
  state_name: "California",
  population: 1_000_000,
  slug: "contra-costa-county-ca",
};

describe("mixLocationFaqs", () => {
  it("prefers generated FAQs and fills with stock", () => {
    const faqs = mixLocationFaqs(sample, [
      {
        question: "Custom question?",
        answer: "Custom answer for Contra Costa.",
      },
    ]);
    expect(faqs[0].question).toBe("Custom question?");
    expect(faqs.length).toBeGreaterThan(1);
    expect(faqs.some((f) => f.question.includes("Contra Costa"))).toBe(true);
  });

  it("dedupes by question", () => {
    const faqs = mixLocationFaqs(sample, [
      {
        question: `Is solar worth it in ${sample.name}?`,
        answer: "Generated take.",
      },
    ]);
    const matches = faqs.filter((f) =>
      f.question.toLowerCase().includes("is solar worth it"),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].answer).toBe("Generated take.");
  });
});
