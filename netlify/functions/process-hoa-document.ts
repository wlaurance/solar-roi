import type { Config, Context } from "@netlify/functions";
import { processHoaDocument } from "../../lib/hoa/process-document";

export default async function handler(req: Request, context: Context) {
  void context;
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret =
    process.env.HOA_PROCESS_SECRET?.trim() ||
    process.env.BILL_PROCESS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    documentId?: string;
  } | null;
  const documentId = body?.documentId?.trim();
  if (!documentId) {
    return new Response("documentId required", { status: 400 });
  }

  try {
    await processHoaDocument(documentId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-hoa-document failed", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const config: Config = {
  background: true,
  path: "/.netlify/functions/process-hoa-document",
};
