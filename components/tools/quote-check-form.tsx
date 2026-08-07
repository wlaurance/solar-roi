"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Icons } from "@/components/icons";
import { decodeSolarQuote, type QuoteDecodeResult } from "@/lib/quotes/decode";
import { track } from "@/lib/analytics";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function verdictClass(verdict: QuoteDecodeResult["verdict"]) {
  switch (verdict) {
    case "below_market":
      return "text-canopy";
    case "in_range":
      return "text-ink";
    case "above_market":
      return "text-brass";
    case "high":
      return "text-danger";
    default:
      return "text-ink";
  }
}

export function QuoteCheckForm() {
  const [systemKw, setSystemKw] = useState("8.2");
  const [grossPrice, setGrossPrice] = useState("25420");
  const [includesBattery, setIncludesBattery] = useState(false);
  const [batteryPrice, setBatteryPrice] = useState("");
  const [result, setResult] = useState<QuoteDecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const kw = Number(systemKw);
    const price = Number(grossPrice.replace(/[$,]/g, ""));
    const bat =
      batteryPrice.trim() === ""
        ? null
        : Number(batteryPrice.replace(/[$,]/g, ""));

    if (!Number.isFinite(kw) || kw <= 0) {
      setError("Enter a system size in kW (e.g. 8.2).");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter the gross installed price before incentives.");
      return;
    }
    if (bat != null && (!Number.isFinite(bat) || bat < 0)) {
      setError("Battery price must be a number.");
      return;
    }

    setError(null);
    const decoded = decodeSolarQuote({
      systemKw: kw,
      grossPriceUsd: price,
      includesBattery,
      batteryPriceUsd: bat,
    });
    setResult(decoded);
    track("quote_check_ran", {
      verdict: decoded.verdict,
      includes_battery: includesBattery,
      dollars_per_watt: Math.round(decoded.dollarsPerWatt * 100) / 100,
    });
  }

  return (
    <div className="mt-10">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl bg-canopy px-6 py-8 text-white sm:px-8"
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brass-soft">
          Market check
        </p>
        <h2 className="font-display text-3xl tracking-tight">
          Decode a solar quote
        </h2>
        <p className="text-sm text-white/85">
          Enter figures from the proposal (cash price). Federal residential 25D
          is modeled at 0% for 2026 homeowner purchases.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
              System size (kW)
            </span>
            <input
              className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
              value={systemKw}
              onChange={(e) => setSystemKw(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
              Gross cash price
            </span>
            <input
              className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
              value={grossPrice}
              onChange={(e) => setGrossPrice(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includesBattery}
            onChange={(e) => setIncludesBattery(e.target.checked)}
            className="h-4 w-4 rounded border-white/40"
          />
          Quote includes a battery
        </label>

        {includesBattery ? (
          <label className="block max-w-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/70">
              Battery price (if broken out)
            </span>
            <input
              className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-ink"
              value={batteryPrice}
              onChange={(e) => setBatteryPrice(e.target.value)}
              placeholder="Optional"
              inputMode="decimal"
            />
          </label>
        ) : null}

        {error ? (
          <p className="rounded-md bg-white/15 px-3 py-2 text-sm">{error}</p>
        ) : null}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brass px-4 py-3 text-sm font-semibold text-ink transition hover:bg-brass-soft"
        >
          <Icons.chart className="h-4 w-4" />
          Check this quote
        </button>
      </form>

      {result ? (
        <div className="mt-8 space-y-4 border-t border-stone-2 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
            Result
          </p>
          <p className={`font-display text-3xl ${verdictClass(result.verdict)}`}>
            {result.verdictLabel}
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Quote $/W
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                ${result.dollarsPerWatt.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Solar-only $/W
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                ${result.solarOnlyDollarsPerWatt.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Planning benchmark
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                ${result.benchmarkDollarsPerWatt.toFixed(2)}/W
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                vs benchmark
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                {result.deltaVsBenchmarkPct >= 0 ? "+" : ""}
                {(result.deltaVsBenchmarkPct * 100).toFixed(0)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Planning PV cost
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                {money(result.benchmarkGrossSolarUsd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Rough net (2026 model)*
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                {money(result.estimatedNetAfterItcUsd)}
              </dd>
            </div>
          </dl>
          <ul className="space-y-2 text-sm text-ink-muted">
            {result.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-canopy">✓</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-muted">
            *2026 planning model applies 0% federal residential 25D ITC — not tax
            advice. Next: model your roof so size and production match the quote.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              <Icons.sun className="h-4 w-4" />
              Model my address
            </Link>
            <Link href="/solar-for" className="btn-secondary">
              Utility bill guides
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
