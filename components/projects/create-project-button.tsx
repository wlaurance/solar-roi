"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

export function CreateProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedZip = zip.trim();

    if (!trimmedName || !trimmedAddress || !trimmedCity || !trimmedZip) {
      setError("Name, street address, city, and ZIP are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const fullAddress = `${trimmedAddress}, ${trimmedCity}, ${state.trim()} ${trimmedZip}`;
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: fullAddress }),
      });
      if (!geoRes.ok) {
        throw new Error("Could not geocode that address. Check it and try again.");
      }
      const geo = await geoRes.json();
      if (geo.lat == null || geo.lng == null) {
        throw new Error("Could not geocode that address. Check it and try again.");
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: trimmedName,
          address: trimmedAddress,
          city: trimmedCity,
          state: state.trim() || "CA",
          zip: trimmedZip,
          lat: geo.lat,
          lng: geo.lng,
          county: geo.county ?? null,
          solar: true,
          battery: true,
          hvac: false,
          water: false,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      setOpen(false);
      router.push(`/projects/${data.id}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
      >
        <Icons.plus className="h-4 w-4" />
        New design
      </button>
    );
  }

  return (
    <form
      onSubmit={createProject}
      className="w-full max-w-md space-y-3 rounded-2xl border border-stone-line bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">New project</h2>
        <button
          type="button"
          className="text-xs text-ink-muted hover:text-ink"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink-muted">Name</span>
        <input
          className="w-full rounded-lg border border-stone-line px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Home solar design"
          required
          autoFocus
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink-muted">Street address</span>
        <input
          className="w-full rounded-lg border border-stone-line px-3 py-2 text-sm"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St"
          required
        />
      </label>
      <div className="grid grid-cols-6 gap-2">
        <label className="col-span-3 block space-y-1">
          <span className="text-xs font-medium text-ink-muted">City</span>
          <input
            className="w-full rounded-lg border border-stone-line px-3 py-2 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </label>
        <label className="col-span-1 block space-y-1">
          <span className="text-xs font-medium text-ink-muted">State</span>
          <input
            className="w-full rounded-lg border border-stone-line px-3 py-2 text-sm"
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={2}
            required
          />
        </label>
        <label className="col-span-2 block space-y-1">
          <span className="text-xs font-medium text-ink-muted">ZIP</span>
          <input
            className="w-full rounded-lg border border-stone-line px-3 py-2 text-sm"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            required
          />
        </label>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
