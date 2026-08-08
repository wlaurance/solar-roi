import { createAdminClient } from "@/lib/supabase/admin";
import { getUtilityBySlug } from "@/lib/utilities/catalog";
import { pdfBytesToHtml } from "@/lib/power-bills/pdf-to-html";
import { extractRegexCandidates } from "@/lib/power-bills/regex-prep";
import { parseBillWithGemini } from "@/lib/power-bills/parse-with-llm";
import type { PowerBillParsed, PowerBillRow } from "@/lib/power-bills/types";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundKwh(n: number) {
  return Math.round(n);
}

async function applyParsedToProject(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  userId: string,
  parsed: PowerBillParsed,
) {
  const patch: Record<string, number> = {};
  if (parsed.amountDueUsd != null && parsed.amountDueUsd > 0) {
    patch.monthly_bill_usd = roundMoney(parsed.amountDueUsd);
  }
  if (parsed.totalKwh != null && parsed.totalKwh > 0) {
    patch.monthly_usage_kwh = roundKwh(parsed.totalKwh);
  }
  if (parsed.blendedRateUsdPerKwh != null && parsed.blendedRateUsdPerKwh > 0) {
    patch.rate_usd_per_kwh = roundMoney(parsed.blendedRateUsdPerKwh);
  } else if (
    parsed.amountDueUsd != null &&
    parsed.totalKwh != null &&
    parsed.totalKwh > 0
  ) {
    patch.rate_usd_per_kwh = roundMoney(parsed.amountDueUsd / parsed.totalKwh);
  }

  if (!Object.keys(patch).length) return;

  const { error } = await admin
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to apply bill fields to project: ${error.message}`);
  }
}

/**
 * End-to-end bill job: download PDF → HTML extract → regex prep → Gemini structure
 * → optional project baseline update.
 */
export async function processPowerBill(billId: string): Promise<PowerBillRow> {
  const admin = createAdminClient();

  const { data: bill, error: loadError } = await admin
    .from("power_bills")
    .select("*")
    .eq("id", billId)
    .maybeSingle();

  if (loadError || !bill) {
    throw new Error(loadError?.message ?? `Power bill ${billId} not found`);
  }

  const row = bill as PowerBillRow;
  if (row.status === "completed" && row.parsed) {
    return row;
  }

  // Claim the job so upload `after()` and Netlify background don't double-run.
  const { data: claimed, error: claimError } = await admin
    .from("power_bills")
    .update({ status: "processing", error_message: null })
    .eq("id", billId)
    .in("status", ["queued", "failed"])
    .select("*")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimed) {
    const { data: current } = await admin
      .from("power_bills")
      .select("*")
      .eq("id", billId)
      .maybeSingle();
    if (current?.status === "completed") {
      return current as PowerBillRow;
    }
    if (current?.status === "processing") {
      return current as PowerBillRow;
    }
    throw new Error(`Could not claim power bill ${billId} for processing`);
  }

  try {
    const { data: file, error: downloadError } = await admin.storage
      .from("power-bills")
      .download(row.storage_path);

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "Could not download bill file");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = row.mime_type || "application/pdf";

    if (!mime.includes("pdf") && !row.original_filename.toLowerCase().endsWith(".pdf")) {
      throw new Error(
        "Only PDF bills are parsed today. Re-upload a PDF statement.",
      );
    }

    const { html, plainText } = await pdfBytesToHtml(bytes);
    const candidates = extractRegexCandidates(`${html}\n${plainText}`);
    const utility = row.utility_slug
      ? getUtilityBySlug(row.utility_slug)
      : null;

    const { parsed, model, provider } = await parseBillWithGemini({
      html,
      candidates,
      utilitySlug: row.utility_slug,
      utilityNameHint: utility?.name ?? utility?.full_name ?? null,
    });

    if (row.project_id) {
      await applyParsedToProject(admin, row.project_id, row.user_id, parsed);
    }

    const { data: updated, error: updateError } = await admin
      .from("power_bills")
      .update({
        status: "completed",
        extracted_html: html,
        regex_candidates: candidates,
        parsed,
        model,
        provider,
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", billId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to save parse results");
    }

    return updated as PowerBillRow;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bill processing failed";
    await admin
      .from("power_bills")
      .update({
        status: "failed",
        error_message: message.slice(0, 1000),
        processed_at: new Date().toISOString(),
      })
      .eq("id", billId);
    throw err;
  }
}
