import Link from "next/link";
import { Icons } from "@/components/icons";
import type { Purchase } from "@/lib/stripe/purchases";
import { formatMoneyCents, projectLocationLine } from "@/lib/stripe/purchases";

const STATUS_LABEL: Record<Purchase["status"], string> = {
  paid: "Paid",
  pending: "Incomplete",
  failed: "Failed",
  refunded: "Refunded",
};

function statusClass(status: Purchase["status"]): string {
  if (status === "paid") return "bg-canopy/10 text-canopy-deep";
  if (status === "refunded") return "bg-brass/15 text-brass";
  if (status === "failed") return "bg-danger/10 text-danger";
  return "bg-stone-2 text-ink-muted";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function PurchasesList({ purchases }: { purchases: Purchase[] }) {
  if (purchases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sage-deep/40 bg-surface/60 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sage text-canopy">
          <Icons.hoa className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl text-ink">No purchases yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          HOA packages and other paid unlocks will show up here, with a link back
          to the project they belong to.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {purchases.map((purchase) => {
        const when = purchase.paidAt ?? purchase.createdAt;
        const location = purchase.project
          ? projectLocationLine(purchase.project)
          : null;
        const inner = (
          <>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage text-canopy">
              <Icons.hoa className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-medium text-ink">
                  {purchase.productName}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${statusClass(purchase.status)}`}
                >
                  {STATUS_LABEL[purchase.status]}
                </span>
              </div>
              {purchase.project ? (
                <p className="mt-1 text-sm text-ink">
                  {purchase.project.name}
                  {location ? (
                    <span className="text-ink-muted"> · {location}</span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Project unavailable</p>
              )}
              <p className="mt-1 text-sm text-ink-muted">
                {formatMoneyCents(purchase.amountCents, purchase.currency)}
                {when ? ` · ${formatDate(when)}` : null}
              </p>
            </div>
            {purchase.href ? (
              <Icons.chevron className="mt-1 h-5 w-5 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-canopy" />
            ) : null}
          </>
        );

        return (
          <li key={purchase.id}>
            {purchase.href ? (
              <Link
                href={purchase.href}
                className="group flex items-start gap-4 rounded-2xl border border-stone-2/80 bg-surface/90 p-5 shadow-sm transition hover:border-canopy/40 hover:shadow-md"
              >
                {inner}
              </Link>
            ) : (
              <div className="flex items-start gap-4 rounded-2xl border border-stone-2/80 bg-surface/90 p-5 shadow-sm">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
