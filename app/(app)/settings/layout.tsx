import type { Metadata } from "next";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
          Account
        </p>
        <h1 className="font-display mt-1 text-4xl text-ink">Settings</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Your profile, purchases, and Stripe billing for this SolarFlow account.
        </p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
