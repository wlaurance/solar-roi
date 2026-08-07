import {
  BATTERY_COST,
  COST_PER_KW,
  ITC_NET_FACTOR,
} from "@/lib/roi/calculate";

export type QuoteDecodeInput = {
  systemKw: number;
  /** Gross installed price before incentives (cash price) */
  grossPriceUsd: number;
  includesBattery: boolean;
  /** Optional battery line item if broken out */
  batteryPriceUsd?: number | null;
};

export type QuoteVerdict = "below_market" | "in_range" | "above_market" | "high";

export type QuoteDecodeResult = {
  systemKw: number;
  grossPriceUsd: number;
  includesBattery: boolean;
  dollarsPerWatt: number;
  /** Planning benchmark $/W from SolarFlow COST_PER_KW (solar only) */
  benchmarkDollarsPerWatt: number;
  benchmarkGrossSolarUsd: number;
  estimatedNetAfterItcUsd: number;
  batteryBenchmarkUsd: number;
  batteryPriceUsd: number | null;
  solarOnlyImpliedUsd: number;
  solarOnlyDollarsPerWatt: number;
  deltaVsBenchmarkPct: number;
  verdict: QuoteVerdict;
  verdictLabel: string;
  notes: string[];
};

const LOW_BAND = -0.12;
const HIGH_BAND = 0.18;
const VERY_HIGH_BAND = 0.35;

export function decodeSolarQuote(input: QuoteDecodeInput): QuoteDecodeResult {
  const systemKw = Math.max(0.1, input.systemKw);
  const grossPriceUsd = Math.max(0, input.grossPriceUsd);
  const watts = systemKw * 1000;
  const dollarsPerWatt = grossPriceUsd / watts;
  const benchmarkDollarsPerWatt = COST_PER_KW / 1000;
  const benchmarkGrossSolarUsd = systemKw * COST_PER_KW;

  const batteryPriceUsd =
    input.batteryPriceUsd != null && input.batteryPriceUsd > 0
      ? input.batteryPriceUsd
      : null;

  let solarOnlyImpliedUsd = grossPriceUsd;
  if (input.includesBattery) {
    solarOnlyImpliedUsd = Math.max(
      0,
      grossPriceUsd - (batteryPriceUsd ?? BATTERY_COST),
    );
  }
  const solarOnlyDollarsPerWatt = solarOnlyImpliedUsd / watts;

  const compareDpw = input.includesBattery
    ? solarOnlyDollarsPerWatt
    : dollarsPerWatt;
  const deltaVsBenchmarkPct =
    (compareDpw - benchmarkDollarsPerWatt) / benchmarkDollarsPerWatt;

  let verdict: QuoteVerdict = "in_range";
  if (deltaVsBenchmarkPct < LOW_BAND) verdict = "below_market";
  else if (deltaVsBenchmarkPct > VERY_HIGH_BAND) verdict = "high";
  else if (deltaVsBenchmarkPct > HIGH_BAND) verdict = "above_market";

  const verdictLabels: Record<QuoteVerdict, string> = {
    below_market: "Below planning benchmark",
    in_range: "Near planning benchmark",
    above_market: "Above planning benchmark",
    high: "Well above planning benchmark",
  };

  const notes: string[] = [
    `SolarFlow planning cost uses $${COST_PER_KW.toLocaleString("en-US")}/kW ($${benchmarkDollarsPerWatt.toFixed(2)}/W) before incentives for the PV portion.`,
    `Federal residential ITC (25D) in this 2026 planning model is ${Math.round((1 - ITC_NET_FACTOR) * 100)}% (×${ITC_NET_FACTOR}) — confirm eligibility with a tax advisor.`,
  ];

  if (input.includesBattery) {
    notes.push(
      batteryPriceUsd != null
        ? `Battery line item $${batteryPriceUsd.toLocaleString("en-US")} was subtracted to estimate solar-only $/W.`
        : `No battery price entered — subtracted the planning battery ballpark ($${BATTERY_COST.toLocaleString("en-US")}) to estimate solar-only $/W.`,
    );
  }

  if (verdict === "below_market") {
    notes.push(
      "Low pricing can be real (cash / competitive market) or incomplete (exclusions, change orders). Confirm scope, warranties, and interconnection fees.",
    );
  }
  if (verdict === "above_market" || verdict === "high") {
    notes.push(
      "Ask for a line-item breakdown, equipment brands, roof work, and electrical upgrades before accepting. Compare at least one other cash quote.",
    );
  }

  const estimatedNetAfterItcUsd = Math.round(
    (input.includesBattery
      ? solarOnlyImpliedUsd * ITC_NET_FACTOR + (batteryPriceUsd ?? BATTERY_COST)
      : grossPriceUsd * ITC_NET_FACTOR),
  );

  return {
    systemKw,
    grossPriceUsd,
    includesBattery: input.includesBattery,
    dollarsPerWatt,
    benchmarkDollarsPerWatt,
    benchmarkGrossSolarUsd,
    estimatedNetAfterItcUsd,
    batteryBenchmarkUsd: BATTERY_COST,
    batteryPriceUsd,
    solarOnlyImpliedUsd,
    solarOnlyDollarsPerWatt,
    deltaVsBenchmarkPct,
    verdict,
    verdictLabel: verdictLabels[verdict],
    notes,
  };
}
