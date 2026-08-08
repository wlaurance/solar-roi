import { describe, expect, it } from "vitest";
import { extractRegexCandidates } from "@/lib/power-bills/regex-prep";

const SAMPLE_BILL = `
Pacific Gas and Electric Company
Account Number: 1234567890-1
Service Address: 123 Main Street
Walnut Creek, CA 94596
Billing Period: 01/05/2026 - 02/04/2026
Total kWh 842
Amount Due $312.47
Rate Schedule E-TOU-C
Solar Billing Plan
`;

describe("extractRegexCandidates", () => {
  it("pulls account, dollars, kWh, dates, and utility hints", () => {
    const c = extractRegexCandidates(SAMPLE_BILL);
    expect(c.accountNumbers.some((a) => a.includes("1234567890"))).toBe(true);
    expect(c.dollarAmounts).toContain(312.47);
    expect(c.kwhAmounts).toContain(842);
    expect(c.dates.length).toBeGreaterThan(0);
    expect(c.rateSchedules.some((r) => /E-TOU-C/i.test(r))).toBe(true);
    expect(c.utilityHints.some((h) => /PG&E|Pacific Gas/i.test(h))).toBe(true);
    expect(c.addresses.some((a) => /Main Street/i.test(a))).toBe(true);
  });

  it("reads candidates from HTML extracts too", () => {
    const html = `<article><div class="bill-row">Account #: 9988776655</div><p>$210.00</p><p>410 kWh</p></article>`;
    const c = extractRegexCandidates(html);
    expect(c.accountNumbers).toContain("9988776655");
    expect(c.dollarAmounts).toContain(210);
    expect(c.kwhAmounts).toContain(410);
  });
});
