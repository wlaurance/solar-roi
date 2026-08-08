"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  clearPendingBill,
  readPendingBillFile,
  readPendingBillMeta,
} from "@/lib/pending-bill";
import { posthogRequestHeaders, track, trackException } from "@/lib/analytics";

/**
 * After signup/login, upload a bill that was stashed client-side on the marketing page.
 */
export function ClaimPendingBill() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claim = searchParams.get("claim") === "1";
  const ran = useRef(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    const meta = readPendingBillMeta();
    if (!meta) return;
    if (!claim && typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/projects")) return;
    }
    ran.current = true;

    let cancelled = false;

    (async () => {
      setStatus("Submitting the bill you attached…");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const file = await readPendingBillFile();
      if (!file) {
        await clearPendingBill();
        setStatus(null);
        return;
      }

      let projectId = meta.projectId ?? null;
      if (!projectId) {
        const { data: latest } = await supabase
          .from("projects")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        projectId = latest?.id ?? null;
      }

      const body = new FormData();
      body.set("file", file);
      body.set("utilitySlug", meta.utilitySlug);
      if (projectId) body.set("projectId", projectId);

      const res = await fetch("/api/power-bills", {
        method: "POST",
        body,
        headers: posthogRequestHeaders(),
      });
      const json = (await res.json()) as {
        error?: string;
        bill?: { id: string; project_id?: string | null };
      };

      if (cancelled) return;

      if (!res.ok || !json.bill) {
        track("pending_bill_claim_failed", {
          error: json.error ?? "unknown",
          utility_slug: meta.utilitySlug,
        });
        trackException(new Error(json.error ?? "claim failed"));
        setStatus(
          json.error ?? "Could not submit your bill. Try uploading again.",
        );
        return;
      }

      track("pending_bill_claimed", {
        bill_id: json.bill.id,
        utility_slug: meta.utilitySlug,
        project_id: projectId,
      });
      await clearPendingBill();

      if (projectId) {
        setStatus("Bill submitted — opening your project…");
        router.replace(`/projects/${projectId}/dashboard?bill=${json.bill.id}`);
        router.refresh();
      } else {
        setStatus(
          "Bill submitted for parsing. Create a project to apply the numbers.",
        );
        router.replace("/projects");
        router.refresh();
      }
    })().catch((err) => {
      trackException(err, { context: "claim_pending_bill" });
      setStatus(err instanceof Error ? err.message : "Could not submit bill");
    });

    return () => {
      cancelled = true;
    };
  }, [claim, router]);

  if (!status) return null;

  return (
    <div className="mb-6 rounded-xl border border-canopy/25 bg-sage/30 px-4 py-3 text-sm text-canopy-deep">
      {status}
    </div>
  );
}
