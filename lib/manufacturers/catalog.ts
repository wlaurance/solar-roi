import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type ManufacturerIndexEntry = {
  slug: string;
  name: string;
  category: string;
  priority: number;
  blurb: string;
};

export type ManufacturerProduct = {
  name: string;
  category: string;
  warranty_years_product: number | null;
  warranty_years_performance: number | null;
  notes: string;
};

export type ManufacturerCta = {
  primary: string;
  requires: "project_and_account";
  copy: string;
};

export type Manufacturer = {
  slug: string;
  name: string;
  legal_name: string;
  categories: string[];
  hq_country: string;
  us_manufacturing_notes: string;
  headline: string;
  summary: string;
  product_lines: ManufacturerProduct[];
  typical_pairings: string[];
  questions_to_ask_installer: string[];
  red_flags: string[];
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  official_url: string | null;
  confidence: string;
  sources: { title: string; url: string; accessed: string }[];
  researched_detail?: boolean;
  cta: ManufacturerCta;
};

export function listManufacturerIndex(): ManufacturerIndexEntry[] {
  const path = join(process.cwd(), "data", "manufacturers", "index.json");
  return (JSON.parse(readFileSync(path, "utf8")) as ManufacturerIndexEntry[])
    .slice()
    .sort((a, b) => b.priority - a.priority);
}

export function getManufacturer(slug: string): Manufacturer | null {
  const path = join(
    process.cwd(),
    "data",
    "manufacturers",
    "details",
    `${slug}.json`,
  );
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Manufacturer;
}

export function listManufacturers(): Manufacturer[] {
  return listManufacturerIndex()
    .map((e) => getManufacturer(e.slug))
    .filter((m): m is Manufacturer => Boolean(m));
}
