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
import { useMemo, useState, useTransition } from "react";
import { Line } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import {
  calculateRoi,
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

export function RoiDashboard({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toggles, setToggles] = useState({
    solar: project.solar,
    battery: project.battery,
    hvac: project.hvac,
    water: project.water,
  });

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
      }),
    [toggles, project.system_kw_base, solarDrive],
  );

  function updateToggle(key: keyof typeof toggles) {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("projects").update(next).eq("id", project.id);
      router.refresh();
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
