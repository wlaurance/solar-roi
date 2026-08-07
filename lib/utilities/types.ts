export type UtilitySection = {
  heading: string;
  body: string;
};

export type UtilityFaq = {
  question: string;
  answer: string;
};

export type UtilityIndexEntry = {
  slug: string;
  name: string;
  state: string;
  customers_approx: number;
  priority_score: number;
  why: string;
};

export type UtilityInterconnectStep = {
  sort_order: number;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
};

export type UtilityRecord = {
  slug: string;
  name: string;
  full_name: string;
  state: string;
  state_name: string;
  region: string;
  default_city: string;
  ownership_type?: string;
  eia_id_or_alias?: string | null;
  residential_customers_approx?: number | null;
  illustrative_rate_usd_per_kwh: number;
  rate_note: string;
  rate_as_of: string;
  rate_sources?: string[];
  export_compensation?: {
    regime: string;
    summary: string;
    official_url: string | null;
  };
  interconnection?: {
    program_name: string;
    application_url: string | null;
    typical_size_notes: string;
    pto_notes: string;
    steps: UtilityInterconnectStep[];
  };
  local_permitting_notes?: string;
  related_permit_jurisdiction_slugs?: string[];
  headline: string;
  summary: string;
  sections: UtilitySection[];
  faqs: UtilityFaq[];
  confidence?: string;
  sources?: { title: string; url: string; accessed: string }[];
  open_questions?: string[];
  researched_detail?: boolean;
};
