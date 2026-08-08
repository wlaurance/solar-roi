import type { Config, Context } from "@netlify/functions";

/**
 * Netlify background function — client gets 202 immediately; work may run up to ~15 min.
 *
 * Invokes the shared processor via dynamic import so the Next.js app and this
 * function share one implementation (PDF→HTML→regex→Gemini→Supabase).
 */
export default async function handler(request: Request, _context: Context) {
  void _context;
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret =
    process.env.BILL_PROCESS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let billId: string | undefined;
  try {
    const body = (await request.json()) as { billId?: string };
    billId = body.billId;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!billId) {
    return new Response("billId required", { status: 400 });
  }

  try {
    const { processPowerBill } = await import(
      "../../lib/power-bills/process-bill"
    );
    await processPowerBill(billId);
    return new Response(JSON.stringify({ ok: true, billId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-power-bill failed", err);
    // Persist failure on the row inside processPowerBill; still acknowledge.
    return new Response(
      JSON.stringify({
        ok: false,
        billId,
        error: err instanceof Error ? err.message : "failed",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const config: Config = {
  // Newer Netlify functions API (falls back to -background naming if ignored).
  background: true,
  path: "/.netlify/functions/process-power-bill",
};
