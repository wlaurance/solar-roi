"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings", label: "Profile", exact: true },
  { href: "/settings/purchases", label: "Purchases", exact: false },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex gap-1 rounded-xl border border-stone-2/80 bg-surface/80 p-1"
      aria-label="Settings sections"
    >
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              active
                ? "bg-canopy text-white"
                : "text-ink-muted hover:bg-stone hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
