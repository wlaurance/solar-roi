export type LatLng = {
  latitude: number;
  longitude: number;
};

export type LatLngBox = {
  sw: LatLng;
  ne: LatLng;
};

export type SolarDate = {
  year: number;
  month: number;
  day: number;
};

export type SizeAndSunshineStats = {
  areaMeters2: number;
  sunshineQuantiles: number[];
  groundAreaMeters2: number;
};

export type RoofSegmentSizeAndSunshineStats = {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: SizeAndSunshineStats;
  center: LatLng;
  boundingBox: LatLngBox;
  planeHeightAtCenterMeters: number;
};

export type SolarPanel = {
  center: LatLng;
  orientation: "LANDSCAPE" | "PORTRAIT";
  segmentIndex: number;
  yearlyEnergyDcKwh: number;
};

export type RoofSegmentSummary = {
  pitchDegrees: number;
  azimuthDegrees: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
};

export type SolarPanelConfig = {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: RoofSegmentSummary[];
};

export type SolarPotential = {
  maxArrayPanelsCount: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: SizeAndSunshineStats;
  buildingStats: SizeAndSunshineStats;
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[];
  solarPanels: SolarPanel[];
  solarPanelConfigs: SolarPanelConfig[];
  financialAnalyses?: unknown[];
};

export type BuildingInsightsResponse = {
  name: string;
  center: LatLng;
  boundingBox?: LatLngBox;
  imageryDate?: SolarDate;
  imageryProcessedDate?: SolarDate;
  postalCode?: string;
  administrativeArea?: string;
  statisticalArea?: string;
  regionCode?: string;
  solarPotential: SolarPotential;
  imageryQuality?: "HIGH" | "MEDIUM" | "BASE";
};
