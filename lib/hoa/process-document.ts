import { createAdminClient } from "@/lib/supabase/admin";
import { parseHoaDocumentText } from "@/lib/hoa/parse-with-llm";

async function extractTextFromBuffer(
  bytes: Uint8Array,
  mimeType: string,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (
    mimeType === "application/pdf" ||
    lower.endsWith(".pdf")
  ) {
    const { pdfBytesToHtml } = await import("@/lib/power-bills/pdf-to-html");
    const { html } = await pdfBytesToHtml(bytes);
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  ) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  // Images / office docs: store a placeholder; agent can still use filename + user notes
  return `[Binary document: ${filename} (${mimeType}). Text extraction is limited for this file type. Ask the homeowner to paste key CC&R solar sections if needed.]`;
}

/**
 * Claim a queued HOA document and run text extract + LLM parse.
 */
export async function processHoaDocument(documentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: claimed, error: claimErr } = await admin
    .from("hoa_documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId)
    .in("status", ["queued", "failed"])
    .select("*")
    .maybeSingle();

  if (claimErr) throw claimErr;
  if (!claimed) {
    const { data: existing } = await admin
      .from("hoa_documents")
      .select("status")
      .eq("id", documentId)
      .maybeSingle();
    if (!existing) throw new Error("HOA document not found");
    if (existing.status === "processing" || existing.status === "completed") {
      return;
    }
    throw new Error(`Cannot process document in status ${existing.status}`);
  }

  try {
    const { data: file, error: dlErr } = await admin.storage
      .from("hoa-documents")
      .download(claimed.storage_path);
    if (dlErr || !file) {
      throw new Error(dlErr?.message || "Failed to download HOA document");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const text = await extractTextFromBuffer(
      buffer,
      claimed.mime_type,
      claimed.original_filename,
    );

    const { parsed, summary, model, provider } = await parseHoaDocumentText({
      filename: claimed.original_filename,
      kind: claimed.kind,
      text: text || "(empty document)",
    });

    await admin
      .from("hoa_documents")
      .update({
        status: "completed",
        extracted_text: text.slice(0, 200_000),
        extracted_summary: summary,
        parsed,
        model,
        provider,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", documentId);

    await admin
      .from("projects")
      .update({ hoa_package_status: "extracting" })
      .eq("id", claimed.project_id)
      .in("hoa_package_status", ["not_started", "gathering_docs"]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    await admin
      .from("hoa_documents")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", documentId);
    throw err;
  }
}
