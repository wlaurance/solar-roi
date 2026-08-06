"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Chart,
} from "chart.js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Line } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import {
  BASE_ELEC,
  DEFAULT_ENERGY_INFLATION_PCT,
  DEFAULT_RATE_USD_PER_KWH,
  calculateRoi,
  resolveBaselineMonthlyBill,
  resolveBaselineMonthlyUsageKwh,
  resolveEnergyInflationPct,
  resolveRate,
  solarDriveFromInsights,
} from "@/lib/roi/calculate";
import { ShareReportButton } from "@/components/dashboard/share-report-button";
import { exportProjectPdf } from "@/lib/report/export-project-pdf";
import {
  ensureCountyForProject,
  fetchInstallersForProject,
  fetchRoofMapDataUrl,
} from "@/lib/report/prepare-export";
import { assessSolarCandidate } from "@/lib/solar/candidate";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { track, trackException } from "@/lib/analytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundKwh(n: number) {
  return Math.round(n);
}

export function RoiDashboard({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toggles, setToggles] = useState({
    solar: project.solar,
    battery: project.battery,
    hvac: project.hvac,
    water: project.water,
  });

  const initialRate = resolveRate(project.rate_usd_per_kwh);
  const initialInflationPct = resolveEnergyInflationPct(
    project.energy_inflation_pct != null
      ? Number(project.energy_inflation_pct)
      : null,
  );
  const initialBill = resolveBaselineMonthlyBill({
    monthlyBillUsd: project.monthly_bill_usd,
    monthlyUsageKwh: project.monthly_usage_kwh,
    rateUsdPerKwh: initialRate,
  });
  const initialKwh = resolveBaselineMonthlyUsageKwh({
    monthlyBillUsd: project.monthly_bill_usd,
    monthlyUsageKwh: project.monthly_usage_kwh,
    rateUsdPerKwh: initialRate,
  });

  const [rate, setRate] = useState(initialRate);
  const [inflationPct, setInflationPct] = useState(initialInflationPct);
  const [inflationInput, setInflationInput] = useState(
    String(initialInflationPct),
  );
  const [billInput, setBillInput] = useState(String(roundMoney(initialBill)));
  const [kwhInput, setKwhInput] = useState(String(roundKwh(initialKwh)));
  const [billUsd, setBillUsd] = useState(roundMoney(initialBill));
  const [usageKwh, setUsageKwh] = useState(roundKwh(initialKwh));
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  const solarDrive = useMemo(
    () =>
      solarDriveFromInsights(
        project.solar_insights,
        project.selected_panel_config_index,
      ),
    [project.solar_insights, project.selected_panel_config_index],
  );

  const result = useMemo(
    () =>
      calculateRoi({
        ...toggles,
        systemKwBase: Number(project.system_kw_base),
        solarDrive,
        monthlyBillUsd: billUsd,
        monthlyUsageKwh: usageKwh,
        rateUsdPerKwh: rate,
        energyInflationPct: inflationPct,
      }),
    [
      toggles,
      project.system_kw_base,
      solarDrive,
      billUsd,
      usageKwh,
      rate,
      inflationPct,
    ],
  );

  const candidate = useMemo(
    () =>
      assessSolarCandidate(
        project.solar_insights?.solarPotential?.maxSunshineHoursPerYear,
      ),
    [project.solar_insights],
  );

  async function handleExportPdf() {
    setExporting(true);
    setExportError(null);
    setExportStatus("Preparing chart…");
    track("pdf_export_started", { project_id: project.id });
    try {
      const chartDataUrl = chartRef.current?.toBase64Image("image/png", 1) ?? null;

      setExportStatus("Loading roof map, installers, and county info…");
      const [roofMapDataUrl, installers, countyResult] = await Promise.all([
        fetchRoofMapDataUrl(project),
        fetchInstallersForProject(project).catch(() => []),
        ensureCountyForProject(project),
      ]);

      const projectForPdf: Project = {
        ...project,
        county: countyResult.county,
        county_links: countyResult.countyLinks,
      };

      setExportStatus("Building PDF…");
      await exportProjectPdf({
        project: projectForPdf,
        result,
        toggles,
        candidate,
        chartDataUrl,
        roofMapDataUrl,
        installers,
        countyName: countyResult.county,
        countyLinks: countyResult.countyLinks,
        countyLookupError: countyResult.error ?? null,
      });

      track("pdf_export_completed", {
        project_id: project.id,
        installer_count: installers.length,
        has_roof_map: Boolean(roofMapDataUrl),
        has_county: Boolean(countyResult.county),
      });

      if (countyResult.countyLinks && !project.county_links) {
        router.refresh();
      }
    } catch (err) {
      track("pdf_export_failed", {
        project_id: project.id,
        error: err instanceof Error ? err.message : "Could not export PDF",
      });
      trackException(err, { context: "pdf_export", project_id: project.id });
      setExportError(
        err instanceof Error ? err.message : "Could not export PDF",
      );
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  }


  function persistUsage(next: {
    monthly_bill_usd?: number;
    monthly_usage_kwh?: number;
    rate_usd_per_kwh?: number;
    energy_inflation_pct?: number;
  }) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      startTransition(async () => {
        const supabase = createClient();
        await supabase.from("projects").update(next).eq("id", project.id);
        track("roi_inputs_updated", {
          project_id: project.id,
          fields: Object.keys(next).join(","),
        });
        router.refresh();
      });
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  function updateToggle(key: keyof typeof toggles) {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    track("roi_toggle_changed", {
      project_id: project.id,
      toggle: key,
      enabled: next[key],
    });
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("projects").update(next).eq("id", project.id);
      router.refresh();
    });
  }

  function onBillChange(raw: string) {
    setBillInput(raw);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const nextBill = roundMoney(parsed);
    const nextKwh = roundKwh(nextBill / rate);
    setBillUsd(nextBill);
    setUsageKwh(nextKwh);
    setKwhInput(String(nextKwh));
    persistUsage({
      monthly_bill_usd: nextBill,
      monthly_usage_kwh: nextKwh,
      rate_usd_per_kwh: rate,
    });
  }

  function onKwhChange(raw: string) {
    setKwhInput(raw);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const nextKwh = roundKwh(parsed);
    const nextBill = roundMoney(nextKwh * rate);
    setUsageKwh(nextKwh);
    setBillUsd(nextBill);
    setBillInput(String(nextBill));
    persistUsage({
      monthly_bill_usd: nextBill,
      monthly_usage_kwh: nextKwh,
      rate_usd_per_kwh: rate,
    });
  }

  function onRateChange(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRate(DEFAULT_RATE_USD_PER_KWH);
      return;
    }
    const nextRate = Math.round(parsed * 1000) / 1000;
    setRate(nextRate);
    // Keep kWh usage fixed; rebills $ from usage when rate changes
    const nextBill = roundMoney(usageKwh * nextRate);
    setBillUsd(nextBill);
    setBillInput(String(nextBill));
    persistUsage({
      monthly_bill_usd: nextBill,
      monthly_usage_kwh: usageKwh,
      rate_usd_per_kwh: nextRate,
    });
  }

  function onInflationChange(raw: string) {
    setInflationInput(raw);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const next = Math.round(parsed * 100) / 100;
    setInflationPct(next);
    persistUsage({ energy_inflation_pct: next });
  }

  const chartData = {
    labels: result.series.map((p) => (p.year === 0 ? "Start" : `Yr ${p.year}`)),
    datasets: [
      {
        label: "Utility only (do nothing)",
        data: result.series.map((p) => p.cumulativeUtilitySpend),
        borderColor: "#B4533A",
        backgroundColor: "rgba(180, 83, 58, 0.06)",
        borderDash: [6, 4],
        fill: false,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: "Solar path (install + bills)",
        data: result.series.map((p) => p.cumulativeSolarPathSpend),
        borderColor: "#3F6B4F",
        backgroundColor: "rgba(63, 107, 79, 0.12)",
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2.5,
      },
    ],
  };

  const usingHeuristic =
    project.monthly_bill_usd == null && project.monthly_usage_kwh == null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            ROI model
          </p>
          <h1 className="font-display mt-1 text-4xl text-ink">{project.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {project.address}, {project.city} {project.state} {project.zip}
            {result.solarDriven && result.panelsCount != null ? (
              <span className="ml-2 text-canopy">
                · Roof Designer: {result.panelsCount} ×{" "}
                {result.panelCapacityWatts ?? "—"} W = {result.systemKw} kW
                {result.yearlyEnergyDcKwh
                  ? ` · ${result.yearlyEnergyDcKwh.toLocaleString()} kWh/yr DC`
                  : ""}
              </span>
            ) : (
              <span className="ml-2">
                · Using fallback {result.systemKw} kW — open Roof Designer and pick
                a panel configuration to drive ROI
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportPdf}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.download className="h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          {exportError ? (
            <p className="max-w-xs text-right text-xs text-danger">{exportError}</p>
          ) : null}
          <ShareReportButton project={project} />
        </div>
      </div>

      {exporting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="export-pdf-title"
          aria-describedby="export-pdf-status"
        >
          <div className="w-full max-w-sm rounded-2xl border border-stone-2 bg-surface p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <Icons.spinner className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-canopy" />
              <div>
                <p id="export-pdf-title" className="font-medium text-ink">
                  Building your PDF report
                </p>
                <p id="export-pdf-status" className="mt-1 text-sm text-ink-muted">
                  {exportStatus ?? "Working…"}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  Gathering roof map, installers, and county permitting — usually a
                  few seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["solar", "Solar"],
            ["battery", "Battery"],
            ["hvac", "HVAC"],
            ["water", "Water heater"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => updateToggle(key)}
            disabled={pending}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
              toggles[key]
                ? "bg-canopy text-white"
                : "border border-stone-2 bg-surface text-ink-muted hover:bg-stone"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-ink-muted">
              Current utility bill
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Edit dollars or kWh — they stay linked by your blended rate.
              {usingHeuristic && billUsd === BASE_ELEC
                ? ` Starting from the $${BASE_ELEC} heuristic until you change it.`
                : null}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">Monthly bill ($)</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                $
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="decimal"
                className="w-full rounded-lg border border-stone-line bg-white py-2.5 pl-7 pr-3 text-sm text-ink"
                value={billInput}
                onChange={(e) => onBillChange(e.target.value)}
              />
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">Monthly usage (kWh)</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              className="w-full rounded-lg border border-stone-line bg-white px-3 py-2.5 text-sm text-ink"
              value={kwhInput}
              onChange={(e) => onKwhChange(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">Blended rate ($/kWh)</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                $
              </span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                inputMode="decimal"
                className="w-full rounded-lg border border-stone-line bg-white py-2.5 pl-7 pr-3 text-sm text-ink"
                value={rate}
                onChange={(e) => onRateChange(e.target.value)}
              />
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">
              Energy inflation (%/yr)
            </span>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                inputMode="decimal"
                className="w-full rounded-lg border border-stone-line bg-white py-2.5 pl-3 pr-8 text-sm text-ink"
                value={inflationInput}
                onChange={(e) => onInflationChange(e.target.value)}
                onBlur={() => {
                  if (inflationInput.trim() === "") {
                    setInflationInput(String(DEFAULT_ENERGY_INFLATION_PCT));
                    setInflationPct(DEFAULT_ENERGY_INFLATION_PCT);
                    persistUsage({
                      energy_inflation_pct: DEFAULT_ENERGY_INFLATION_PCT,
                    });
                  }
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                %
              </span>
            </div>
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Model baseline: {formatMoney(result.monthlyBillBefore)} / mo ·{" "}
          {result.monthlyUsageKwhBefore.toLocaleString()} kWh
          {toggles.hvac || toggles.water
            ? " (includes HVAC/water heater load adders)"
            : null}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="System size"
          value={
            result.panelsCount != null
              ? `${result.systemKw} kW`
              : `${result.systemKw} kW`
          }
          hint={
            result.panelsCount != null
              ? `${result.panelsCount} panels × ${result.panelCapacityWatts} W`
              : "Load Roof Designer panel config"
          }
        />
        <Stat label="Net system cost" value={formatMoney(result.netCost)} hint="After 30% ITC (×0.7)" />
        <Stat
          label="New monthly bill"
          value={formatMoney(result.monthlyBillAfter)}
          hint={`From ${formatMoney(result.monthlyBillBefore)} · ${(result.offset * 100).toFixed(0)}% offset`}
        />
        <Stat
          label="Break-even"
          value={result.breakEvenYear != null ? `Year ${result.breakEvenYear}` : "—"}
          hint="Includes $8,500 battery at year 12"
        />
        <Stat
          label="25-yr net savings"
          value={formatMoney(result.netSavings25)}
          hint={`${result.systemKw} kW · ${result.energyInflationPct}% inflation`}
        />
      </div>

      <div className="rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-ink-muted">
              25-year cumulative spend
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Lower curve wins. Gap at year 25 ≈ lifetime savings vs staying on the
              grid.
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink">
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 border-t-2 border-dashed"
                style={{ borderColor: "#B4533A" }}
                aria-hidden
              />
              <span>
                <span className="font-medium">Utility only</span>
                <span className="text-ink-muted"> — pay the bill forever</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 rounded-full bg-canopy"
                aria-hidden
              />
              <span>
                <span className="font-medium">Solar path</span>
                <span className="text-ink-muted">
                  {" "}
                  — net install + lower bills
                  {toggles.battery ? " + Yr 12 battery" : ""}
                </span>
              </span>
            </li>
          </ul>
        </div>
        <div className="h-72">
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  align: "start",
                  labels: {
                    boxWidth: 14,
                    boxHeight: 3,
                    padding: 16,
                    color: "#1C2421",
                    font: { size: 12, family: "Instrument Sans, sans-serif" },
                    usePointStyle: false,
                  },
                },
                tooltip: {
                  callbacks: {
                    title: (items) => {
                      const label = items[0]?.label ?? "";
                      return label === "Start" ? "Start (year 0)" : label;
                    },
                    label: (ctx) =>
                      `${ctx.dataset.label}: ${formatMoney(Number(ctx.raw))}`,
                    footer: (items) => {
                      if (items.length < 2) return "";
                      const util = Number(items[0]?.raw ?? 0);
                      const solar = Number(items[1]?.raw ?? 0);
                      const gap = util - solar;
                      if (gap >= 0) {
                        return `Solar ahead by ${formatMoney(gap)}`;
                      }
                      return `Solar behind by ${formatMoney(Math.abs(gap))}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  ticks: { maxTicksLimit: 14, color: "#5a665f" },
                  grid: { color: "rgba(28,36,33,0.05)" },
                  title: {
                    display: true,
                    text: "Year",
                    color: "#5a665f",
                    font: { size: 11 },
                  },
                },
                y: {
                  ticks: {
                    color: "#5a665f",
                    callback: (v) => `$${Number(v) / 1000}k`,
                  },
                  grid: { color: "rgba(28,36,33,0.06)" },
                  title: {
                    display: true,
                    text: "Cumulative spend ($)",
                    color: "#5a665f",
                    font: { size: 11 },
                  },
                },
              },
            }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Dashed line = staying on utility rates ({result.energyInflationPct}%
          inflation). Solid line =
          net system cost at start
          {toggles.battery
            ? ", lower bills, and an $8,500 battery replacement at year 12"
            : " plus ongoing solar-path bills"}
          .
          {result.breakEvenYear != null
            ? ` Curves cross around year ${result.breakEvenYear}.`
            : null}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}
