"use client";

import { useCallback, useEffect, useState } from "react";
import { BillUploadForm } from "@/components/power-bills/bill-upload-form";
import { posthogRequestHeaders } from "@/lib/analytics";
import type { PowerBillParsed } from "@/lib/power-bills/types";

export type UtilityOption = {
  slug: string;
  name: string;
  state: string;
};

type BillSummary = {
  id: string;
  status: string;
  original_filename: string;
  utility_slug: string | null;
  parsed: PowerBillParsed | null;
  error_message: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  utilities: UtilityOption[];
  defaultUtilitySlug?: string | null;
  onParsed?: (parsed: PowerBillParsed) => void;
};

export function ProjectBillPanel({
  projectId,
  utilities,
  defaultUtilitySlug,
  onParsed,
}: Props) {
  const [utilitySlug, setUtilitySlug] = useState(
    defaultUtilitySlug || utilities[0]?.slug || "pge",
  );
  const utilityName =
    utilities.find((u) => u.slug === utilitySlug)?.name ||
    utilitySlug.toUpperCase();
  const [recent, setRecent] = useState<BillSummary[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/power-bills?projectId=${projectId}`, {
      headers: posthogRequestHeaders(),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { bills: BillSummary[] };
    setRecent(json.bills ?? []);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/power-bills?projectId=${projectId}`, {
        headers: posthogRequestHeaders(),
      });
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as { bills: BillSummary[] };
      if (!cancelled) setRecent(json.bills ?? []);
    })().catch(() => {
      /* ignore list refresh errors */
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-ink-muted">
          Utility
          <select
            className="mt-1 block min-w-[12rem] rounded-lg border border-stone-line bg-white px-3 py-2 text-sm text-ink"
            value={utilitySlug}
            onChange={(e) => setUtilitySlug(e.target.value)}
          >
            {utilities.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.name} ({u.state})
              </option>
            ))}
          </select>
        </label>
      </div>

      <BillUploadForm
        utilitySlug={utilitySlug}
        utilityName={utilityName}
        projectId={projectId}
        variant="project"
        onParsed={(parsed) => {
          onParsed?.(parsed);
          void refresh();
        }}
      />

      {recent.length ? (
        <ul className="space-y-2 text-xs text-ink-muted">
          {recent.slice(0, 5).map((bill) => (
            <li
              key={bill.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-2/70 bg-stone/40 px-3 py-2"
            >
              <span className="truncate text-ink">{bill.original_filename}</span>
              <span className="uppercase tracking-[0.08em]">{bill.status}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
