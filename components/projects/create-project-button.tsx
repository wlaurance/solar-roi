"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PROJECT_ADDRESS } from "@/lib/types";

export function CreateProjectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createProject() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let lat: number = DEFAULT_PROJECT_ADDRESS.lat;
      let lng: number = DEFAULT_PROJECT_ADDRESS.lng;

      try {
        const geoRes = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: `${DEFAULT_PROJECT_ADDRESS.address}, ${DEFAULT_PROJECT_ADDRESS.city}, ${DEFAULT_PROJECT_ADDRESS.state} ${DEFAULT_PROJECT_ADDRESS.zip}`,
          }),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.lat != null && geo.lng != null) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }
      } catch {
        // Keep fallback lat/lng
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: DEFAULT_PROJECT_ADDRESS.name,
          address: DEFAULT_PROJECT_ADDRESS.address,
          city: DEFAULT_PROJECT_ADDRESS.city,
          state: DEFAULT_PROJECT_ADDRESS.state,
          zip: DEFAULT_PROJECT_ADDRESS.zip,
          lat,
          lng,
          solar: true,
          battery: true,
          hvac: false,
          water: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/projects/${data.id}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        className="btn-primary"
        onClick={createProject}
        disabled={loading}
      >
        <Icons.plus className="h-4 w-4" />
        {loading ? "Creating…" : "New design"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
