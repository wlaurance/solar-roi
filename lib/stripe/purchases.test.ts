import { describe, expect, it } from "vitest";
import {
  formatCardBrand,
  formatCardExpiry,
  formatMoneyCents,
  productNameForCode,
  projectLocationLine,
  purchaseHref,
} from "@/lib/stripe/purchases";

describe("purchase display helpers", () => {
  it("names and links HOA packages to the project HOA page", () => {
    expect(productNameForCode("hoa_package")).toBe("HOA Solar Approval Package");
    expect(purchaseHref({ productCode: "hoa_package", projectId: "abc" })).toBe(
      "/projects/abc/hoa",
    );
  });

  it("formats money, cards, and project location", () => {
    expect(formatMoneyCents(0)).toBe("$0.00");
    expect(formatMoneyCents(2997)).toBe("$29.97");
    expect(formatCardBrand("visa")).toBe("Visa");
    expect(formatCardExpiry(8, 2028)).toBe("08/28");
    expect(
      projectLocationLine({
        id: "1",
        name: "22225 Stewart",
        address: "22225 Stewart St",
        city: "Hayward",
        state: "CA",
      }),
    ).toBe("22225 Stewart St, Hayward, CA");
  });
});
