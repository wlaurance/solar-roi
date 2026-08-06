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
  /** Annual energy cost inflation as a percent (e.g. 5 = 5%/yr) */
  energy_inflation_pct: number;
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

export type CountyPermitStep = {
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
};

export type CountyLinksPayload = {
  countyName: string;
  state: string;
  summary: string;
  /** AI-generated ordered permitting checklist (persisted on the project) */
  steps?: CountyPermitStep[];
  links: CountyLink[];
  model?: string;
  provider?: string;
  lookedUpAt?: string;
};
