export type HoaDocumentKind = "rules" | "examples" | "templates" | "other";

export type HoaDocumentStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type HoaPackageStatus =
  | "not_started"
  | "gathering_docs"
  | "extracting"
  | "drafting"
  | "awaiting_user"
  | "ready"
  | "submitted";

export type HoaDocument = {
  id: string;
  user_id: string;
  project_id: string;
  kind: HoaDocumentKind;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  byte_size: number | null;
  status: HoaDocumentStatus;
  extracted_text: string | null;
  extracted_summary: string | null;
  parsed: Record<string, unknown> | null;
  error_message: string | null;
  model: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

export type HoaRequirement = {
  id: string;
  title: string;
  detail: string;
  category:
    | "aesthetic"
    | "placement"
    | "structural"
    | "application"
    | "neighbor"
    | "fee"
    | "other";
  sourceDocumentId?: string | null;
  mandatory: boolean;
};

export type HoaRequirementsPayload = {
  summary: string;
  requirements: HoaRequirement[];
  extractedAt?: string;
  model?: string;
  provider?: string;
};

export type HoaApplicationField = {
  key: string;
  label: string;
  value: string;
  source: "project" | "user" | "agent" | "document";
  confidence: "high" | "medium" | "low";
};

export type HoaApplicationPayload = {
  title: string;
  status: "draft" | "ready" | "submitted";
  fields: HoaApplicationField[];
  coverLetter?: string;
  checklist?: string[];
  updatedAt?: string;
};

export type HoaAgentMessage = {
  id: string;
  user_id: string;
  project_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  parts: unknown;
  tool_name: string | null;
  created_at: string;
};
