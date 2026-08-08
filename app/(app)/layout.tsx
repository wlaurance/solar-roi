import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
  openGraph: {
    images: [{ url: "/og/og-home.jpg", width: 1200, height: 630 }],
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
