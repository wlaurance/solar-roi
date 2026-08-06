import type { jsPDF } from "jspdf";
import type { InstallerPlace } from "@/lib/google/places";
import type { RoiResult } from "@/lib/roi/calculate";
import type { SolarCandidateAssessment } from "@/lib/solar/candidate";
import type { CountyLinksPayload, Project } from "@/lib/types";

const INK: [number, number, number] = [28, 36, 33];
const MUTED: [number, number, number] = [90, 102, 95];
const CANOPY: [number, number, number] = [63, 107, 79];
const BRASS: [number, number, number] = [196, 160, 53];

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function shortProjectKey(id: string) {
  return id.replace(/-/g, "").slice(0, 8);
}

function reportFilename(project: Project): string {
  const name = slugify(project.name) || "project";
  const key = shortProjectKey(project.id);
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `solarflow-${name}-${key}-${date}.pdf`;
}

export type ProjectPdfInput = {
  project: Project;
  result: RoiResult;
  toggles: {
    solar: boolean;
    battery: boolean;
    hvac: boolean;
    water: boolean;
  };
  candidate: SolarCandidateAssessment | null;
  chartDataUrl: string | null;
  roofMapDataUrl: string | null;
  installers: InstallerPlace[];
  countyName: string | null;
  countyLinks: CountyLinksPayload | null;
  countyLookupError?: string | null;
};

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(...CANOPY);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SolarFlow", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 14, 20);
  doc.setTextColor(...INK);
}

function drawFooter(doc: jsPDF, page: number, total: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US")} · Page ${page} of ${total}`,
    14,
    h - 10,
  );
  doc.text("For planning only — not an engineering or financial offer.", w - 14, h - 10, {
    align: "right",
  });
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...CANOPY);
  doc.text(title, 14, y);
  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, 80, y + 2);
  doc.setTextColor(...INK);
  return y + 10;
}

function kv(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(value, x, y + 5);
}

