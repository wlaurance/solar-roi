import { describe, expect, it } from "vitest";
import { assessSolarCandidate } from "./candidate";

describe("assessSolarCandidate", () => {
  it("rates high sunshine as excellent", () => {
    const a = assessSolarCandidate(1900);
    expect(a?.tier).toBe("excellent");
    expect(a?.candidateAnswer).toMatch(/excellent/i);
  });

  it("rates mid sunshine as good", () => {
    expect(assessSolarCandidate(1600)?.tier).toBe("good");
  });

  it("rates low sunshine as fair or poor", () => {
    expect(assessSolarCandidate(1300)?.tier).toBe("fair");
    expect(assessSolarCandidate(900)?.tier).toBe("poor");
  });

  it("returns null for missing data", () => {
    expect(assessSolarCandidate(null)).toBeNull();
    expect(assessSolarCandidate(0)).toBeNull();
  });
});
