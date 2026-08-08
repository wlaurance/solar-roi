export type RoiToggles = {
  solar: boolean;
  battery: boolean;
  hvac: boolean;
  water: boolean;
};

export type PaymentMode = "cash" | "finance";

export type SolarDriveInputs = {
  /** System size in kW from Solar API (panels × capacity) */
  systemKw?: number | null;
  /** Annual DC generation kWh from selected solarPanelConfig */
  yearlyEnergyDcKwh?: number | null;
  panelsCount?: number | null;
  panelCapacityWatts?: number | null;
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
  /**
   * Assumed CAGR (%) for investing the bill difference (old − new) each year.
   * Defaults to 5.
   */
  investmentCagrPct?: number | null;
  /** Pay equipment net cost in cash, or finance with down payment + APR */
  paymentMode?: PaymentMode | null;
  /** Down payment as percent of net cost when financing (e.g. 10 = 10%) */
  loanDownPaymentPct?: number | null;
  /** Loan APR as a percent (e.g. 6.99 = 6.99%/yr) */
  loanAprPct?: number | null;
  /** Loan term in years (amortization length) */
  loanTermYears?: number | null;
};

export type RoiYearPoint = {
  year: number;
  /** Cumulative $ spent staying on utility (no solar path) */
  cumulativeUtilitySpend: number;
  /** Cumulative $ spent on solar path (net install/loan + bills + replacements) */
  cumulativeSolarPathSpend: number;
  /** Utility spend − solar path spend (positive = ahead) */
  cumulativeSavings: number;
  annualSavings: number;
  batteryReplacement: number;
  /** Loan principal + interest paid this year (0 when cash / after term) */
  loanPayment: number;
  /**
   * Portfolio value if each year's bill difference (old − new) is invested
   * at the assumed CAGR. Labeled "invested money" in the UI.
   */
  investedMoney: number;
};

export type RoiResult = {
  systemKw: number;
  panelsCount: number | null;
  panelCapacityWatts: number | null;
  grossCost: number;
  netCost: number;
  monthlyBillBefore: number;
  monthlyBillAfter: number;
  monthlyUsageKwhBefore: number;
  rateUsdPerKwh: number;
  energyInflationPct: number;
  investmentCagrPct: number;
  paymentMode: PaymentMode;
  loanDownPaymentPct: number;
  loanAprPct: number;
  loanTermYears: number;
  /** Cash due at start: full net cost (cash) or down payment (finance) */
  upfrontCost: number;
  /** Financed principal (0 when cash) */
  loanPrincipal: number;
  /** Monthly loan payment (0 when cash or zero principal) */
  monthlyLoanPayment: number;
  offset: number;
  yearlyEnergyDcKwh: number | null;
  breakEvenYear: number | null;
  netSavings25: number;
  /** Invested money portfolio at year 25 */
  investedMoney25: number;
  /** True when size/energy came from Roof Designer Solar panel config */
  solarDriven: boolean;
  series: RoiYearPoint[];
};

export const BASE_ELEC = 670;
export const HVAC_ADD = 110;
export const WATER_ADD = 40;
export const COST_PER_KW = 3100;
export const BATTERY_COST = 13500;
export const BATTERY_REPLACEMENT_YEAR = 12;
export const BATTERY_REPLACEMENT_COST = 8500;
/**
 * Federal Residential Clean Energy Credit (IRC 25D) generally does not apply to
 * expenditures made after Dec 31, 2025 (OBBBA / P.L. 119-21). Planning model
 * uses 0% federal residential ITC for homeowner-owned systems in 2026+.
 * @see https://www.irs.gov/newsroom/faqs-for-modification-of-sections-25c-25d-25e-30c-30d-45l-45w-and-179d-under-public-law-119-21-139-stat-72-july-4-2025-commonly-known-as-the-one-big-beautiful-bill-obbb
 */
