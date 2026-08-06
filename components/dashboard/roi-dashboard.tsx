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
} from "chart.js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Line } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import {
  BASE_ELEC,
  DEFAULT_RATE_USD_PER_KWH,
  calculateRoi,
  resolveBaselineMonthlyBill,
  resolveBaselineMonthlyUsageKwh,
  resolveRate,
  solarDriveFromInsights,
} from "@/lib/roi/calculate";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

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
  const [billInput, setBillInput] = useState(String(roundMoney(initialBill)));
  const [kwhInput, setKwhInput] = useState(String(roundKwh(initialKwh)));
  const [billUsd, setBillUsd] = useState(roundMoney(initialBill));
  const [usageKwh, setUsageKwh] = useState(roundKwh(initialKwh));
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }),
    [toggles, project.system_kw_base, solarDrive, billUsd, usageKwh, rate],
  );

  function persistUsage(next: {
    monthly_bill_usd: number;
    monthly_usage_kwh: number;
    rate_usd_per_kwh: number;
  }) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      startTransition(async () => {
        const supabase = createClient();
        await supabase.from("projects").update(next).eq("id", project.id);
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

  const chartData = {
    labels: result.series.map((p) => `Y${p.year}`),
    datasets: [
      {
        label: "Cumulative savings",
        data: result.series.map((p) => p.cumulativeSavings),
        borderColor: "#3F6B4F",
        backgroundColor: "rgba(63, 107, 79, 0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const usingHeuristic =
    project.monthly_bill_usd == null && project.monthly_usage_kwh == null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
          ROI model
        </p>
        <h1 className="font-display mt-1 text-4xl text-ink">{project.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {project.address}, {project.city} {project.state} {project.zip}
          {solarDrive ? (
            <span className="ml-2 text-canopy">
              · Driven by Google Solar ({result.systemKw} kW
              {result.yearlyEnergyDcKwh
                ? `, ${result.yearlyEnergyDcKwh.toLocaleString()} kWh/yr DC`
                : ""}
              )
            </span>
          ) : (
            <span className="ml-2">
              · Heuristic system size (open Roof Designer to load Solar insights)
            </span>
          )}
        </p>
      </div>

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
        <div className="grid gap-3 sm:grid-cols-3">
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
          hint={`${result.systemKw} kW · 8% inflation`}
        />
      </div>

      <div className="rounded-2xl border border-stone-2/80 bg-surface/90 p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.08em] text-ink-muted">
          Cumulative cash flow
        </h2>
        <div className="h-72">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => formatMoney(Number(ctx.raw)),
                  },
                },
              },
              scales: {
                x: {
                  ticks: { maxTicksLimit: 13, color: "#5a665f" },
                  grid: { color: "rgba(28,36,33,0.05)" },
                },
                y: {
                  ticks: {
                    color: "#5a665f",
                    callback: (v) => `$${Number(v) / 1000}k`,
                  },
                  grid: { color: "rgba(28,36,33,0.06)" },
                },
              },
            }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Year 12 marks the battery replacement cash event when battery is enabled.
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
