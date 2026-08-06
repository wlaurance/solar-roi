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
  solar: boolean;
  battery: boolean;
  hvac: boolean;
  water: boolean;
  system_kw_base: number;
  selected_panel_config_index: number;
  solar_insights: BuildingInsightsResponse | null;
  created_at: string;
  updated_at: string;
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

export const DEFAULT_PROJECT_ADDRESS = {
  name: "Stewart Avenue Home",
  address: "2225 Stewart Ave",
  city: "Walnut Creek",
  state: "CA",
  zip: "94596",
  // Fallback; refined via Geocoding API on create
  lat: 37.8753063,
  lng: -122.0285039,
} as const;