export const FEDERAL_RESIDENTIAL_ITC_PERCENT = 0;
/** Multiply gross cost by this for modeled net cost (1.0 = no federal residential ITC). */
export const ITC_NET_FACTOR = 1 - FEDERAL_RESIDENTIAL_ITC_PERCENT / 100;
/** Default annual energy cost inflation: 5%/yr */
export const DEFAULT_ENERGY_INFLATION_PCT = 5;
/** Default assumed CAGR for investing bill savings: 5%/yr */
export const DEFAULT_INVESTMENT_CAGR_PCT = 5;
export const DEFAULT_PAYMENT_MODE: PaymentMode = "cash";
/** Default down payment when financing: 10% of net cost */
export const DEFAULT_LOAN_DOWN_PAYMENT_PCT = 10;
/** Default equipment loan APR: 6.99%/yr */
export const DEFAULT_LOAN_APR_PCT = 6.99;
/** Default loan term used for amortization */
export const DEFAULT_LOAN_TERM_YEARS = 15;
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

export function resolveInvestmentCagrRate(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return pct / 100;
  }
  return DEFAULT_INVESTMENT_CAGR_PCT / 100;
}

export function resolveInvestmentCagrPct(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return pct;
  }
  return DEFAULT_INVESTMENT_CAGR_PCT;
}

export function resolvePaymentMode(mode?: PaymentMode | null): PaymentMode {
  return mode === "finance" ? "finance" : DEFAULT_PAYMENT_MODE;
}

export function resolveLoanDownPaymentPct(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
    return pct;
  }
  return DEFAULT_LOAN_DOWN_PAYMENT_PCT;
}

export function resolveLoanAprPct(pct?: number | null): number {
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return pct;
  }
  return DEFAULT_LOAN_APR_PCT;
}

export function resolveLoanTermYears(years?: number | null): number {
  if (years != null && Number.isFinite(years) && years >= 1) {
    return Math.min(HORIZON_YEARS, Math.floor(years));
  }
  return DEFAULT_LOAN_TERM_YEARS;
}

/**
 * Standard amortizing loan monthly payment.
 * Returns 0 when principal is 0; equal principal/n months when APR is 0.
 */
