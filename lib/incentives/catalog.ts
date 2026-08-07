import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type FederalIncentiveIndexEntry = {
  slug: string;
  name: string;
  status: string;
  priority: string;
};

export type IncentiveSection = { heading: string; body: string };
export type IncentiveFaq = { question: string; answer: string };

export type FederalIncentive = {
  kind: "federal";
  slug: string;
  title: string;
  headline: string;
  summary: string;
  status: string;
  effective_dates: {
    start: string | null;
    end: string | null;
    notes: string;
  };
  percent_or_amount: string;
  eligible_tech: string[];
  homeowner_eligibility_notes: string;
  claim_howto: string;
  official_urls: string[];
  sections: IncentiveSection[];
  faqs: IncentiveFaq[];
  common_myths?: string[];
  confidence: string;
  sources: { title: string; url: string; accessed: string }[];
  last_verified: string;
};

export type StateIncentiveIndexEntry = {
  slug: string;
  state: string;
  priority: number;
};

export type StateProgram = {
  name: string;
  status: string;
  summary: string;
  tech: string[];
  official_url: string;
  dollar_amounts: string;
  stacking_notes: string;
};

export type StateIncentive = {
  kind: "state";
  slug: string;
  state: string;
  state_name: string;
  headline: string;
  summary: string;
  net_metering_or_billing_overview: string;
  programs: StateProgram[];
  property_tax_sales_tax_notes: string;
  hoa_solar_access_law: string;
  sections: IncentiveSection[];
  faqs: IncentiveFaq[];
  related_utility_slugs: string[];
  confidence: string;
  sources: { title: string; url: string; accessed: string }[];
  last_verified: string;
  researched_detail?: boolean;
};

export function listFederalIncentiveIndex(): FederalIncentiveIndexEntry[] {
  const path = join(
    process.cwd(),
    "data",
    "incentives",
    "federal",
    "index.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as FederalIncentiveIndexEntry[];
}

export function getFederalIncentive(slug: string): FederalIncentive | null {
  const path = join(
    process.cwd(),
    "data",
    "incentives",
    "federal",
    `${slug}.json`,
  );
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as FederalIncentive;
}

export function listStateIncentiveIndex(): StateIncentiveIndexEntry[] {
  const path = join(process.cwd(), "data", "incentives", "states", "index.json");
  return (
    JSON.parse(readFileSync(path, "utf8")) as StateIncentiveIndexEntry[]
  ).slice().sort((a, b) => b.priority - a.priority);
}

export function getStateIncentive(slug: string): StateIncentive | null {
  const path = join(
    process.cwd(),
    "data",
    "incentives",
    "states",
    `${slug}.json`,
  );
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as StateIncentive;
}
