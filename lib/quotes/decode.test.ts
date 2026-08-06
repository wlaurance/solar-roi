import { describe, expect, it } from "vitest";
import { COST_PER_KW } from "@/lib/roi/calculate";
import { decodeSolarQuote } from "@/lib/quotes/decode";

describe("decodeSolarQuote", () => {
  it("flags a quote near the planning benchmark as in range", () => {
    const kw = 8;
    const result = decodeSolarQuote({
      systemKw: kw,
      grossPriceUsd: kw * COST_PER_KW,
      includesBattery: false,
    });
    expect(result.verdict).toBe("in_range");
    expect(result.dollarsPerWatt).toBeCloseTo(COST_PER_KW / 1000, 2);
  });

  it("flags a much higher solar-only price as high", () => {
    const result = decodeSolarQuote({
      systemKw: 8,
      grossPriceUsd: 8 * COST_PER_KW * 1.5,
      includesBattery: false,
    });
    expect(result.verdict).toBe("high");
    expect(result.deltaVsBenchmarkPct).toBeGreaterThan(0.35);
  });

  it("subtracts battery to estimate solar-only $/W", () => {
    const result = decodeSolarQuote({
      systemKw: 8,
      grossPriceUsd: 8 * COST_PER_KW + 13500,
      includesBattery: true,
      batteryPriceUsd: 13500,
    });
    expect(result.solarOnlyDollarsPerWatt).toBeCloseTo(COST_PER_KW / 1000, 2);
    expect(result.verdict).toBe("in_range");
  });
});
