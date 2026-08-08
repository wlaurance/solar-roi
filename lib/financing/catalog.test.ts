import { describe, expect, it } from "vitest";
import {
  FINANCING_CATEGORY_LABEL,
  getFinancingPage,
  listFinancingByCategory,
  listFinancingIndex,
  listFinancingPages,
} from "@/lib/financing/catalog";

describe("financing catalog", () => {
  it("lists index entries with required fields", () => {
    const index = listFinancingIndex();
    expect(index.length).toBeGreaterThanOrEqual(10);
    for (const entry of index) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.blurb.length).toBeGreaterThan(0);
      expect(FINANCING_CATEGORY_LABEL[entry.category]).toBeTruthy();
    }
  });

  it("loads a detail page for every index slug", () => {
    const pages = listFinancingPages();
    expect(pages).toHaveLength(listFinancingIndex().length);
    for (const page of pages) {
      expect(page.headline.length).toBeGreaterThan(0);
      expect(page.summary.length).toBeGreaterThan(0);
      expect(page.sections.length).toBeGreaterThan(0);
      expect(page.faqs.length).toBeGreaterThan(0);
      expect(page.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("returns null for unknown slugs", () => {
    expect(getFinancingPage("not-a-real-lender")).toBeNull();
  });

  it("groups guides separately from lenders", () => {
    const guides = listFinancingByCategory("guide");
    const lenders = listFinancingByCategory("lender");
    expect(guides.some((g) => g.slug === "how-solar-loans-work")).toBe(true);
    expect(lenders.some((l) => l.slug === "goodleap")).toBe(true);
    expect(guides.every((g) => g.category === "guide")).toBe(true);
  });

  it("includes GoodLeap integration table content", () => {
    const page = getFinancingPage("goodleap");
    expect(page).not.toBeNull();
    const tableSection = page?.sections.find((s) => s.table);
    expect(tableSection?.table?.rows.length).toBeGreaterThanOrEqual(3);
  });
});
