import { describe, expect, it } from "vitest";
import {
  BATTERY_REPLACEMENT_COST,
  calculateRoi,
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
    });
  });
});
