import type { BuildingInsightsResponse } from "@/lib/google/solar-types";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  /** From Google Geocoding administrative_area_level_2 */
  county: string | null;
  /** Cached LLM county solar/permit resource pack */
  county_links: CountyLinksPayload | null;
  solar: boolean;
  battery: boolean;
  hvac: boolean;
  water: boolean;
  system_kw_base: number;
  selected_panel_config_index: number;
  solar_insights: BuildingInsightsResponse | null;
  /** Current monthly bill USD; null → ROI heuristic base */
  monthly_bill_usd: number | null;
  /** Current monthly usage kWh; null → derive from bill / rate */
  monthly_usage_kwh: number | null;
  /** Blended rate to sync $ ↔ kWh */
  rate_usd_per_kwh: number;
  created_at: string;
  updated_at: string;
};

export type CountyLink = {
  title: string;
  url: string;
  description: string;
  category:
    | "building_permit"
    | "planning"
    | "fire"
    | "utility_interconnection"
    | "incentives"
    | "other";
};

export type CountyLinksPayload = {
  countyName: string;
  state: string;
  summary: string;
  links: CountyLink[];
  model?: string;
  provider?: string;
  lookedUpAt?: string;
};

export type PermitJurisdiction = {
  id: string;
  slug: string;
  name: string;
  region: string;
};

export type PermitStep = {
  id: string;
  jurisdiction_id: string;
  sort_order: number;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
};

export type PermitJurisdictionWithSteps = PermitJurisdiction & {
  permit_steps: PermitStep[];
};
