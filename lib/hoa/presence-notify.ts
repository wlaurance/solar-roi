import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/seo";
import { sendTransactionalEmail } from "@/lib/email/resend";

/** Consider the user present if a heartbeat arrived within this window. */
export const PRESENCE_FRESH_MS = 2 * 60 * 1000;

export async function isUserPresent(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_presence")
    .select("last_seen_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.last_seen_at) return false;
  const last = new Date(data.last_seen_at).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last <= PRESENCE_FRESH_MS;
}

/**
 * If the user is not present in the browser, queue + send an email that the
 * Solar bot has a reply ready. No-ops when they are present or Resend is unset.
 */
export async function notifyAgentReplyIfAway(input: {
  userId: string;
  projectId: string;
  projectName: string;
  preview: string;
}): Promise<{ emailed: boolean; reason: string }> {
  if (await isUserPresent(input.userId)) {
    return { emailed: false, reason: "user_present" };
  }

  const admin = createAdminClient();
  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(input.userId);
  if (userErr || !userData.user?.email) {
    return { emailed: false, reason: "no_email" };
  }

  const to = userData.user.email;
  const path = `/projects/${input.projectId}/hoa`;
  const url = `${siteOrigin()}${path}`;
  const subject = `Solar bot has a reply on ${input.projectName}`;
  const preview = input.preview.replace(/\s+/g, " ").trim().slice(0, 240);
  const body = [
    `Your SolarFlow HOA assistant has a response ready for “${input.projectName}”.`,
    "",
    preview ? `Preview: ${preview}` : null,
    "",
    `Open the chat: ${url}`,
    "",
    "You’re getting this email because you weren’t active in the app when the reply finished.",
  ]
    .filter(Boolean)
    .join("\n");

  const dedupeKey = `hoa_agent_reply:${input.projectId}:${Math.floor(Date.now() / (5 * 60 * 1000))}`;

  const { data: row, error: insertErr } = await admin
    .from("notification_outbox")
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      kind: "hoa_agent_reply",
      channel: "email",
      to_email: to,
      subject,
      body_text: body,
      status: "pending",
      dedupe_key: dedupeKey,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    // Unique pending dedupe → already queued recently
    if (insertErr.code === "23505") {
      return { emailed: false, reason: "deduped" };
    }
    console.error("notification_outbox insert failed", insertErr);
    return { emailed: false, reason: "insert_failed" };
  }

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      text: body,
    });
    if (row?.id) {
      await admin
        .from("notification_outbox")
        .update({
          status: result.skipped ? "cancelled" : "sent",
          sent_at: result.skipped ? null : new Date().toISOString(),
          error_message: result.skipped ? "resend_disabled" : null,
        })
        .eq("id", row.id);
    }
    return {
      emailed: !result.skipped,
      reason: result.skipped ? "resend_disabled" : "sent",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    if (row?.id) {
      await admin
        .from("notification_outbox")
        .update({ status: "failed", error_message: message })
        .eq("id", row.id);
    }
    return { emailed: false, reason: message };
  }
}
