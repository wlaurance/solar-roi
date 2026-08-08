import type { RegexCandidates } from "@/lib/power-bills/types";

const ACCOUNT_PATTERNS = [
  /(?:account|acct|customer)\s*(?:#|no\.?|number)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{6,20})/gi,
  /\b(\d{10,12})\b/g,
];

const DOLLAR_PATTERN = /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})/g;

const KWH_PATTERNS = [
  /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:kwh|kilowatt[\s-]?hours?)/gi,
  /(?:kwh|kilowatt[\s-]?hours?)\s*[:#]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/gi,
];

const DATE_PATTERNS = [
  /\b((?:0?[1-9]|1[0-2])[\/\-.](?:0?[1-9]|[12]\d|3[01])[\/\-.](?:20)?\d{2})\b/g,
  /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2})\b/gi,
  /\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/g,
];

const RATE_SCHEDULE_PATTERN =
  /\b(?:E-TOU-[A-Z0-9]+|EV2?-A|TOU-[A-Z0-9-]+|Residential\s+[A-Z0-9-]+|Schedule\s+[A-Z0-9-]+|NEM\s*[0-9.]+|Solar Billing Plan)\b/gi;

const ADDRESS_PATTERN =
  /\b(\d{1,6}\s+[A-Z0-9][A-Za-z0-9.'\- ]{3,60}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Cir|Circle|Pl|Place|Ter|Terrace)\.?)\b/g;

const LABELED_PATTERN =
  /^\s*([A-Za-z][A-Za-z0-9 /&#().-]{2,40})\s*[:|#]\s*(.+?\S)\s*$/gm;

const UTILITY_HINTS = [
  "PG&E",
  "Pacific Gas",
  "SCE",
  "Southern California Edison",
  "SDG&E",
  "San Diego Gas",
  "LADWP",
  "FPL",
  "Florida Power",
  "ComEd",
  "Oncor",
  "Duke Energy",
  "Con Edison",
  "PSEG",
  "Xcel",
  "APS",
  "SRP",
  "Austin Energy",
];

function uniqPreserve<T>(values: T[], keyFn: (v: T) => string, limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const value of values) {
    const key = keyFn(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

function parseKwh(raw: string): number | null {
  const n = Number(raw.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Regex "prep magic": pull high-signal candidates from PDF text / HTML before Gemini.
 * The LLM gets these as hints so it does not have to rediscover every number.
 */
export function extractRegexCandidates(source: string): RegexCandidates {
  const text = source.replace(/<[^>]+>/g, "\n");

  const accountNumbers: string[] = [];
  for (const pattern of ACCOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) != null) {
      const value = (match[1] || match[0] || "").trim();
      if (value.length >= 7) accountNumbers.push(value);
    }
  }

  const dollarAmounts: number[] = [];
  DOLLAR_PATTERN.lastIndex = 0;
  let dollarMatch: RegExpExecArray | null;
  while ((dollarMatch = DOLLAR_PATTERN.exec(text)) != null) {
    const n = parseMoney(dollarMatch[1] ?? "");
    if (n != null && n > 0 && n < 1_000_000) dollarAmounts.push(n);
  }

  const kwhAmounts: number[] = [];
  for (const pattern of KWH_PATTERNS) {
    pattern.lastIndex = 0;
    let kwhMatch: RegExpExecArray | null;
    while ((kwhMatch = pattern.exec(text)) != null) {
      const n = parseKwh(kwhMatch[1] ?? "");
      if (n != null && n > 0 && n < 500_000) kwhAmounts.push(n);
    }
  }

  const dates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) != null) {
      dates.push((match[1] || match[0] || "").trim());
    }
  }

  const rateSchedules: string[] = [];
  RATE_SCHEDULE_PATTERN.lastIndex = 0;
  let rateMatch: RegExpExecArray | null;
  while ((rateMatch = RATE_SCHEDULE_PATTERN.exec(text)) != null) {
    rateSchedules.push(rateMatch[0].trim());
  }

  const addresses: string[] = [];
  ADDRESS_PATTERN.lastIndex = 0;
  let addrMatch: RegExpExecArray | null;
  while ((addrMatch = ADDRESS_PATTERN.exec(text)) != null) {
    addresses.push((addrMatch[1] || addrMatch[0] || "").trim());
  }

  const labeled: Array<{ label: string; value: string }> = [];
  LABELED_PATTERN.lastIndex = 0;
  let labeledMatch: RegExpExecArray | null;
  while ((labeledMatch = LABELED_PATTERN.exec(text)) != null) {
    const label = (labeledMatch[1] ?? "").trim();
    const value = (labeledMatch[2] ?? "").trim();
    if (label.length < 3 || value.length < 1) continue;
    if (/total|amount|due|kwh|usage|account|service|period|rate|balance/i.test(label)) {
      labeled.push({ label, value: value.slice(0, 120) });
    }
  }

  const lower = text.toLowerCase();
  const utilityHints = UTILITY_HINTS.filter((hint) =>
    lower.includes(hint.toLowerCase()),
  );

  return {
    accountNumbers: uniqPreserve(accountNumbers, (v) => v.toLowerCase(), 12),
    dollarAmounts: uniqPreserve(dollarAmounts, (v) => v.toFixed(2), 24),
    kwhAmounts: uniqPreserve(kwhAmounts, (v) => String(v), 24),
    dates: uniqPreserve(dates, (v) => v.toLowerCase(), 24),
    rateSchedules: uniqPreserve(rateSchedules, (v) => v.toLowerCase(), 12),
    addresses: uniqPreserve(addresses, (v) => v.toLowerCase(), 8),
    utilityHints: uniqPreserve(utilityHints, (v) => v.toLowerCase(), 8),
    labeled: uniqPreserve(labeled, (v) => `${v.label}:${v.value}`.toLowerCase(), 40),
  };
}

/** Compact block injected into the Gemini prompt. */
export function formatCandidatesForPrompt(candidates: RegexCandidates): string {
  return JSON.stringify(candidates, null, 2);
}
