import { after } from "next/server";
import { processPowerBill } from "@/lib/power-bills/process-bill";

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

/**
 * Queue async bill processing.
 * On Netlify: invoke the background function (202, up to 15 min).
 * Elsewhere: use Next.js `after()` so the upload response returns immediately.
 */
export function enqueuePowerBillProcessing(billId: string): void {
  if (preferNetlifyBackground()) {
    const origin = siteOrigin();
    const secret = processSecret();
    const url = `${origin}/.netlify/functions/process-power-bill`;
    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ billId }),
    }).catch(async (err) => {
      console.error("Netlify background enqueue failed; falling back", err);
      try {
        await processPowerBill(billId);
      } catch (fallbackErr) {
        console.error("Inline bill process fallback failed", fallbackErr);
      }
    });
    return;
  }

  after(async () => {
    try {
      await processPowerBill(billId);
    } catch (err) {
      console.error("after() bill process failed", err);
    }
  });
}
