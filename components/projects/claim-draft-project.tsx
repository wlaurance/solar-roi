"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  clearDraftProject,
  readDraftProject,
} from "@/lib/draft-project";

/**
 * After signup/login, turn a sessionStorage teaser address into the user's first project.
 */
export function ClaimDraftProject() {
  const router = useRouter();
  const ran = useRef(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const draft = readDraftProject();
    if (!draft) return;

    let cancelled = false;

    (async () => {
      setStatus("Creating your project from the address you entered…");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true });

      // Only auto-create when the portfolio is empty (first project)
      if ((count ?? 0) > 0) {
        clearDraftProject();
        setStatus(null);
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: draft.name,
          address: draft.address,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
          lat: draft.lat,
          lng: draft.lng,
          county: draft.county,
          solar: true,
          battery: true,
          hvac: false,
          water: false,
        })
        .select("id")
        .single();

      if (cancelled) return;

      if (error || !data) {
        setStatus(
          error?.message ?? "Could not create your draft project. Use New design.",
        );
        return;
      }

      clearDraftProject();
      router.replace(`/projects/${data.id}/dashboard`);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!status) return null;

  return (
    <div className="mb-6 rounded-xl border border-canopy/25 bg-sage/30 px-4 py-3 text-sm text-canopy-deep">
      {status}
    </div>
  );
}
