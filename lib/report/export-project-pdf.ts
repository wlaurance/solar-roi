import type { jsPDF } from "jspdf";
import type { RoiResult } from "@/lib/roi/calculate";
import type { SolarCandidateAssessment } from "@/lib/solar/candidate";
import type { Project } from "@/lib/types";

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
    .slice(0, 48);
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

export async function exportProjectPdf(input: ProjectPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const { project, result, toggles, candidate, chartDataUrl } = input;
  const address = `${project.address}, ${project.city}, ${project.state} ${project.zip}`;

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
  kv(
    doc,
    "Bill offset",
    `${(result.offset * 100).toFixed(0)}%`,
    140,
    y,
  );
  y += 18;

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
    y += lines.length * 4.5 + 6;
    doc.setTextColor(...INK);
  }

  // —— Page 2: Chart + cash path ——
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
    const pageW = doc.internal.pageSize.getWidth();
    const imgW = pageW - 28;
    const imgH = 90;
    try {
      doc.addImage(chartDataUrl, "PNG", 14, y, imgW, imgH);
      y += imgH + 10;
    } catch {
      doc.text("Chart image could not be embedded.", 14, y);
      y += 8;
    }
  } else {
    doc.text("Chart unavailable — open the ROI dashboard and try again.", 14, y);
    y += 8;
  }

  y = sectionTitle(doc, "Cash path endpoints (year 25)", y);
  const last = result.series[result.series.length - 1];
  kv(doc, "Utility only spend", money(last.cumulativeUtilitySpend), 14, y);
  kv(doc, "Solar path spend", money(last.cumulativeSolarPathSpend), 90, y);
  y += 16;

  // —— Page 3: Roof / Solar API ——
  doc.addPage();
  drawHeader(doc, "Roof & Google Solar");
  y = 40;
  const pot = project.solar_insights?.solarPotential;
  y = sectionTitle(doc, "Building insights", y);

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

  // —— Page 4+: AI county permitting content ——
  doc.addPage();
  drawHeader(doc, "Permitting checklist");
  y = 40;

  if (project.county || project.county_links) {
    y = sectionTitle(doc, "County resources", y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(
      project.county ?? project.county_links?.countyName ?? "County",
      14,
      y,
    );
    y += 6;
    if (project.county_links?.summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const summaryLines = doc.splitTextToSize(project.county_links.summary, 180);
      doc.text(summaryLines, 14, y);
      y += summaryLines.length * 4 + 4;
    }

    const steps = project.county_links?.steps ?? [];
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

    for (const link of project.county_links?.links ?? []) {
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
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(
      "No county permitting content saved yet. Open County Permits to generate it.",
      14,
      y,
    );
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  const filename = `solarflow-${slugify(project.name) || "project"}-report.pdf`;
  doc.save(filename);
}
