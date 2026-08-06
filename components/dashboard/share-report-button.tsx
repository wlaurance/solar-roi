"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { posthogRequestHeaders, track, trackException } from "@/lib/analytics";
import type { Project } from "@/lib/types";

type Props = {
  project: Project;
};

export function ShareReportButton({ project }: Props) {
  const [enabled, setEnabled] = useState(Boolean(project.share_enabled));
  const [token, setToken] = useState(project.share_token);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl =
    enabled && token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${token}`
      : null;

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...posthogRequestHeaders(),
        },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not update sharing");
      }
      const data = await res.json();
      setEnabled(Boolean(data.share_enabled));
      setToken(data.share_token ?? null);
      track("project_share_toggled", {
        project_id: project.id,
        enabled: Boolean(data.share_enabled),
      });
      if (data.share_enabled && data.share_url) {
        await navigator.clipboard.writeText(data.share_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      trackException(err, { context: "share_report" });
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("project_share_copied", { project_id: project.id });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!enabled ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => toggle(true)}
          disabled={busy}
        >
          {busy ? (
            <Icons.spinner className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.projects className="h-4 w-4" />
          )}
          Share report link
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={copyLink}
            disabled={busy}
          >
            {copied ? "Copied!" : "Copy share link"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => toggle(false)}
            disabled={busy}
          >
            Stop sharing
          </button>
        </div>
      )}
      {enabled ? (
        <p className="max-w-xs text-right text-xs text-ink-muted">
          Anyone with the link can view a read-only spouse-ready summary (no
          account required).
        </p>
      ) : (
        <p className="max-w-xs text-right text-xs text-ink-muted">
          Create a public link for your spouse or partner — assumptions labeled.
        </p>
      )}
      {error ? (
        <p className="max-w-xs text-right text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
