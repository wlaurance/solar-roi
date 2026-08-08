import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type FinancingCategory =
  | "guide"
  | "lender"
  | "marketplace"
  | "aggregator";

export type FinancingIndexEntry = {
  slug: string;
  name: string;
  category: FinancingCategory;
  priority: number;
  blurb: string;
};

export type FinancingTable = {
  caption?: string;
  headers: string[];
  rows: string[][];
};

export type FinancingSection = {
  heading: string;
  body: string;
  table?: FinancingTable;
};

export type FinancingFaq = { question: string; answer: string };

export type FinancingKeyFact = { label: string; value: string };

export type FinancingPage = {
  slug: string;
  name: string;
  category: FinancingCategory;
  category_label: string;
  headline: string;
  summary: string;
  key_facts: FinancingKeyFact[];
  sections: FinancingSection[];
  questions_to_ask: string[];
  red_flags: string[];
  faqs: FinancingFaq[];
  official_url: string | null;
  related_slugs: string[];
  confidence: string;
  sources: { title: string; url: string; accessed: string }[];
  last_verified: string;
  researched_detail?: boolean;
};

const CATEGORY_ORDER: FinancingCategory[] = [
  "guide",
  "lender",
  "marketplace",
  "aggregator",
];

export const FINANCING_CATEGORY_LABEL: Record<FinancingCategory, string> = {
  guide: "Guides",
  lender: "Tier-one loan providers",
  marketplace: "Marketplaces & specialized lenders",
  aggregator: "Aggregators & proposal platforms",
};

export function listFinancingIndex(): FinancingIndexEntry[] {
  const path = join(process.cwd(), "data", "financing", "index.json");
  return (JSON.parse(readFileSync(path, "utf8")) as FinancingIndexEntry[])
    .slice()
    .sort((a, b) => {
      const cat =
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (cat !== 0) return cat;
      return b.priority - a.priority;
    });
}

export function getFinancingPage(slug: string): FinancingPage | null {
  const path = join(
    process.cwd(),
    "data",
    "financing",
    "details",
    `${slug}.json`,
  );
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as FinancingPage;
}

export function listFinancingPages(): FinancingPage[] {
  return listFinancingIndex()
    .map((e) => getFinancingPage(e.slug))
    .filter((p): p is FinancingPage => Boolean(p));
}

export function listFinancingByCategory(
  category: FinancingCategory,
): FinancingIndexEntry[] {
  return listFinancingIndex().filter((e) => e.category === category);
}
