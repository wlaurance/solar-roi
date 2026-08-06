export type UtilitySection = {
  heading: string;
  body: string;
};

export type UtilityFaq = {
  question: string;
  answer: string;
};

export type UtilityRecord = {
  slug: string;
  name: string;
  full_name: string;
  state: string;
  state_name: string;
  region: string;
  default_city: string;
  illustrative_rate_usd_per_kwh: number;
  rate_note: string;
  rate_as_of: string;
  headline: string;
  summary: string;
  sections: UtilitySection[];
  faqs: UtilityFaq[];
};
