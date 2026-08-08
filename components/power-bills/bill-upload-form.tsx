"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icons } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { stashPendingBill } from "@/lib/pending-bill";
import { posthogRequestHeaders, track, trackException } from "@/lib/analytics";
import type { PowerBillParsed, PowerBillStatus } from "@/lib/power-bills/types";

type Props = {
  utilitySlug: string;
  utilityName: string;
  projectId?: string | null;
  /** Marketing vs in-app surface */
  variant?: "marketing" | "project";
  onParsed?: (parsed: PowerBillParsed) => void;
};

function statusLabel(status: PowerBillStatus): string {
  switch (status) {
    case "queued":
      return "Queued for parsing…";
    case "processing":
      return "Extracting bill data…";
    case "completed":
      return "Parsed";
    case "failed":
      return "Parse failed";
    default:
      return status;
  }
}

export function BillUploadForm({
  utilitySlug,
  utilityName,
  projectId = null,
  variant = "marketing",
  onParsed,
}: Props) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [status, setStatus] = useState<PowerBillStatus | null>(null);
  const [parsed, setParsed] = useState<PowerBillParsed | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(Boolean(data.user));
    });
  }, []);

  useEffect(() => {
    if (!billId) return;
    if (status === "completed" || status === "failed") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/power-bills/${billId}`, {
          headers: posthogRequestHeaders(),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          bill: {
            status: PowerBillStatus;
            parsed: PowerBillParsed | null;
            error_message: string | null;
          };
        };
        setStatus(json.bill.status);
        if (json.bill.parsed) {
          setParsed(json.bill.parsed);
          onParsed?.(json.bill.parsed);
        }
        if (json.bill.status === "failed") {
          setError(json.bill.error_message || "Could not parse this bill");
        }
      } catch {
        // ignore transient poll errors
      }
    };

    void tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [billId, status, onParsed]);

  function acceptFile(next: File | null) {
    setError(null);
    setParsed(null);
    setBillId(null);
    setStatus(null);
    if (!next) {
      setFile(null);
      return;
    }
    const okType =
      next.type === "application/pdf" ||
      next.type.startsWith("image/") ||
      next.name.toLowerCase().endsWith(".pdf");
    if (!okType) {
      setError("Please choose a PDF statement (images accepted as fallback).");
      setFile(null);
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      setError("Max file size is 15 MB.");
      setFile(null);
      return;
    }
    setFile(next);
    track("power_bill_file_selected", {
      utility_slug: utilitySlug,
      byte_size: next.size,
      mime_type: next.type || "unknown",
      variant,
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Attach your bill first.");
      return;
    }
    setError(null);

    if (!authed) {
      startTransition(async () => {
        try {
          await stashPendingBill({
            file,
            utilitySlug,
            utilityName,
            projectId,
          });
          track("power_bill_auth_gate", {
            utility_slug: utilitySlug,
            variant,
          });
          const next = `/upload-bill/${utilitySlug}?claim=1`;
          router.push(
            `/signup?from=bill&utility=${encodeURIComponent(utilitySlug)}&next=${encodeURIComponent(next)}`,
          );
        } catch (err) {
          trackException(err, { context: "stash_pending_bill" });
          setError(
            err instanceof Error
              ? err.message
              : "Could not save your bill locally. Try again.",
          );
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const body = new FormData();
        body.set("file", file);
        body.set("utilitySlug", utilitySlug);
        if (projectId) body.set("projectId", projectId);

        const res = await fetch("/api/power-bills", {
          method: "POST",
          body,
          headers: posthogRequestHeaders(),
        });
        const json = (await res.json()) as {
          error?: string;
          code?: string;
          bill?: { id: string; status: PowerBillStatus };
        };

        if (res.status === 401 || json.code === "auth_required") {
          await stashPendingBill({
            file,
            utilitySlug,
            utilityName,
            projectId,
          });
          router.push(
            `/signup?from=bill&utility=${encodeURIComponent(utilitySlug)}&next=${encodeURIComponent(`/upload-bill/${utilitySlug}?claim=1`)}`,
          );
          return;
        }

        if (!res.ok || !json.bill) {
          throw new Error(json.error || "Upload failed");
        }

        setBillId(json.bill.id);
        setStatus(json.bill.status);
        track("power_bill_submitted", {
          bill_id: json.bill.id,
          utility_slug: utilitySlug,
          project_id: projectId,
          variant,
        });

        if (variant === "project" && projectId) {
          router.refresh();
        }
      } catch (err) {
        track("power_bill_submit_failed", {
          utility_slug: utilitySlug,
          error: err instanceof Error ? err.message : "failed",
        });
        trackException(err, { context: "power_bill_submit" });
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  const busy = pending || status === "queued" || status === "processing";

  return (
    <form
      onSubmit={onSubmit}
      className={
        variant === "marketing"
          ? "mt-8"
          : "rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm sm:p-5"
      }
    >
      {variant === "project" ? (
        <div className="mb-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-ink-muted">
            Upload power bill
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Drop a {utilityName} PDF — we extract usage and dollars into this
            project.
          </p>
        </div>
      ) : null}

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0] ?? null;
          acceptFile(dropped);
        }}
        className={`relative rounded-xl border border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? "border-canopy bg-sage/40"
            : "border-stone-2 bg-stone/50 hover:border-canopy/50"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf"
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
        <Icons.download className="mx-auto h-6 w-6 text-canopy" />
        <p className="font-display mt-3 text-xl text-ink">
          {file ? file.name : `Attach your ${utilityName} bill`}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          PDF preferred · up to 15 MB · stays on this device until you create an
          account
        </p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="mt-3 rounded-md bg-canopy/10 px-3 py-2 text-sm text-canopy-deep">
          {statusLabel(status)}
          {status === "queued" || status === "processing" ? (
            <Icons.spinner className="ml-2 inline h-4 w-4 animate-spin" />
          ) : null}
        </p>
      ) : null}

      {parsed ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {parsed.amountDueUsd != null ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-ink-muted">
                Amount due
              </dt>
              <dd className="font-medium text-ink">
                ${parsed.amountDueUsd.toFixed(2)}
              </dd>
            </div>
          ) : null}
          {parsed.totalKwh != null ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-ink-muted">
                Usage
              </dt>
              <dd className="font-medium text-ink">
                {parsed.totalKwh.toLocaleString()} kWh
              </dd>
            </div>
          ) : null}
          {parsed.blendedRateUsdPerKwh != null ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-ink-muted">
                Blended rate
              </dt>
              <dd className="font-medium text-ink">
                ${parsed.blendedRateUsdPerKwh.toFixed(3)}/kWh
              </dd>
            </div>
          ) : null}
          {parsed.billingPeriodStart || parsed.billingPeriodEnd ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-ink-muted">
                Period
              </dt>
              <dd className="font-medium text-ink">
                {[parsed.billingPeriodStart, parsed.billingPeriodEnd]
                  .filter(Boolean)
                  .join(" → ")}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy || !file}>
          {authed === false
            ? "Continue — create account to submit"
            : busy
              ? "Working…"
              : "Upload & parse bill"}
        </button>
        {authed === false ? (
          <p className="text-xs text-ink-muted">
            Already have an account?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/upload-bill/${utilitySlug}?claim=1`)}`}
              className="font-medium text-canopy hover:underline"
              onClick={() => {
                if (file) {
                  void stashPendingBill({
                    file,
                    utilitySlug,
                    utilityName,
                    projectId,
                  });
                }
              }}
            >
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </form>
  );
}
