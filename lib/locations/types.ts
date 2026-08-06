export type LocationKind = "county" | "city";

export type LocationRecord = {
  type: LocationKind;
  name: string;
  state: string;
  state_name: string;
  population: number;
  slug: string;
  fips?: string;
  lat?: number;
  lng?: number;
};

export type LocationSection = {
  heading: string;
  body: string;
};

export type LocationFaq = {
  question: string;
  answer: string;
};

export type GeoPageContent = {
  headline: string;
  summary: string;
  sections: LocationSection[];
  faqs: LocationFaq[];
  model?: string;
  provider?: string;
  generatedAt?: string;
};

export type GeoPageRow = {
  slug: string;
  kind: LocationKind;
  name: string;
  state: string;
  state_name: string;
  population: number;
  lat: number | null;
  lng: number | null;
  fips: string | null;
  headline: string | null;
  summary: string | null;
  sections: LocationSection[] | null;
  faqs: LocationFaq[] | null;
  model: string | null;
  provider: string | null;
  generated_at: string | null;
};
