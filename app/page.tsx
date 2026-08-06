import { Icons } from "@/components/icons";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-canopy text-white shadow-sm">
          <Icons.sun className="h-7 w-7" />
        </div>
        <p className="font-display text-5xl tracking-tight text-ink">SolarFlow</p>
        <p className="mt-4 text-base text-ink-muted">
          Model solar ROI, inspect Google Solar roof layouts, follow county permits,
          and find nearby installers — for every project in your portfolio.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">
            Sign in
          </Link>
          <Link href="/signup" className="btn-secondary">
            Create account
          </Link>
        </div>
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-canopy">
          <Link href="/solar-for" className="hover:underline">
            By utility bill
          </Link>
          <Link href="/solar-in" className="hover:underline">
            By city & county
          </Link>
          <Link href="/solar-permits" className="hover:underline">
            Permits
          </Link>
          <Link href="/tools/quote-check" className="hover:underline">
            Quote check
          </Link>
        </nav>
      </div>
    </main>
  );
}