function addImageSafe(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  try {
    const format = dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(dataUrl, format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

export async function exportProjectPdf(input: ProjectPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const {
    project,
    result,
    toggles,
    candidate,
    chartDataUrl,
    roofMapDataUrl,
    installers,
    countyName,
    countyLinks,
    countyLookupError,
  } = input;
  const address = `${project.address}, ${project.city}, ${project.state} ${project.zip}`;
  const pageW = doc.internal.pageSize.getWidth();

  // —— Page 1: Overview ——
  drawHeader(doc, "Project report");
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(project.name, 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(address, 14, y);
  y += 14;

  y = sectionTitle(doc, "Configuration", y);
  const opts = [
    toggles.solar ? "Solar" : null,
    toggles.battery ? "Battery" : null,
    toggles.hvac ? "Heat pump HVAC" : null,
    toggles.water ? "Heat pump water" : null,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(opts.length ? opts.join(" · ") : "No system options enabled", 14, y);
  y += 10;

  y = sectionTitle(doc, "Current utility baseline", y);
  kv(doc, "Monthly bill", money(result.monthlyBillBefore), 14, y);
  kv(doc, "Monthly usage", `${result.monthlyUsageKwhBefore.toLocaleString()} kWh`, 70, y);
  kv(doc, "Blended rate", `$${result.rateUsdPerKwh.toFixed(2)}/kWh`, 140, y);
  y += 18;

  y = sectionTitle(doc, "ROI snapshot", y);
  kv(doc, "System size", `${result.systemKw} kW`, 14, y);
  kv(doc, "Net cost (after ITC)", money(result.netCost), 70, y);
  kv(
    doc,
    "Break-even",
    result.breakEvenYear != null ? `Year ${result.breakEvenYear}` : "N/A",
    140,
    y,
  );
  y += 14;
  kv(doc, "New monthly bill", money(result.monthlyBillAfter), 14, y);
  kv(doc, "25-yr net savings", money(result.netSavings25), 70, y);
  kv(doc, "Bill offset", `${(result.offset * 100).toFixed(0)}%`, 140, y);
  y += 14;
  if (result.panelsCount != null) {
    kv(
      doc,
      "Panel layout",
      `${result.panelsCount} × ${result.panelCapacityWatts ?? "—"} W`,
      14,
      y,
    );
    y += 14;
  }

  if (candidate) {
    y = sectionTitle(doc, "Solar candidate (sunshine heuristic)", y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${candidate.candidateAnswer} (${candidate.label})`, 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(
      `${candidate.sunshineHoursPerYear.toLocaleString()} sunshine hours / year. ${candidate.summary}`,
      180,
    );
    doc.text(lines, 14, y);
    doc.setTextColor(...INK);
  }

  // —— Page 2: Chart ——
  doc.addPage();
  drawHeader(doc, "Financial outlook");
  y = 40;
  y = sectionTitle(doc, "25-year cumulative spend", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Dashed / utility-only vs solid solar path (install + bills" +
      (toggles.battery ? " + year-12 battery" : "") +
      ").",
    14,
    y,
  );
  y += 8;

  if (chartDataUrl) {
    if (!addImageSafe(doc, chartDataUrl, 14, y, pageW - 28, 90)) {
      doc.text("Chart image could not be embedded.", 14, y);
    }
    y += 100;
  } else {
    doc.text("Chart unavailable — open the ROI dashboard and try again.", 14, y);
    y += 8;
  }

  y = sectionTitle(doc, "Cash path endpoints (year 25)", y);
  const last = result.series[result.series.length - 1];
  kv(doc, "Utility only spend", money(last.cumulativeUtilitySpend), 14, y);
  kv(doc, "Solar path spend", money(last.cumulativeSolarPathSpend), 90, y);

  // —— Page 3: Roof satellite map ——
  doc.addPage();
  drawHeader(doc, "Roof & Google Solar");
  y = 40;
  y = sectionTitle(doc, "Roof layout map", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Satellite view with Google Solar panel centers for the selected configuration.",
    14,
    y,
  );
  y += 6;

  if (roofMapDataUrl) {
    const imgW = pageW - 28;
    const imgH = 78;
    if (addImageSafe(doc, roofMapDataUrl, 14, y, imgW, imgH)) {
      y += imgH + 8;
    } else {
      doc.setTextColor(...MUTED);
      doc.text("Roof map image could not be embedded.", 14, y);
      y += 8;
    }
  } else {
    doc.setTextColor(...MUTED);
    doc.text(
      "Roof map unavailable. Confirm the project has coordinates and Solar insights.",
      14,
      y,
    );
    y += 8;
  }

  y = sectionTitle(doc, "Building insights", y);
  const pot = project.solar_insights?.solarPotential;
  if (!pot) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(
      "No Google Solar insights cached yet. Open Roof Designer and load insights first.",
      14,
      y,
    );
  } else {
    const cfg =
      pot.solarPanelConfigs?.[
        Math.max(
          0,
          Math.min(
            project.selected_panel_config_index,
            (pot.solarPanelConfigs?.length ?? 1) - 1,
          ),
        )
      ];
    kv(
      doc,
      "Max sunshine hrs/yr",
      pot.maxSunshineHoursPerYear != null
        ? String(Math.round(pot.maxSunshineHoursPerYear))
        : "—",
      14,
      y,
    );
    kv(
      doc,
      "Max array panels",
      pot.maxArrayPanelsCount != null ? String(pot.maxArrayPanelsCount) : "—",
      70,
      y,
    );
    kv(
      doc,
      "Module watts",
      pot.panelCapacityWatts != null ? `${pot.panelCapacityWatts} W` : "—",
      140,
      y,
    );
    y += 14;
    if (cfg) {
      kv(doc, "Selected config", `${cfg.panelsCount} panels`, 14, y);
      kv(
        doc,
        "Annual DC energy",
        `${Math.round(cfg.yearlyEnergyDcKwh).toLocaleString()} kWh`,
        70,
        y,
      );
      kv(
        doc,
        "Imagery quality",
        project.solar_insights?.imageryQuality ?? "—",
        140,
        y,
      );
      y += 14;
    }
    if (result.yearlyEnergyDcKwh != null) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(
        `ROI model uses ${result.yearlyEnergyDcKwh.toLocaleString()} kWh/yr DC from the selected Solar config (${result.systemKw} kW).`,
        14,
        y,
      );
    }
  }

  // —— Page 4+: County permitting ——
  doc.addPage();
  drawHeader(doc, "County permitting");
  y = 40;
  y = sectionTitle(doc, "County resources", y);

  if (countyName || countyLinks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(
      countyName ?? countyLinks?.countyName ?? "County",
      14,
      y,
    );
    y += 6;
    if (countyLinks?.summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const summaryLines = doc.splitTextToSize(countyLinks.summary, 180);
      doc.text(summaryLines, 14, y);
      y += summaryLines.length * 4 + 4;
    }

    const steps = countyLinks?.steps ?? [];
    if (steps.length) {
      y = sectionTitle(doc, "Permit checklist", y);
      for (const [idx, step] of steps.entries()) {
        const bodyLines = doc.splitTextToSize(step.body, 170);
        y = ensureSpace(doc, y, 10 + bodyLines.length * 4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...CANOPY);
        doc.text(`${idx + 1}. ${step.title}`, 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text(bodyLines, 18, y);
        y += bodyLines.length * 4 + 2;
        if (step.linkUrl) {
          doc.setTextColor(...CANOPY);
          doc.setFontSize(8);
          doc.textWithLink(step.linkLabel ?? step.linkUrl, 18, y, {
            url: step.linkUrl,
          });
          y += 5;
        }
        y += 3;
      }
    }

    if (countyLinks?.links?.length) {
      y = sectionTitle(doc, "Official links", y);
      for (const link of countyLinks.links) {
        y = ensureSpace(doc, y, 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...CANOPY);
        doc.textWithLink(link.title, 14, y, { url: link.url });
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        const desc = doc.splitTextToSize(link.description, 180);
        doc.text(desc, 14, y);
        y += desc.length * 3.5 + 4;
      }
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(
      countyLookupError
        ? `County lookup failed: ${countyLookupError}`
        : "County permitting content was not available for this export.",
      14,
      y,
    );
  }

  // —— Installers ——
  doc.addPage();
  drawHeader(doc, "Recommended installers");
  y = 40;
  y = sectionTitle(doc, "Local solar contractors", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Near ${address}`, 14, y);
  y += 8;

  if (!installers.length) {
    doc.setFontSize(10);
    doc.text("No installers found near this project address.", 14, y);
  } else {
    for (const [idx, place] of installers.slice(0, 12).entries()) {
      y = ensureSpace(doc, y, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(`${idx + 1}. ${place.name}`, 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const meta = [
        place.rating != null ? `${place.rating.toFixed(1)}★` : null,
        place.userRatingsTotal != null
          ? `${place.userRatingsTotal} reviews`
          : null,
        place.distanceMeters != null
          ? `${(place.distanceMeters / 1609.34).toFixed(1)} mi`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (meta) {
        doc.text(meta, 18, y);
        y += 4;
      }
      if (place.address) {
        doc.text(place.address, 18, y);
        y += 4;
      }
      if (place.phone) {
        doc.text(`Phone: ${place.phone}`, 18, y);
        y += 4;
      }
      if (place.website) {
        doc.setTextColor(...CANOPY);
        doc.setFontSize(8);
        doc.textWithLink(place.website, 18, y, { url: place.website });
        y += 4;
      }
      y += 4;
    }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  const filename = reportFilename(project);
  doc.save(filename);
}
