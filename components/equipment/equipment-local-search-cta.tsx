"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Icons } from "@/components/icons";
import { saveDraftProject, type DraftProject } from "@/lib/draft-project";
import { createClient } from "@/lib/supabase/client";
import { posthogRequestHeaders, track, trackException } from "@/lib/analytics";

type Props = {
  brandName: string;
  brandSlug: string;
  ctaPrimary: string;
  ctaCopy: string;
  defaultState?: string;
};

/**
 * Equipment local search requires an address + account/project.
 * Guests get the teaser → signup path; logged-in users create a project
 * and land on installers with a brand query hint.
 */
export function EquipmentLocalSearchCta({
  brandName,
  brandSlug,
  ctaPrimary,
  ctaCopy,
  defaultState = "",
}: Props) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(defaultState);
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProject | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim().toUpperCase();
    const trimmedZip = zip.trim();
    if (!trimmedAddress || !trimmedCity || !trimmedState || !trimmedZip) {
      setError("Street, city, state, and ZIP are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const full = `${trimmedAddress}, ${trimmedCity}, ${trimmedState} ${trimmedZip}`;
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...posthogRequestHeaders(),
        },
        body: JSON.stringify({ address: full }),
      });
      if (!res.ok) {
        throw new Error("We couldn’t find that address. Double-check and try again.");
      }
      const geo = await res.json();
      if (geo.lat == null || geo.lng == null) {
        throw new Error("We couldn’t find that address. Double-check and try again.");
      }

      const next: DraftProject = {
        name: `${trimmedCity} ${brandName} search`,
        address: trimmedAddress,
        city: geo.city || trimmedCity,
        state: geo.state || trimmedState,
        zip: geo.postalCode || trimmedZip,
        lat: geo.lat,
        lng: geo.lng,
        county: geo.county ?? null,
        sourceSlug: `equipment:${brandSlug}`,
      };

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error: insertError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: next.name,
            address: next.address,
            city: next.city,
            state: next.state,
            zip: next.zip,
            lat: next.lat,
            lng: next.lng,
            county: next.county,
            solar: true,
            battery: true,
            hvac: false,
            water: false,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        track("project_created", {
          project_id: data.id,
          state: next.state,
          source: "equipment_page",
          source_slug: brandSlug,
        });
        router.push(
          `/projects/${data.id}/installers?brand=${encodeURIComponent(brandSlug)}`,
        );
        router.refresh();
        return;
      }

      saveDraftProject(next);
      track("teaser_address_submitted", {
        source_slug: `equipment:${brandSlug}`,
        state: next.state,
      });
      setDraft(next);
    } catch (err) {
      trackException(err, { context: "equipment_cta" });
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section
        id="local-search"
        className="relative mt-14 overflow-hidden rounded-2xl bg-canopy px-6 py-10 text-white sm:px-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(600px 280px at 90% 0%, #C4A035, transparent 60%)",
          }}
        />
        <div className="relative max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass-soft">
            Local search · account required
          </p>
          <h2 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
            {ctaPrimary}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">{ctaCopy}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
                Street address
              </span>
              <input
                className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                required
                autoComplete="street-address"
              />
            </label>
            <div className="grid grid-cols-6 gap-2">
              <label className="col-span-3 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
                  City
                </span>
                <input
                  className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </label>
              <label className="col-span-1 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
                  State
                </span>
                <input
                  className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink uppercase"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  required
                />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
                  ZIP
                </span>
                <input
                  className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  required
                />
              </label>
            </div>
            {error ? (
              <p className="rounded-md bg-white/15 px-3 py-2 text-sm">{error}</p>
            ) : null}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brass px-4 py-3 text-sm font-semibold text-ink transition hover:bg-brass-soft sm:w-auto"
              disabled={loading}
            >
              <Icons.installers className="h-4 w-4" />
              {loading ? "Checking address…" : "Continue to local search"}
            </button>
          </form>
        </div>
      </section>

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
              Account required
            </p>
            <h3 className="font-display mt-2 text-2xl text-ink">
              Create a free account for {brandName} installers near you
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              {draft.address}, {draft.city}, {draft.state} {draft.zip}
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              We don’t publish national dealer lists on SEO pages. Your project
              unlocks a location-based installer search for this equipment.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/signup?from=teaser&next=/projects"
                className="btn-primary flex-1 justify-center"
                onClick={() =>
                  track("teaser_signup_clicked", {
                    source_slug: `equipment:${brandSlug}`,
                  })
                }
              >
                Create account
              </Link>
              <button
                type="button"
                className="btn-secondary flex-1 justify-center"
                onClick={() => setDraft(null)}
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