export function monthlyLoanPayment(
  principal: number,
  aprPct: number,
  termYears: number,
): number {
  if (!(principal > 0) || !(termYears > 0)) return 0;
  const n = termYears * 12;
  const r = aprPct / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
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
  // Prefer Roof Designer: panels × module watts
  if (input.solar) {
    const panels = input.solarDrive?.panelsCount;
    const watts = input.solarDrive?.panelCapacityWatts;
    if (panels != null && panels > 0 && watts != null && watts > 0) {
      return (panels * watts) / 1000;
    }
    const solarDriveKw = input.solarDrive?.systemKw;
    if (solarDriveKw != null && solarDriveKw > 0) {
      return solarDriveKw;
    }
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
  const drive = input.solar ? input.solarDrive : null;
  const yearlyEnergyDcKwh =
    drive?.yearlyEnergyDcKwh != null && drive.yearlyEnergyDcKwh > 0
      ? drive.yearlyEnergyDcKwh
      : null;

  const rate = resolveRate(input.rateUsdPerKwh);
  const inflationPct = resolveEnergyInflationPct(input.energyInflationPct);
  const inflation = resolveEnergyInflationRate(inflationPct);
  const investmentCagrPct = resolveInvestmentCagrPct(input.investmentCagrPct);
  const investmentCagr = resolveInvestmentCagrRate(investmentCagrPct);
  const paymentMode = resolvePaymentMode(input.paymentMode);
  const loanDownPaymentPct = resolveLoanDownPaymentPct(input.loanDownPaymentPct);
  const loanAprPct = resolveLoanAprPct(input.loanAprPct);
  const loanTermYears = resolveLoanTermYears(input.loanTermYears);

  const systemKw = resolveSystemKw(input);
  const solarDriven =
    Boolean(input.solar) &&
    ((drive?.panelsCount != null &&
      drive.panelsCount > 0 &&
      drive.panelCapacityWatts != null &&
      drive.panelCapacityWatts > 0) ||
      (drive?.systemKw != null && drive.systemKw > 0));

  const panelCost = input.solar ? systemKw * COST_PER_KW : 0;
  const batteryCost = input.battery ? BATTERY_COST : 0;
  const grossCost = panelCost + batteryCost;
  const netCost = grossCost * ITC_NET_FACTOR;

  const financing = paymentMode === "finance" && netCost > 0;
  const upfrontCost = financing
    ? netCost * (loanDownPaymentPct / 100)
    : netCost;
  const loanPrincipal = financing ? Math.max(0, netCost - upfrontCost) : 0;
  const monthlyLoan = monthlyLoanPayment(
    loanPrincipal,
    loanAprPct,
    loanTermYears,
  );
  const annualLoanPayment = monthlyLoan * 12;

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
      cumulativeSolarPathSpend: Math.round(upfrontCost),
      cumulativeSavings: Math.round(-upfrontCost),
      annualSavings: 0,
      batteryReplacement: 0,
      loanPayment: 0,
      investedMoney: 0,
    },
  ];
  let cumulativeUtility = 0;
  let cumulativeSolar = upfrontCost;
  let investedMoney = 0;
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= HORIZON_YEARS; year++) {
    const inflationFactor = Math.pow(1 + inflation, year - 1);
    const utilityYearCost = monthlyBillBefore * 12 * inflationFactor;
    const solarYearCost = monthlyBillAfter * 12 * inflationFactor;
    const batteryReplacement =
      input.battery && year === BATTERY_REPLACEMENT_YEAR
        ? BATTERY_REPLACEMENT_COST
        : 0;
    const loanPayment =
      financing && year <= loanTermYears ? annualLoanPayment : 0;
    /** Bill difference (old − new) — also the amount invested that year. */
    const annualSavings = utilityYearCost - solarYearCost;

    cumulativeUtility += utilityYearCost;
    cumulativeSolar += solarYearCost + batteryReplacement + loanPayment;
    const cumulativeSavings = cumulativeUtility - cumulativeSolar;

    // Prior invested money grows at CAGR, then this year's bill difference is added.
    investedMoney = investedMoney * (1 + investmentCagr) + annualSavings;

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
      loanPayment: Math.round(loanPayment),
      investedMoney: Math.round(investedMoney),
    });
  }

  const panelsCount =
    drive?.panelsCount != null && drive.panelsCount > 0
      ? drive.panelsCount
      : null;
  const panelCapacityWatts =
    drive?.panelCapacityWatts != null && drive.panelCapacityWatts > 0
      ? drive.panelCapacityWatts
      : null;

  return {
    systemKw: Math.round(systemKw * 100) / 100,
    panelsCount,
    panelCapacityWatts,
    grossCost: Math.round(grossCost),
    netCost: Math.round(netCost),
    monthlyBillBefore: Math.round(monthlyBillBefore),
    monthlyBillAfter: Math.round(monthlyBillAfter),
    monthlyUsageKwhBefore: Math.round(monthlyUsageKwhBefore),
    rateUsdPerKwh: rate,
    energyInflationPct: inflationPct,
    investmentCagrPct,
    paymentMode,
    loanDownPaymentPct,
    loanAprPct,
    loanTermYears,
    upfrontCost: Math.round(upfrontCost),
    loanPrincipal: Math.round(loanPrincipal),
    monthlyLoanPayment: Math.round(monthlyLoan * 100) / 100,
    offset: Math.round(offset * 1000) / 1000,
    yearlyEnergyDcKwh:
      yearlyEnergyDcKwh != null ? Math.round(yearlyEnergyDcKwh) : null,
    breakEvenYear,
    netSavings25: series[series.length - 1]?.cumulativeSavings ?? 0,
    investedMoney25: series[series.length - 1]?.investedMoney ?? 0,
    solarDriven,
    series,
  };
}

/** Derive size + energy from cached Building Insights + selected panel config index */
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
  const idx = Math.max(0, Math.min(configIndex ?? 0, configs.length - 1));
  const config = configs[idx];
  if (!config || !(config.panelsCount > 0)) return null;
  const watts = pot.panelCapacityWatts ?? 400;
  return {
    panelsCount: config.panelsCount,
    panelCapacityWatts: watts,
    systemKw: (config.panelsCount * watts) / 1000,
    yearlyEnergyDcKwh: config.yearlyEnergyDcKwh,
  };
}

/** System kW from a panel count and module wattage */
export function systemKwFromPanels(panelsCount: number, watts: number): number {
  return Math.round(((panelsCount * watts) / 1000) * 1000) / 1000;
}
