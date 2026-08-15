import { describe, expect, it } from "vitest";
import { allHoaFaqs, getHoaTopic, listHoaTopics } from "@/lib/hoa/faq";
import {
  formatHoaPackagePrice,
  HOA_PACKAGE_AMOUNT_CENTS,
} from "@/lib/stripe/pricing";

describe("hoa faq catalog", () => {
  it("exposes multiple topics with FAQs", () => {
    const topics = listHoaTopics();
    expect(topics.length).toBeGreaterThanOrEqual(4);
    for (const t of topics) {
      expect(t.slug).toBeTruthy();
      expect(t.faqs.length).toBeGreaterThan(0);
      expect(getHoaTopic(t.slug)?.title).toBe(t.title);
    }
    expect(allHoaFaqs().length).toBeGreaterThan(10);
  });
});

describe("hoa package pricing", () => {
  it("is $29.97", () => {
    expect(HOA_PACKAGE_AMOUNT_CENTS).toBe(2997);
    expect(formatHoaPackagePrice()).toBe("$29.97");
  });
});
