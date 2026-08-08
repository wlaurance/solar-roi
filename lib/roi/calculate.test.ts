import { describe, expect, it } from "vitest";
import {
  BATTERY_REPLACEMENT_COST,
  DEFAULT_INVESTMENT_CAGR_PCT,
  calculateRoi,
  monthlyLoanPayment,
  solarDriveFromInsights,
} from "./calculate";

describe("calculateRoi", () => {
  it("uses base bill and battery offset when no solar drive", () => {
    const result = calculateRoi({
      solar: true,
      battery: true,
      hvac: false,
      water: false,
    });

    expect(result.monthlyBillBefore).toBe(670);
    expect(result.systemKw).toBe(8.5);
    expect(result.offset).toBe(0.95);
    expect(result.series).toHaveLength(26);
    expect(result.series[12].year).toBe(12);
    expect(result.series[12].batteryReplacement).toBe(BATTERY_REPLACEMENT_COST);
    expect(result.series[0].cumulativeSolarPathSpend).toBe(result.netCost);
    expect(result.series[0].cumulativeUtilitySpend).toBe(0);
    expect(result.paymentMode).toBe("cash");
    expect(result.investmentCagrPct).toBe(DEFAULT_INVESTMENT_CAGR_PCT);
    expect(result.series[0].investedMoney).toBe(0);
    expect(result.investedMoney25).toBeGreaterThan(0);
  });

  it("adds HVAC and water load to bill and system size", () => {
    const result = calculateRoi({
      solar: true,
      battery: false,
      hvac: true,
      water: true,
    });

    expect(result.monthlyBillBefore).toBe(670 + 110 + 40);
    expect(result.systemKw).toBe(8.5 + 3 + 1.5);
    expect(result.offset).toBe(0.45);
  });

  it("drives system size and offset from Solar API inputs", () => {
    const result = calculateRoi({
      solar: true,
      battery: true,
      hvac: true,
      water: false,
      solarDrive: {
        systemKw: 10.4,
        yearlyEnergyDcKwh: 14000,
      },
    });

    expect(result.systemKw).toBe(10.4);
    expect(result.yearlyEnergyDcKwh).toBe(14000);
    expect(result.offset).toBeGreaterThan(0.2);
    expect(result.offset).toBeLessThanOrEqual(0.98);
  });

  it("returns zero system when solar off", () => {
    const result = calculateRoi({
      solar: false,
      battery: true,
      hvac: false,
      water: false,
    });

    expect(result.systemKw).toBe(0);
    expect(result.offset).toBe(0);
    expect(result.monthlyBillAfter).toBe(result.monthlyBillBefore);
  });

  it("uses user monthly bill and kWh for baseline and offset", () => {
    const result = calculateRoi({
      solar: true,
      battery: true,
      hvac: false,
      water: false,
      monthlyBillUsd: 350,
      monthlyUsageKwh: 1000,
      rateUsdPerKwh: 0.35,
      solarDrive: {
        systemKw: 8,
        yearlyEnergyDcKwh: 12000,
      },
    });

    expect(result.monthlyBillBefore).toBe(350);
    expect(result.monthlyUsageKwhBefore).toBe(1000);
    expect(result.offset).toBeGreaterThan(0.2);
  });

  it("derives bill from kWh when only usage is set", () => {
    const result = calculateRoi({
      solar: false,
      battery: false,
      hvac: false,
      water: false,
      monthlyUsageKwh: 2000,
      rateUsdPerKwh: 0.4,
    });

    expect(result.monthlyBillBefore).toBe(800);
    expect(result.monthlyUsageKwhBefore).toBe(2000);
  });

  it("uses custom energy inflation", () => {
    const low = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      energyInflationPct: 2,
    });
    const high = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      energyInflationPct: 10,
    });

    expect(low.energyInflationPct).toBe(2);
    expect(high.energyInflationPct).toBe(10);
    expect(high.netSavings25).toBeGreaterThan(low.netSavings25);
  });

  it("grows invested money with adjustable CAGR from bill difference", () => {
    const low = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      investmentCagrPct: 0,
    });
    const high = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      investmentCagrPct: 10,
    });

    expect(low.investmentCagrPct).toBe(0);
    expect(high.investmentCagrPct).toBe(10);
    expect(high.investedMoney25).toBeGreaterThan(low.investedMoney25);
    // Year 1: portfolio is just that year's bill difference
    expect(low.series[1].investedMoney).toBe(low.series[1].annualSavings);
    expect(low.investedMoney25).toBeGreaterThan(low.series[1].investedMoney);
  });

  it("finances equipment with down payment and APR instead of full cash outlay", () => {
    const cash = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      paymentMode: "cash",
    });
    const financed = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      paymentMode: "finance",
      loanDownPaymentPct: 10,
      loanAprPct: 6.99,
      loanTermYears: 15,
    });

    expect(financed.paymentMode).toBe("finance");
    expect(financed.upfrontCost).toBe(Math.round(financed.netCost * 0.1));
    expect(financed.loanPrincipal).toBe(
      Math.round(financed.netCost - financed.upfrontCost),
    );
    expect(financed.series[0].cumulativeSolarPathSpend).toBe(financed.upfrontCost);
    expect(financed.series[0].cumulativeSolarPathSpend).toBeLessThan(
      cash.series[0].cumulativeSolarPathSpend,
    );
    expect(financed.monthlyLoanPayment).toBeGreaterThan(0);
    expect(financed.series[1].loanPayment).toBe(
      Math.round(financed.monthlyLoanPayment * 12),
    );
    expect(financed.series[16].loanPayment).toBe(0);
    // Interest makes total solar-path spend higher than cash by year 25
    expect(financed.series[25].cumulativeSolarPathSpend).toBeGreaterThan(
      cash.series[25].cumulativeSolarPathSpend,
    );
  });

  it("sizes system from panels × watts for cost", () => {
    const result = calculateRoi({
      solar: true,
      battery: false,
      hvac: false,
      water: false,
      solarDrive: {
        panelsCount: 25,
        panelCapacityWatts: 400,
        systemKw: 10,
        yearlyEnergyDcKwh: 15000,
      },
    });

    expect(result.systemKw).toBe(10);
    expect(result.panelsCount).toBe(25);
    expect(result.panelCapacityWatts).toBe(400);
    expect(result.solarDriven).toBe(true);
    expect(result.grossCost).toBe(Math.round(10 * 3100));
  });
});

describe("monthlyLoanPayment", () => {
  it("matches standard amortization for a known case", () => {
    // $20,000 at 6% for 5 years ≈ $386.66/mo
    const payment = monthlyLoanPayment(20000, 6, 5);
    expect(payment).toBeCloseTo(386.66, 1);
  });

  it("splits principal evenly when APR is zero", () => {
    expect(monthlyLoanPayment(12000, 0, 10)).toBe(100);
  });
});

describe("solarDriveFromInsights", () => {
  it("maps config index to kW and yearly energy", () => {
    const drive = solarDriveFromInsights(
      {
        solarPotential: {
          panelCapacityWatts: 400,
          solarPanelConfigs: [
            { panelsCount: 10, yearlyEnergyDcKwh: 5000 },
            { panelsCount: 20, yearlyEnergyDcKwh: 9800 },
          ],
        },
      },
      1,
    );

    expect(drive).toEqual({
      systemKw: 8,
      yearlyEnergyDcKwh: 9800,
      panelsCount: 20,
      panelCapacityWatts: 400,
    });
  });
});
