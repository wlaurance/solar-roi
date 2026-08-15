import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectHasHoaPackage } from "@/lib/hoa/entitlements";
import { enqueueHoaDocumentProcessing } from "@/lib/hoa/enqueue";
import type { HoaDocumentKind } from "@/lib/hoa/types";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const KINDS = new Set<HoaDocumentKind>([
  "rules",
  "examples",
  "templates",
  "other",
]);

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("hoa_documents")
    .select(
      "id, project_id, kind, original_filename, mime_type, byte_size, status, extracted_summary, error_message, created_at, processed_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const projectIdRaw = form.get("projectId");
  const kindRaw = form.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const projectId =
    typeof projectIdRaw === "string" ? projectIdRaw.trim() : "";
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const kind = (
    typeof kindRaw === "string" && KINDS.has(kindRaw as HoaDocumentKind)
      ? kindRaw
      : "rules"
  ) as HoaDocumentKind;

  const { data: project } = await supabase
    .from("projects")
    .select("id, hoa_package_unlocked_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!projectHasHoaPackage(project)) {
    return NextResponse.json(
      { error: "Unlock the HOA package to upload documents.", code: "payment_required" },
      { status: 402 },
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be between 1 byte and 20 MB" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/pdf";
  if (!ALLOWED_TYPES.has(mime) && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Upload a PDF (preferred), Word doc, image, or text file" },
      { status: 400 },
    );
  }

  const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from("hoa-documents")
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: row, error: insertErr } = await supabase
    .from("hoa_documents")
    .insert({
      user_id: user.id,
      project_id: projectId,
      kind,
      storage_path: path,
      original_filename: file.name,
      mime_type: mime,
      byte_size: file.size,
      status: "queued",
    })
    .select(
      "id, project_id, kind, original_filename, mime_type, byte_size, status, created_at",
    )
    .single();

  if (insertErr || !row) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  await supabase
    .from("projects")
    .update({ hoa_package_status: "gathering_docs" })
    .eq("id", projectId)
    .eq("user_id", user.id);

  enqueueHoaDocumentProcessing(row.id);

  captureServerEvent({
    distinctId: distinctIdFromRequest(request, user.id),
    event: "hoa_document_uploaded",
    properties: { project_id: projectId, kind, bytes: file.size },
  });

  return NextResponse.json({ document: row });
}
