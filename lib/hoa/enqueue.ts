import { after } from "next/server";
import { processHoaDocument } from "@/lib/hoa/process-document";

function siteOrigin(): string {
  return (
    process.env.URL?.replace(/\/$/, "") ||
    process.env.DEPLOY_PRIME_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function processSecret(): string | null {
  return (
    process.env.HOA_PROCESS_SECRET?.trim() ||
    process.env.BILL_PROCESS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

function preferNetlifyBackground(): boolean {
  return Boolean(
    process.env.NETLIFY === "true" ||
      process.env.NETLIFY === "1" ||
      process.env.CONTEXT ||
      process.env.NETLIFY_DEV === "true",
  );
}

export function enqueueHoaDocumentProcessing(documentId: string): void {
  if (preferNetlifyBackground()) {
    const origin = siteOrigin();
    const secret = processSecret();
    const url = `${origin}/.netlify/functions/process-hoa-document`;
    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ documentId }),
    }).catch(async (err) => {
      console.error("Netlify HOA enqueue failed; falling back", err);
      try {
        await processHoaDocument(documentId);
      } catch (fallbackErr) {
        console.error("Inline HOA process fallback failed", fallbackErr);
      }
    });
    return;
  }

  after(async () => {
    try {
      await processHoaDocument(documentId);
    } catch (err) {
      console.error("after() HOA process failed", err);
    }
  });
}
