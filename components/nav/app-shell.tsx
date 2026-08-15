"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { PresenceHeartbeat } from "@/components/hoa/presence-heartbeat";
import { SolarBotWidget } from "@/components/hoa/solar-bot-widget";
import { createClient } from "@/lib/supabase/client";
import { resetAnalytics, track } from "@/lib/analytics";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  short: string;
};

function projectNav(projectId: string): NavItem[] {
  return [
    {
      href: `/projects/${projectId}/dashboard`,
      label: "ROI Dashboard",
      icon: "chart",
      short: "ROI",
    },
    {
      href: `/projects/${projectId}/roof`,
      label: "Roof Designer",
      icon: "roof",
      short: "Roof",
    },
    {
      href: `/projects/${projectId}/hoa`,
      label: "HOA Package",
      icon: "hoa",
      short: "HOA",
    },
    {
      href: `/projects/${projectId}/permits`,
      label: "County Permits",
      icon: "permit",
      short: "Permits",
    },
    {
      href: `/projects/${projectId}/installers`,
      label: "Find Installers",
      icon: "installers",
      short: "Installers",
    },
  ];
}

const topNav: NavItem[] = [
  { href: "/projects", label: "Projects", icon: "projects", short: "Projects" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? params.id : undefined;
  const [projectName, setProjectName] = useState<string | null>(null);
  const [hoaUnlocked, setHoaUnlocked] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      setHoaUnlocked(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("projects")
      .select("name, hoa_package_unlocked_at")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProjectName(data?.name ?? null);
          setHoaUnlocked(Boolean(data?.hoa_package_unlocked_at));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, pathname]);

  const items = projectId ? [...topNav, ...projectNav(projectId)] : topNav;

  async function signOut() {
    track("user_logged_out");
    const supabase = createClient();
    await supabase.auth.signOut();
    resetAnalytics();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-stone-2/80 bg-surface/80 backdrop-blur md:flex md:flex-col">
        <div className="border-b border-stone-2/80 px-5 py-6">
          <Link href="/projects" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canopy text-white">
              <Icons.sun className="h-5 w-5" />
            </span>
            <span>
              <span className="font-display block text-2xl leading-none text-ink">
                SolarFlow
              </span>
              <span className="mt-1 block text-xs text-ink-muted">Portfolio studio</span>
            </span>
          </Link>
          {projectName ? (
            <p className="mt-4 truncate rounded-md bg-sage/50 px-3 py-2 text-sm text-canopy-deep">
              {projectName}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => {
            const active =
              item.href === "/projects"
                ? pathname === "/projects"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = Icons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-canopy text-white"
                    : "text-ink-muted hover:bg-stone hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-2/80 p-3">
          <Link
            href="/settings"
            className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-canopy text-white"
                : "text-ink-muted hover:bg-stone hover:text-ink"
            }`}
          >
            <Icons.settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink-muted transition hover:bg-stone hover:text-ink"
          >
            <Icons.logout className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-2/80 bg-surface/70 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/projects" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canopy text-white">
              <Icons.sun className="h-4 w-4" />
            </span>
            <span className="font-display text-xl text-ink">SolarFlow</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className={`rounded-md p-2 hover:bg-stone ${
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "text-canopy"
                  : "text-ink-muted"
              }`}
              aria-label="Settings"
            >
              <Icons.settings className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md p-2 text-ink-muted hover:bg-stone"
              aria-label="Sign out"
            >
              <Icons.logout className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>

        <PresenceHeartbeat />
        {projectId ? (
          <SolarBotWidget projectId={projectId} unlocked={hoaUnlocked} />
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-2/80 bg-surface/95 backdrop-blur md:hidden">
          <ul
            className="grid gap-0.5 px-1 py-1"
            style={{
              gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, minmax(0, 1fr))`,
            }}
          >
            {items.slice(0, 6).map((item) => {
              const active =
                item.href === "/projects"
                  ? pathname === "/projects"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = Icons[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 rounded-md px-1 py-2 text-[10px] ${
                      active ? "text-canopy" : "text-ink-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{item.short}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
