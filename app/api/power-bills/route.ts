import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueuePowerBillProcessing } from "@/lib/power-bills/enqueue";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";
import { getUtilityBySlug } from "@/lib/utilities/catalog";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
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

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  let query = supabase
    .from("power_bills")
    .select(
      "id, project_id, utility_slug, original_filename, mime_type, byte_size, status, parsed, error_message, created_at, processed_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bills: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Create an account to submit your bill.", code: "auth_required" },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const utilitySlugRaw = form.get("utilitySlug");
  const projectIdRaw = form.get("projectId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const utilitySlug =
    typeof utilitySlugRaw === "string" && utilitySlugRaw.trim()
      ? utilitySlugRaw.trim()
      : null;
  const projectId =
    typeof projectIdRaw === "string" && projectIdRaw.trim()
      ? projectIdRaw.trim()
      : null;

  if (utilitySlug && !getUtilityBySlug(utilitySlug)) {
    return NextResponse.json({ error: "Unknown utility" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be between 1 byte and 15 MB" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/pdf";
  if (!ALLOWED_TYPES.has(mime) && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Upload a PDF (preferred) or JPG/PNG bill" },
      { status: 400 },
    );
  }

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const billId = crypto.randomUUID();
  const storagePath = `${user.id}/${billId}/${safeFileName(file.name)}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Prefer user-scoped upload (RLS); fall back to service role when configured.
  let uploadError: { message: string } | null = null;
  const userUpload = await supabase.storage
    .from("power-bills")
    .upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
  uploadError = userUpload.error;

  if (uploadError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const adminUpload = await admin.storage
      .from("power-bills")
      .upload(storagePath, bytes, {
        contentType: mime,
        upsert: false,
      });
    uploadError = adminUpload.error;
  }

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Storage upload failed" },
      { status: 500 },
    );
  }

  const { data: bill, error: insertError } = await supabase
    .from("power_bills")
    .insert({
      id: billId,
      user_id: user.id,
      project_id: projectId,
      utility_slug: utilitySlug,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: mime,
      byte_size: file.size,
      status: "queued",
    })
    .select("*")
    .single();

  if (insertError || !bill) {
    // Best-effort cleanup
    after(async () => {
      await supabase.storage.from("power-bills").remove([storagePath]);
    });
    return NextResponse.json(
      { error: insertError?.message ?? "Could not create bill record" },
      { status: 500 },
    );
  }

  enqueuePowerBillProcessing(billId);

  await captureServerEvent({
    distinctId: distinctIdFromRequest(request, user.id),
    event: "server_power_bill_uploaded",
    properties: {
      bill_id: billId,
      project_id: projectId,
      utility_slug: utilitySlug,
      byte_size: file.size,
      mime_type: mime,
    },
  });

  return NextResponse.json({ bill }, { status: 201 });
}
