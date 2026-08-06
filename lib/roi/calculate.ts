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
  /** User-entered current monthly bill before solar ($) */
  monthlyBillUsd?: number | null;
  /** User-entered current monthly usage (kWh); preferred for offset calc */
  monthlyUsageKwh?: number | null;
  /** Blended $/kWh to convert between bill and usage */
  rateUsdPerKwh?: number | null;
  /** Annual utility/energy cost inflation as a percent (e.g. 5 = 5%/yr) */
  energyInflationPct?: number | null;
};

export type RoiYearPoint = {
  year: number;
  /** Cumulative $ spent staying on utility (no solar path) */
  cumulativeUtilitySpend: number;
  /** Cumulative $ spent on solar path (net install + bills + replacements) */
  cumulativeSolarPathSpend: number;
  /** Utility spend − solar path spend (positive = ahead) */
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
  monthlyUsageKwhBefore: number;
  rateUsdPerKwh: number;
  energyInflationPct: number;
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
/** Default annual energy cost inflation: 5%/yr */
export const DEFAULT_ENERGY_INFLATION_PCT = 5;
export const HORIZON_YEARS = 25;
export const DEFAULT_SYSTEM_KW_BASE = 8.5;
export const HVAC_KW = 3.0;
export const WATER_KW = 1.5;
export const DEFAULT_RATE_USD_PER_KWH = 0.35;

export function resolveRate(rate?: number | null): number {
  if (rate != null && rate > 0) return rate;
  return DEFAULT_RATE_USD_PER_KWH;
}

/** Convert percent (e.g. 5) to annual rate (0.05). */
export function resolveEnergyInflationRate(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return pct / 100;
  }
  return DEFAULT_ENERGY_INFLATION_PCT / 100;
}

export function resolveEnergyInflationPct(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return pct;
  }
  return DEFAULT_ENERGY_INFLATION_PCT;
}

/** Baseline monthly bill before electrification add-ons */
export function resolveBaselineMonthlyBill(input: Pick<
  RoiInput,
  "monthlyBillUsd" | "monthlyUsageKwh" | "rateUsdPerKwh"
>): number {
  const rate = resolveRate(input.rateUsdPerKwh);
  if (input.monthlyBillUsd != null && input.monthlyBillUsd > 0) {
    return input.monthlyBillUsd;
  }
  if (input.monthlyUsageKwh != null && input.monthlyUsageKwh > 0) {
    return input.monthlyUsageKwh * rate;
  }
  return BASE_ELEC;
}

/** Baseline monthly usage before electrification add-ons */
export function resolveBaselineMonthlyUsageKwh(input: Pick<
  RoiInput,
  "monthlyBillUsd" | "monthlyUsageKwh" | "rateUsdPerKwh"
>): number {
  const rate = resolveRate(input.rateUsdPerKwh);
  if (input.monthlyUsageKwh != null && input.monthlyUsageKwh > 0) {
    return input.monthlyUsageKwh;
  }
  if (input.monthlyBillUsd != null && input.monthlyBillUsd > 0) {
    return input.monthlyBillUsd / rate;
  }
  return BASE_ELEC / rate;
}

function electrificationBillAdd(input: RoiToggles): number {
  return (input.hvac ? HVAC_ADD : 0) + (input.water ? WATER_ADD : 0);
}

function electrificationUsageAdd(input: RoiToggles, rate: number): number {
  return electrificationBillAdd(input) / rate;
}

function resolveSystemKw(input: RoiInput): number {
  const solarDriveKw = input.solarDrive?.systemKw;
  if (input.solar && solarDriveKw != null && solarDriveKw > 0) {
    return solarDriveKw;
  }

  let kw = input.systemKwBase ?? DEFAULT_SYSTEM_KW_BASE;
  if (input.hvac) kw += HVAC_KW;
  if (input.water) kw += WATER_KW;
  if (!input.solar) return 0;
  return kw;
}

function resolveOffset(
  input: RoiInput,
  yearlyEnergyDcKwh: number | null,
  annualUsageKwh: number,
): number {
  if (!input.solar) return 0;

  if (yearlyEnergyDcKwh != null && yearlyEnergyDcKwh > 0) {
    const productionAcKwh = yearlyEnergyDcKwh * 0.86; // DC→AC derate
    let rawOffset = Math.min(1.15, productionAcKwh / Math.max(annualUsageKwh, 1));
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

  const rate = resolveRate(input.rateUsdPerKwh);
  const inflationPct = resolveEnergyInflationPct(input.energyInflationPct);
  const inflation = resolveEnergyInflationRate(inflationPct);
  const systemKw = resolveSystemKw(input);
  const panelCost = input.solar ? systemKw * COST_PER_KW : 0;
  const batteryCost = input.battery ? BATTERY_COST : 0;
  const grossCost = panelCost + batteryCost;
  const netCost = grossCost * ITC_NET_FACTOR;

  const monthlyBillBefore =
    resolveBaselineMonthlyBill(input) + electrificationBillAdd(input);
  const monthlyUsageKwhBefore =
    resolveBaselineMonthlyUsageKwh(input) + electrificationUsageAdd(input, rate);
  const annualUsageKwh = monthlyUsageKwhBefore * 12;

  const offset = resolveOffset(input, yearlyEnergyDcKwh, annualUsageKwh);
  const monthlyBillAfter = monthlyBillBefore * (1 - offset);

  const series: RoiYearPoint[] = [
    {
      year: 0,
      cumulativeUtilitySpend: 0,
      cumulativeSolarPathSpend: Math.round(netCost),
      cumulativeSavings: Math.round(-netCost),
      annualSavings: 0,
      batteryReplacement: 0,
    },
  ];
  let cumulativeUtility = 0;
  let cumulativeSolar = netCost;
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= HORIZON_YEARS; year++) {
    const inflationFactor = Math.pow(1 + inflation, year - 1);
    const utilityYearCost = monthlyBillBefore * 12 * inflationFactor;
    const solarYearCost = monthlyBillAfter * 12 * inflationFactor;
    const batteryReplacement =
      input.battery && year === BATTERY_REPLACEMENT_YEAR
        ? BATTERY_REPLACEMENT_COST
        : 0;
    const annualSavings = utilityYearCost - solarYearCost;

    cumulativeUtility += utilityYearCost;
    cumulativeSolar += solarYearCost + batteryReplacement;
    const cumulativeSavings = cumulativeUtility - cumulativeSolar;

    if (breakEvenYear == null && cumulativeSavings >= 0 && input.solar) {
      breakEvenYear = year;
    }

    series.push({
      year,
      cumulativeUtilitySpend: Math.round(cumulativeUtility),
      cumulativeSolarPathSpend: Math.round(cumulativeSolar),
      cumulativeSavings: Math.round(cumulativeSavings),
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
    monthlyUsageKwhBefore: Math.round(monthlyUsageKwhBefore),
    rateUsdPerKwh: rate,
    energyInflationPct: inflationPct,
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
