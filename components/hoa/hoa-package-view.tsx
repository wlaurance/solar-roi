"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/lib/types";
import type { HoaDocumentKind } from "@/lib/hoa/types";
import { formatHoaPackagePrice } from "@/lib/stripe/pricing";
import { Icons } from "@/components/icons";
import { track } from "@/lib/analytics";

type DocRow = {
  id: string;
  kind: HoaDocumentKind;
  original_filename: string;
  status: string;
  extracted_summary: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

type Props = {
  project: Project;
  stripeEnabled: boolean;
};

const KIND_LABELS: Record<HoaDocumentKind, string> = {
  rules: "Rules / CC&Rs",
  examples: "Example packets",
  templates: "Application templates",
  other: "Other",
};

export function HoaPackageView({ project, stripeEnabled }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unlocked = Boolean(project.hoa_package_unlocked_at);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [kind, setKind] = useState<HoaDocumentKind>("rules");
  const [uploading, setUploading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    if (!unlocked) return;
    const res = await fetch(`/api/hoa/documents?projectId=${project.id}`);
    if (!res.ok) return;
    const json = (await res.json()) as { documents: DocRow[] };
    setDocs(json.documents ?? []);
  }, [project.id, unlocked]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!unlocked) return;
    const pending = docs.some(
      (d) => d.status === "queued" || d.status === "processing",
    );
    if (!pending) return;
    const t = setInterval(() => void loadDocs(), 2500);
    return () => clearInterval(t);
  }, [docs, unlocked, loadDocs]);

  // Confirm Stripe checkout when redirected back with session_id
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout !== "success" || !sessionId || unlocked || confirming) return;

    let cancelled = false;
    setConfirming(true);
    void (async () => {
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!cancelled && res.ok) {
          track("hoa_package_unlocked_client", { project_id: project.id });
          router.replace(`/projects/${project.id}/hoa`);
          router.refresh();
        }
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, unlocked, confirming, project.id, router]);

  async function startCheckout() {
    setError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const json = (await res.json()) as {
        url?: string;
        error?: string;
        alreadyUnlocked?: boolean;
      };
      if (!res.ok) {
        setError(json.error ?? "Checkout failed");
        return;
      }
      if (json.alreadyUnlocked) {
        router.refresh();
        return;
      }
      if (json.url) {
        track("hoa_checkout_redirect", { project_id: project.id });
        window.location.href = json.url;
        return;
      }
      setError("No checkout URL returned");
    } catch {
      setError("Network error starting checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.length || !unlocked) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.set("file", file);
        form.set("projectId", project.id);
        form.set("kind", kind);
        const res = await fetch("/api/hoa/documents", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Upload failed");
          break;
        }
        track("hoa_document_upload_client", {
          project_id: project.id,
          kind,
        });
      }
      await loadDocs();
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const requirements = project.hoa_requirements;
  const application = project.hoa_application;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
        HOA approval package
      </p>
      <h1 className="font-display mt-2 text-4xl text-ink">
        Get board-ready for solar
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        Upload your association’s rules, examples, and templates. Solar bot
        extracts what the committee expects and helps fill the application for{" "}
        <span className="text-ink">{project.name}</span>.
      </p>

      {!unlocked ? (
        <section className="mt-10 border-y border-stone-2/80 py-8">
          <h2 className="font-display text-2xl text-ink">
            Unlock for {formatHoaPackagePrice()}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            One-time unlock for this project: document uploads, requirement
            extraction, solar map tools, application drafting, and Solar bot
            chat. Away from the app? We’ll email when the bot has a reply.
          </p>
          {!stripeEnabled ? (
            <p className="mt-4 text-sm text-ink-muted">
              Payments are not configured in this environment (
              <code className="text-xs">STRIPE_SECRET_KEY</code> missing).
            </p>
          ) : (
            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() => void startCheckout()}
              disabled={checkoutLoading || confirming}
            >
              {confirming
                ? "Confirming payment…"
                : checkoutLoading
                  ? "Redirecting…"
                  : `Unlock for ${formatHoaPackagePrice()}`}
            </button>
          )}
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </section>
      ) : (
        <>
          <p className="mt-6 inline-flex items-center gap-2 rounded-md bg-sage/50 px-3 py-1.5 text-sm text-canopy-deep">
            Unlocked
            {project.hoa_package_status
              ? ` · ${project.hoa_package_status.replace(/_/g, " ")}`
              : null}
          </p>

          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink">Upload HOA docs</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Rules & guidelines, example approved packets, and blank templates.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="label">Document type</span>
                <select
                  className="input mt-1"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as HoaDocumentKind)}
                >
                  {(Object.keys(KIND_LABELS) as HoaDocumentKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="btn-secondary cursor-pointer">
                {uploading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  "Choose files"
                )}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*"
                  disabled={uploading}
                  onChange={(e) => void onUpload(e.target.files)}
                />
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

            <ul className="mt-6 divide-y divide-stone-2/80 border-y border-stone-2/80">
              {docs.length === 0 ? (
                <li className="py-4 text-sm text-ink-muted">
                  No documents yet — upload CC&Rs or design guidelines to start.
                </li>
              ) : (
                docs.map((d) => (
                  <li key={d.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">
                        {d.original_filename}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-ink-muted">
                        {KIND_LABELS[d.kind] ?? d.kind} · {d.status}
                      </span>
                    </div>
                    {d.extracted_summary ? (
                      <p className="mt-2 text-sm text-ink-muted">
                        {d.extracted_summary}
                      </p>
                    ) : null}
                    {d.error_message ? (
                      <p className="mt-2 text-sm text-danger">{d.error_message}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>

          {requirements?.requirements?.length ? (
            <section className="mt-12">
              <h2 className="font-display text-2xl text-ink">
                Extracted requirements
              </h2>
              {requirements.summary ? (
                <p className="mt-2 text-sm text-ink-muted">
                  {requirements.summary}
                </p>
              ) : null}
              <ul className="mt-4 space-y-3">
                {requirements.requirements.map((r) => (
                  <li key={r.id} className="border-b border-stone-2/70 pb-3">
                    <p className="font-medium text-ink">{r.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{r.detail}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-brass">
                      {r.category}
                      {r.mandatory ? " · required" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {application?.fields?.length ? (
            <section className="mt-12">
              <h2 className="font-display text-2xl text-ink">
                {application.title || "Application draft"}
              </h2>
              <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
                Status: {application.status}
              </p>
              {application.coverLetter ? (
                <p className="mt-4 whitespace-pre-wrap text-sm text-ink-muted">
                  {application.coverLetter}
                </p>
              ) : null}
              <dl className="mt-4 space-y-3">
                {application.fields.map((f) => (
                  <div key={f.key} className="border-b border-stone-2/70 pb-3">
                    <dt className="text-sm font-medium text-ink">{f.label}</dt>
                    <dd className="mt-1 text-sm text-ink-muted">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <p className="mt-10 text-sm text-ink-muted">
              Open Solar bot (corner) and ask it to extract requirements or draft
              your application once docs are parsed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
