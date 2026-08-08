import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icons } from "@/components/icons";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  BATTERY_COST,
  BATTERY_REPLACEMENT_COST,
  BATTERY_REPLACEMENT_YEAR,
  COST_PER_KW,
  DEFAULT_ENERGY_INFLATION_PCT,
  ITC_NET_FACTOR,
  calculateRoi,
  solarDriveFromInsights,
} from "@/lib/roi/calculate";
import { pageMetadata } from "@/lib/seo";
import { assessSolarCandidate } from "@/lib/solar/candidate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return pageMetadata({
    title: "Shared solar report",
    description:
      "A shared SolarFlow rooftop solar ROI report — roof insights, cost assumptions, and savings outlook for this project.",
    path: `/r/${token}`,
    image: "home",
    noIndex: true,
  });
}

export default async function SharedReportPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  let project: Project | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("*")
      .eq("share_token", token)
      .eq("share_enabled", true)
      .maybeSingle();
    project = (data as Project | null) ?? null;
  } catch (err) {
    console.error("shared report lookup failed:", err);
    notFound();
  }

  if (!project) notFound();

  const solarDrive = solarDriveFromInsights(
    project.solar_insights,
    project.selected_panel_config_index,
  );
  const result = calculateRoi({
    solar: project.solar,
    battery: project.battery,
    hvac: project.hvac,
    water: project.water,
    systemKwBase: project.system_kw_base,
    solarDrive,
    monthlyBillUsd: project.monthly_bill_usd,
    monthlyUsageKwh: project.monthly_usage_kwh,
    rateUsdPerKwh: project.rate_usd_per_kwh,
    energyInflationPct: project.energy_inflation_pct,
  });
  const candidate = assessSolarCandidate(
    project.solar_insights?.solarPotential?.maxSunshineHoursPerYear,
  );
  const address = `${project.address}, ${project.city}, ${project.state} ${project.zip}`;
  const options = [
    project.solar ? "Solar" : null,
    project.battery ? "Battery" : null,
    project.hvac ? "Heat pump HVAC" : null,
    project.water ? "Heat pump water" : null,
  ].filter(Boolean);

  return (
    <main className="flex-1">
      <MarketingHeader ctaHref="/signup" ctaLabel="Build my own" />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass">
          Shared report · read-only
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">{address}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {options.length ? options.join(" · ") : "No system options enabled"}
        </p>

        <section className="mt-10 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              System size
            </p>
            <p className="mt-1 font-display text-3xl text-ink">
              {result.systemKw} kW
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Break-even
            </p>
            <p className="mt-1 font-display text-3xl text-ink">
              {result.breakEvenYear != null
                ? `Year ${result.breakEvenYear}`
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              25-yr net savings
            </p>
            <p className="mt-1 font-display text-3xl text-ink">
              {money(result.netSavings25)}
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl text-ink">Utility baseline</h2>
          <ul className="text-sm text-ink-muted space-y-1">
            <li>Monthly bill before: {money(result.monthlyBillBefore)}</li>
            <li>
              Monthly usage: {result.monthlyUsageKwhBefore.toLocaleString()} kWh
            </li>
            <li>Blended rate: ${result.rateUsdPerKwh.toFixed(2)}/kWh</li>
            <li>
              Modeled monthly bill after: {money(result.monthlyBillAfter)} (
              {(result.offset * 100).toFixed(0)}% offset)
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-2xl text-ink">
            Assumptions (show your work)
          </h2>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>
              Planning PV cost: ${COST_PER_KW.toLocaleString("en-US")}/kW before
              incentives
              {result.solarDriven
                ? " · size/energy driven by Google Solar roof config"
                : " · using fallback system size until Roof Designer is set"}
            </li>
            <li>
              ITC illustration: {Math.round((1 - ITC_NET_FACTOR) * 100)}% federal
              residential credit in this 2026 model (×{ITC_NET_FACTOR}) — 25D
              generally unavailable after Dec 31, 2025; not tax advice
            </li>
            <li>
              Energy inflation:{" "}
              {result.energyInflationPct ?? DEFAULT_ENERGY_INFLATION_PCT}% / year
            </li>
            {project.battery ? (
              <li>
                Battery planning cost: ${BATTERY_COST.toLocaleString("en-US")}{" "}
                plus ${BATTERY_REPLACEMENT_COST.toLocaleString("en-US")}{" "}
                replacement in year {BATTERY_REPLACEMENT_YEAR}
              </li>
            ) : null}
            <li>Gross install (modeled): {money(result.grossCost)}</li>
            <li>Net planning cost: {money(result.netCost)}</li>
          </ul>
        </section>

        {candidate ? (
          <section className="mt-10 space-y-2">
            <h2 className="font-display text-2xl text-ink">Roof sunshine</h2>
            <p className="text-sm text-ink">
              {candidate.candidateAnswer} ({candidate.label})
            </p>
            <p className="text-sm text-ink-muted">{candidate.summary}</p>
          </section>
        ) : null}

        {project.county_links ? (
          <section className="mt-10 space-y-2">
            <h2 className="font-display text-2xl text-ink">
              Permitting notes
              {project.county_links.countyName
                ? ` · ${project.county_links.countyName}`
                : ""}
            </h2>
            <p className="text-sm text-ink-muted whitespace-pre-line">
              {project.county_links.summary}
            </p>
          </section>
        ) : null}

        <p className="mt-10 text-xs text-ink-muted">
          For planning only — not an engineering or financial offer. Generated for
          sharing between household decision-makers.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">
            <Icons.sun className="h-4 w-4" />
            Create my own SolarFlow project
          </Link>
          <Link href="/tools/quote-check" className="btn-secondary">
            Check an installer quote
          </Link>
        </div>
      </article>
    </main>
  );
}
