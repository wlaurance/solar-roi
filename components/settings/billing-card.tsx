"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { track } from "@/lib/analytics";
import type { CardOnFile } from "@/lib/stripe/billing";
import { formatCardBrand, formatCardExpiry } from "@/lib/stripe/purchases";

type Props = {
  cards: CardOnFile[];
  stripeEnabled: boolean;
};

export function BillingCard({ cards, stripeEnabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = cards[0] ?? null;

  async function openPortal() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not open billing.");
        return;
      }
      track("billing_portal_redirect");
      window.location.href = json.url;
    } catch {
      setError("Could not open billing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-2/80 bg-surface/90 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-ink">Payment method</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cards are stored with Stripe. Manage them in the customer portal.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-canopy">
          <Icons.card className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5">
        {card ? (
          <div className="relative h-40 max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-canopy to-canopy-deep p-5 text-white shadow-md">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              {formatCardBrand(card.brand)}
            </p>
            <p className="mt-10 font-mono text-lg tracking-[0.22em]">
              •••• •••• •••• {card.last4}
            </p>
            <p className="mt-6 text-sm text-white/80">
              Expires {formatCardExpiry(card.expMonth, card.expYear)}
            </p>
          </div>
        ) : (
          <div className="flex h-40 max-w-sm flex-col justify-center rounded-2xl border border-dashed border-sage-deep/50 bg-sage/30 px-5">
            <p className="text-sm font-medium text-ink">No card on file</p>
            <p className="mt-1 text-sm text-ink-muted">
              {stripeEnabled
                ? "Open Stripe to add or update a payment method."
                : "Payments are not configured in this environment."}
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="btn-secondary mt-5"
        onClick={() => void openPortal()}
        disabled={!stripeEnabled || loading}
      >
        {loading ? "Opening Stripe…" : "Manage in Stripe"}
      </button>
    </section>
  );
}
