export type PowerBillStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type PowerBillParsed = {
  utilityName: string | null;
  accountNumber: string | null;
  customerName: string | null;
  serviceAddress: string | null;
  serviceCity: string | null;
  serviceState: string | null;
  serviceZip: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  dueDate: string | null;
  amountDueUsd: number | null;
  totalKwh: number | null;
  peakKwh: number | null;
  rateSchedule: string | null;
  blendedRateUsdPerKwh: number | null;
  previousBalanceUsd: number | null;
  notes: string | null;
  confidence: number;
};

export type RegexCandidates = {
  accountNumbers: string[];
  dollarAmounts: number[];
  kwhAmounts: number[];
  dates: string[];
  rateSchedules: string[];
  addresses: string[];
  utilityHints: string[];
  labeled: Array<{ label: string; value: string }>;
};

export type PowerBillRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  utility_slug: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  byte_size: number | null;
  status: PowerBillStatus;
  extracted_html: string | null;
  regex_candidates: RegexCandidates | null;
  parsed: PowerBillParsed | null;
  error_message: string | null;
  model: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};
