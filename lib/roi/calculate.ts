export type RoiToggles = {
  solar: boolean;
  battery: boolean;
  hvac: boolean;
  water: boolean;
};

export type SolarDriveInputs = {
  /** System size in kW from Solar API (panels × capacity) */
  systemKw?: number | null;
  /** Annual DC generation kWh from selected solarPanelConfig */
  yearlyEnergyDcKwh?: number | null;
};

export type RoiInput = RoiToggles & {
  /** Fallback base system size when Solar insights unavailable */
  systemKwBase?: number;
  solarDrive?: SolarDriveInputs | null;
};

export type RoiYearPoint = {
  year: number;
  cumulativeSavings: number;
  annualSavings: number;
  batteryReplacement: number;
};

export type RoiResult = {
  systemKw: number;
  grossCost: number;
  netCost: number;
  monthlyBillBefore: number;
  monthlyBillAfter: number;
  offset: number;
  yearlyEnergyDcKwh: number | null;
  breakEvenYear: number | null;
  netSavings25: number;
  series: RoiYearPoint[];
};

export const BASE_ELEC = 670;
export const HVAC_ADD = 110;
export const WATER_ADD = 40;
export const COST_PER_KW = 3100;
export const BATTERY_COST = 13500;
export const BATTERY_REPLACEMENT_YEAR = 12;
export const BATTERY_REPLACEMENT_COST = 8500;
export const ITC_NET_FACTOR = 0.7;
export const INFLATION = 0.08;
export const HORIZON_YEARS = 25;
export const DEFAULT_SYSTEM_KW_BASE = 8.5;
export const HVAC_KW = 3.0;
export const WATER_KW = 1.5;

function resolveSystemKw(input: RoiInput): number {
  const solarDriveKw = input.solarDrive?.systemKw;
  if (input.solar && solarDriveKw != null && solarDriveKw > 0) {
    let kw = solarDriveKw;
    // Solar API size already reflects panels; still add load upgrades as incremental capacity
    // only when using fallback heuristic — when Solar-driven, keep panel-derived size.
    return kw;
  }

  let kw = input.systemKwBase ?? DEFAULT_SYSTEM_KW_BASE;
  if (input.hvac) kw += HVAC_KW;
  if (input.water) kw += WATER_KW;
  if (!input.solar) return 0;
  return kw;
}

function resolveOffset(input: RoiInput, yearlyEnergyDcKwh: number | null): number {
  if (!input.solar) return 0;

  // Blend: if we have Solar yearly energy, estimate offset vs annual household usage.
  // Usage heuristic from monthly bill / blended rate (~$0.35/kWh CA residential-ish).
  if (yearlyEnergyDcKwh != null && yearlyEnergyDcKwh > 0) {
    const monthlyBefore =
      BASE_ELEC + (input.hvac ? HVAC_ADD : 0) + (input.water ? WATER_ADD : 0);
    const annualUsageKwh = (monthlyBefore * 12) / 0.35;
    const productionAcKwh = yearlyEnergyDcKwh * 0.86; // DC→AC derate
    let rawOffset = Math.min(1.15, productionAcKwh / Math.max(annualUsageKwh, 1));
    // Battery improves self-consumption under export-light tariffs
    if (input.battery) {
      rawOffset = Math.min(1.0, rawOffset * 1.08);
    } else {
      rawOffset = Math.min(0.7, rawOffset * 0.75);
    }
    return Math.max(0.2, Math.min(0.98, rawOffset));
  }

  return input.battery ? 0.95 : 0.45;
}

export function calculateRoi(input: RoiInput): RoiResult {
  const yearlyEnergyDcKwh =
    input.solar && input.solarDrive?.yearlyEnergyDcKwh != null
      ? input.solarDrive.yearlyEnergyDcKwh
      : null;

  const systemKw = resolveSystemKw(input);
  const panelCost = input.solar ? systemKw * COST_PER_KW : 0;
  const batteryCost = input.battery ? BATTERY_COST : 0;
  const grossCost = panelCost + batteryCost;
  const netCost = grossCost * ITC_NET_FACTOR;

  const monthlyBillBefore =
    BASE_ELEC + (input.hvac ? HVAC_ADD : 0) + (input.water ? WATER_ADD : 0);

  const offset = resolveOffset(input, yearlyEnergyDcKwh);
  const monthlyBillAfter = monthlyBillBefore * (1 - offset);

  const series: RoiYearPoint[] = [];
  let cumulative = -netCost;
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= HORIZON_YEARS; year++) {
    const inflationFactor = Math.pow(1 + INFLATION, year - 1);
    const annualSavings =
      (monthlyBillBefore - monthlyBillAfter) * 12 * inflationFactor;
    const batteryReplacement =
      input.battery && year === BATTERY_REPLACEMENT_YEAR
        ? BATTERY_REPLACEMENT_COST
        : 0;

    cumulative += annualSavings - batteryReplacement;

    if (breakEvenYear == null && cumulative >= 0) {
      breakEvenYear = year;
    }

    series.push({
      year,
      cumulativeSavings: Math.round(cumulative),
      annualSavings: Math.round(annualSavings),
      batteryReplacement,
    });
  }

  return {
    systemKw: Math.round(systemKw * 100) / 100,
    grossCost: Math.round(grossCost),
    netCost: Math.round(netCost),
    monthlyBillBefore: Math.round(monthlyBillBefore),
    monthlyBillAfter: Math.round(monthlyBillAfter),
    offset: Math.round(offset * 1000) / 1000,
    yearlyEnergyDcKwh:
      yearlyEnergyDcKwh != null ? Math.round(yearlyEnergyDcKwh) : null,
    breakEvenYear,
    netSavings25: series[series.length - 1]?.cumulativeSavings ?? 0,
    series,
  };
}

/** Derive Solar-driven size + energy from cached BuildingInsights + config index */
export function solarDriveFromInsights(
  insights: {
    solarPotential?: {
      panelCapacityWatts?: number;
      solarPanelConfigs?: Array<{
        panelsCount: number;
        yearlyEnergyDcKwh: number;
      }>;
    };
  } | null | undefined,
  configIndex: number,
): SolarDriveInputs | null {
  const pot = insights?.solarPotential;
  const configs = pot?.solarPanelConfigs;
  if (!pot || !configs?.length) return null;
  const idx = Math.max(0, Math.min(configIndex, configs.length - 1));
  const config = configs[idx];
  const watts = pot.panelCapacityWatts ?? 400;
  return {
    systemKw: (config.panelsCount * watts) / 1000,
    yearlyEnergyDcKwh: config.yearlyEnergyDcKwh,
  };
}
