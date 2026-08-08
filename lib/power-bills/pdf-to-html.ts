import { extractText, extractTextItems, getDocumentProxy } from "unpdf";
import type { StructuredTextItem } from "unpdf";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function looksLikeHeading(item: StructuredTextItem, medianFont: number): boolean {
  const text = item.str.trim();
  if (!text) return false;
  if (item.fontSize >= medianFont * 1.25) return true;
  if (text === text.toUpperCase() && text.length >= 4 && /[A-Z]/.test(text)) {
    return true;
  }
  return false;
}

function median(nums: number[]): number {
  if (!nums.length) return 10;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

type Line = {
  y: number;
  fontSize: number;
  text: string;
};

function groupItemsIntoLines(items: StructuredTextItem[]): Line[] {
  const usable = items.filter((i) => i.str.trim().length > 0);
  if (!usable.length) return [];

  // PDF y grows upward; sort top-to-bottom then left-to-right.
  const sorted = [...usable].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.x - b.x;
  });

  const lines: Line[] = [];
  let current: StructuredTextItem[] = [];
  let currentY = sorted[0]!.y;

  const flush = () => {
    if (!current.length) return;
    const text = current
      .map((i, idx) => {
        const prev = current[idx - 1];
        if (!prev) return i.str;
        const gap = i.x - (prev.x + prev.width);
        return gap > Math.max(prev.fontSize * 0.35, 2) ? ` ${i.str}` : i.str;
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      current = [];
      return;
    }
    const fontSize = median(current.map((i) => i.fontSize || 10));
    lines.push({ y: currentY, fontSize, text });
    current = [];
  };

  for (const item of sorted) {
    if (current.length && Math.abs(item.y - currentY) > 3) {
      flush();
      currentY = item.y;
    }
    if (!current.length) currentY = item.y;
    current.push(item);
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

/**
 * Convert a utility-bill PDF into a layout-aware HTML document for LLM + regex prep.
 * Prefers structured text items (x/y/font) so tables and labels survive better than
 * flattened plain text.
 */
export async function pdfBytesToHtml(bytes: ArrayBuffer | Uint8Array): Promise<{
  html: string;
  pageCount: number;
  plainText: string;
}> {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const pdf = await getDocumentProxy(data);

  let pageItems: StructuredTextItem[][] = [];
  try {
    const structured = await extractTextItems(pdf);
    pageItems = structured.items;
  } catch {
    const fallback = await extractText(pdf, { mergePages: false });
    pageItems = (fallback.text as string[]).map((pageText) =>
      pageText.split(/\n+/).map((line, idx) => ({
        str: line,
        x: 0,
        y: 1000 - idx * 12,
        width: line.length * 6,
        height: 10,
        fontSize: 10,
        fontFamily: "unknown",
        dir: "ltr",
        hasEOL: true,
      })),
    );
  }

  const allFontSizes = pageItems
    .flat()
    .map((i) => i.fontSize)
    .filter((n) => Number.isFinite(n) && n > 0);
  const medianFont = median(allFontSizes);

  const pageHtml: string[] = [];
  const plainParts: string[] = [];

  pageItems.forEach((items, pageIndex) => {
    const lines = groupItemsIntoLines(items);
    const body: string[] = [];
    for (const line of lines) {
      plainParts.push(line.text);
      const safe = escapeHtml(line.text);
      const headingProbe: StructuredTextItem = {
        str: line.text,
        x: 0,
        y: line.y,
        width: line.text.length * 6,
        height: line.fontSize,
        fontSize: line.fontSize,
        fontFamily: "unknown",
        dir: "ltr",
        hasEOL: true,
      };
      if (looksLikeHeading(headingProbe, medianFont)) {
        body.push(`<h3 class="bill-heading">${safe}</h3>`);
      } else if (/[:|]\s*\S/.test(line.text) || /\s{2,}/.test(line.text)) {
        body.push(`<div class="bill-row">${safe}</div>`);
      } else {
        body.push(`<p class="bill-line">${safe}</p>`);
      }
    }
    pageHtml.push(
      `<section class="bill-page" data-page="${pageIndex + 1}">\n${body.join("\n")}\n</section>`,
    );
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Utility bill extract</title>
</head>
<body>
<article class="utility-bill" data-pages="${pageItems.length}">
${pageHtml.join("\n")}
</article>
</body>
</html>`;

  return {
    html,
    pageCount: pageItems.length || pdf.numPages,
    plainText: plainParts.join("\n"),
  };
}
