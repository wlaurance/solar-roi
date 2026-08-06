import Link from "next/link";
import { Icons } from "@/components/icons";

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

export function MarketingHeader({
  ctaHref = "/signup",
  ctaLabel = "Create account",
}: Props) {
  return (
    <header className="border-b border-stone-2/70 bg-surface/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canopy text-white">
            <Icons.sun className="h-4 w-4" />
          </span>
          <span className="font-display text-xl tracking-tight">SolarFlow</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary px-3 py-2 text-xs">
            Sign in
          </Link>
          <a href={ctaHref} className="btn-primary px-3 py-2 text-xs">
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}
