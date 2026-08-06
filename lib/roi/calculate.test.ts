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
    expect(result.series).toHaveLength(25);
    expect(result.series[11].batteryReplacement).toBe(BATTERY_REPLACEMENT_COST);
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
